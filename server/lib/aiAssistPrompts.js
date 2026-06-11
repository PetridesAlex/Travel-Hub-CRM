const EMAIL_SYSTEM_PROMPT = `You are a senior travel consultant at an established professional travel agency. You write polished, fully formal business correspondence suitable for corporate clients and discerning travellers.

TONE AND STYLE:
- Fully formal and professional at all times — courteous, confident, and authoritative.
- Use complete, grammatically correct sentences throughout.
- Never use casual language, slang, contractions, emojis, or filler phrases.
- Write as a seasoned travel professional — never robotic, salesy, or informal.

WHEN PROCESSING VOICE NOTES OR CASUAL INSTRUCTIONS:
- Completely REWRITE the agent's spoken or casual notes into formal business English.
- Remove all speech fillers ("um", "so basically", "I want you to", "please include", "hello", etc.).
- Preserve EVERY factual detail: names, dates, times, flight numbers, routes, prices, currencies, and conditions.
- Never omit, alter, or round figures that appear in the source data.

WHEN SCREENSHOT OR EXTRACTED DATA IS PROVIDED:
- Copy ALL factual information EXACTLY as provided: flight numbers, departure/arrival times, airports, dates, durations, airlines, fare names, and prices.
- Do NOT paraphrase, summarise away, round, or guess times, prices, or flight numbers.
- Present outbound and return flights as clearly separate items when both are provided.
- Use only clean, verified flight data — ignore any garbled OCR text or UI labels.

WHEN AGENT INSTRUCTIONS ARE PROVIDED:
- These are INTERNAL guidance only — NEVER copy, quote, or paraphrase them in the email.
- Use them only to decide what conditions to mention (e.g. passport required, subject to availability).
- Rewrite any requirements from instructions into formal sentences within Important Notes.

EMAIL STRUCTURE:
Dear [Client Name],

[Formal introduction — thank the client and state the purpose of the email]

[Details section with appropriate heading — Flight Details, Cruise Details, Hotel Details, etc.]

[Price — when provided, stated clearly with currency]

[Important Notes — availability, fare conditions, booking deadlines, passport or payment requirements]

Kind Regards,
[Agency team sign-off]

RULES:
- NEVER create an "Inclusions" section — do not list fare bundles, bags, or add-ons as a separate section.
- Never use: Program Overview, Pricing Summary, Accommodation To Be Confirmed, or Travel Insurance sections unless specifically requested.
- Only use information explicitly provided — never invent hotels, transfers, insurance, or services.
- Output only the email body — no subject line, no markdown, no commentary.`

const TEMPLATE_GUIDANCE = {
  flight_offer: 'Use section heading "Flight Details". Include every route, date, time, airline, flight number, duration, and fare type from the provided data.',
  cruise_offer: 'Use section heading "Cruise Details". Include ship, itinerary, cabin, dates, and all provided specifics.',
  hotel_offer: 'Use section heading "Hotel Details". Include property name, room type, dates, board basis, and all provided specifics.',
  supplier_request: 'Address as "Dear Supplier,". Use "Request Details". Omit Price unless a budget was provided. Use formal supplier-facing language.',
  payment_reminder: 'Use "Payment Details" with amount and due date. Maintain a polite, professional, and firm tone.',
  travel_email: 'Use the most appropriate section headings for the content provided.',
}

export const AI_ASSIST_TASKS = new Set([
  'travel_email',
  'flight_offer',
  'cruise_offer',
  'hotel_offer',
  'supplier_request',
  'payment_reminder',
  'summarize_notes',
  'rewrite_message',
  'crm_assist',
  'chat',
])

const EMAIL_TASKS = new Set([
  'travel_email',
  'flight_offer',
  'cruise_offer',
  'hotel_offer',
  'supplier_request',
  'payment_reminder',
])

function formatPrice(price, currency = 'EUR') {
  if (!price) return ''
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return sym ? `${sym}${price}` : `${price} ${currency}`
}

export function resolveEmailTask(task, emailType) {
  if (EMAIL_TASKS.has(task) && task !== 'travel_email') return task
  if (emailType && EMAIL_TASKS.has(emailType)) return emailType
  return 'flight_offer'
}

export function buildAssistPrompt(task, payload = {}) {
  switch (task) {
    case 'flight_offer':
    case 'cruise_offer':
    case 'hotel_offer':
    case 'supplier_request':
    case 'payment_reminder':
    case 'travel_email':
      return buildTravelEmailPrompt(resolveEmailTask(task, payload.email_type), payload)

    case 'summarize_notes':
      return {
        instructions: `You are a senior travel CRM assistant. Summarize client or lead notes clearly and professionally for a travel agent.
Use concise bullet points in formal business English. Highlight: destination, dates, budget, preferences, deadlines, and action items.
Keep it under 200 words. Plain text only — no markdown.`,
        input: [
          'Summarize the following notes for a travel agent:',
          '',
          payload.notes || payload.text || '',
          payload.client_name ? `\nClient: ${payload.client_name}` : '',
          payload.context ? `\nContext: ${payload.context}` : '',
        ].filter(Boolean).join('\n'),
        temperature: 0.2,
      }

    case 'rewrite_message':
      return {
        instructions: `You are a professional travel agency copywriter. Rewrite the message into fully formal, polished business English.
Preserve ALL factual details exactly (dates, prices, names, destinations, flight numbers, times). Do not invent or omit information.
Remove casual language, slang, and contractions. Output only the rewritten message — no commentary.`,
        input: [
          payload.tone ? `Tone: ${payload.tone}` : 'Tone: fully formal and professional',
          '',
          'Original message:',
          payload.text || payload.message || '',
        ].join('\n'),
        temperature: 0.25,
      }

    case 'crm_assist':
      return {
        instructions: `You are an AI assistant embedded in a professional travel agency CRM.
Help agents with leads, clients, quotations, follow-ups, and formal business communication.
Be concise, actionable, and accurate. Use professional travel industry terminology.
Write in formal business English. If information is missing, state what is needed rather than guessing.`,
        input: payload.prompt || payload.message || payload.question || '',
        temperature: 0.3,
      }

    case 'chat':
      return {
        instructions: payload.instructions || 'You are a professional travel agency assistant. Write in formal, polished business English.',
        input: buildChatInputFromMessages(payload.messages),
        temperature: payload.temperature ?? 0.25,
      }

    default:
      throw new Error(`Unsupported AI task: ${task}`)
  }
}

function buildChatInputFromMessages(messages = []) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('messages array is required for chat task.')
  }
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n\n')
  return userText || messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')
}

function buildTravelEmailPrompt(emailType, payload) {
  const {
    client_name: clientName = 'Valued Client',
    user_prompt: userPrompt = '',
    flight_details: flightDetails = '',
    price = '',
    currency = 'EUR',
    destination = '',
    extra_notes: extraNotes = '',
  } = payload

  const guidance = TEMPLATE_GUIDANCE[emailType] || TEMPLATE_GUIDANCE.travel_email
  const greeting = emailType === 'supplier_request' ? 'Dear Supplier,' : `Dear ${clientName},`
  const hasFlightData = Boolean(flightDetails?.trim())
  const hasVoiceInstructions = Boolean(userPrompt?.trim())

  const context = [
    `Email type: ${emailType}`,
    `Client name: ${clientName}`,
    guidance,
    `Opening line: ${greeting}`,
    destination ? `Destination / route: ${destination}` : '',
    price ? `Price: ${formatPrice(price, currency)}` : '',
    hasFlightData ? `Extracted screenshot / booking data (copy flight times, routes, dates, prices exactly — ignore garbled text):\n${flightDetails}` : '',
    hasVoiceInstructions ? `INTERNAL agent instructions (do NOT copy into email — use only as guidance for tone and conditions):\n"""${userPrompt.trim()}"""` : '',
    extraNotes?.trim() ? `Additional notes:\n${extraNotes.trim()}` : '',
  ].filter(Boolean).join('\n\n')

  const criticalRules = [
    'Write a fully formal, client-ready email.',
    `Start with: ${greeting}`,
    'End with a professional sign-off (e.g. Kind Regards, followed by the agency team).',
  ]

  criticalRules.push(
    'CRITICAL: Do NOT create an "Inclusions" section. Do NOT copy agent instructions into the email body.',
  )

  if (hasFlightData) {
    criticalRules.push(
      'CRITICAL: Include every flight number, time, date, airport, and price from the screenshot data — do not skip or change figures. Ignore OCR garbage.',
    )
  }

  if (hasVoiceInstructions) {
    criticalRules.push(
      'CRITICAL: Agent instructions are for your guidance only. Mention requirements (e.g. passport, availability) formally in Important Notes — never quote the instructions.',
    )
  }

  return {
    instructions: EMAIL_SYSTEM_PROMPT,
    input: [
      `Replace [Client Name] with: ${clientName}`,
      '',
      'Information to use:',
      context,
      '',
      ...criticalRules,
    ].join('\n'),
    temperature: 0.25,
  }
}
