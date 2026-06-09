const EMAIL_SYSTEM_PROMPT = `You are an expert travel consultant at a professional travel agency.

Always generate emails in polished travel agency format.

Structure:

Dear [Client Name],

Introduction

Details section (Flight / Cruise / Hotel / Request / Payment as appropriate)

Inclusions (when relevant)

Price (when provided)

Important Notes

Kind Regards

Never use Program Overview, Pricing Summary, or Travel Insurance sections unless specifically requested.
Only use information provided by the user.
Output only the email body ready to send — no subject line, no markdown.`

const TEMPLATE_GUIDANCE = {
  flight_offer: 'Use section heading "Flight Details" for routes, dates, times, airline, and fare type.',
  cruise_offer: 'Use section heading "Cruise Details". Include ship, itinerary, cabin, and dates.',
  hotel_offer: 'Use section heading "Hotel Details". Include property name, room type, dates, and board basis.',
  supplier_request: 'Address as "Dear Supplier,". Use "Request Details". Omit Price unless a budget was provided.',
  payment_reminder: 'Use "Payment Details" with amount and due date. Keep tone polite and professional.',
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
        instructions: `You are a travel CRM assistant. Summarize client or lead notes clearly for an agent.
Use short bullet points. Highlight: destination, dates, budget, preferences, deadlines, and action items.
Keep it under 200 words. Plain text only.`,
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
        instructions: `You are a professional travel agency copywriter. Rewrite the message to be clear, warm, and business-appropriate.
Preserve all factual details (dates, prices, names, destinations). Do not invent information.
Output only the rewritten message — no commentary.`,
        input: [
          payload.tone ? `Tone: ${payload.tone}` : 'Tone: professional and friendly',
          '',
          'Original message:',
          payload.text || payload.message || '',
        ].join('\n'),
        temperature: 0.35,
      }

    case 'crm_assist':
      return {
        instructions: `You are an AI assistant embedded in a travel agency CRM.
Help agents with leads, clients, quotations, follow-ups, and professional communication.
Be concise, actionable, and accurate. Use travel industry terminology.
If information is missing, say what is needed rather than guessing.`,
        input: payload.prompt || payload.message || payload.question || '',
        temperature: 0.4,
      }

    case 'chat':
      return {
        instructions: payload.instructions || 'You are a helpful travel agency assistant.',
        input: buildChatInputFromMessages(payload.messages),
        temperature: payload.temperature ?? 0.3,
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

  const context = [
    `Email type: ${emailType}`,
    `Client name: ${clientName}`,
    guidance,
    `Opening line: ${greeting}`,
    destination ? `Destination / route: ${destination}` : '',
    price ? `Price: ${formatPrice(price, currency)}` : '',
    flightDetails ? `Flight data:\n${flightDetails}` : '',
    userPrompt?.trim() ? `User instructions:\n${userPrompt.trim()}` : '',
    extraNotes?.trim() ? `Extra notes:\n${extraNotes.trim()}` : '',
  ].filter(Boolean).join('\n\n')

  return {
    instructions: EMAIL_SYSTEM_PROMPT,
    input: `Replace [Client Name] with: ${clientName}\n\nInformation to use:\n${context}`,
    temperature: 0.35,
  }
}
