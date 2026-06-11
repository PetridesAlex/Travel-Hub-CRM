export const EMAIL_SYSTEM_PROMPT = `You are a senior travel consultant at an established professional travel agency. You write polished, fully formal business correspondence suitable for corporate clients and discerning travellers.

TONE AND STYLE:
- Fully formal and professional at all times — courteous, confident, and authoritative.
- Use complete, grammatically correct sentences throughout.
- Never use casual language, slang, contractions, emojis, or filler phrases.

WHEN PROCESSING VOICE NOTES OR CASUAL INSTRUCTIONS:
- Completely REWRITE spoken or casual notes into formal business English.
- Remove all speech fillers ("um", "so basically", "I want you to", etc.).
- Preserve EVERY factual detail: names, dates, times, flight numbers, routes, prices, currencies, and inclusions.

WHEN SCREENSHOT OR EXTRACTED DATA IS PROVIDED:
- Copy ALL factual information EXACTLY as provided — do not paraphrase, round, or guess.
- Present outbound and return flights separately when both are provided.

EMAIL STRUCTURE:
Dear [Client Name],
Introduction
Details section (Flight / Cruise / Hotel / Request / Payment)
Price (when provided)
Important Notes
Kind Regards

NEVER create an "Inclusions" section. Never copy agent voice instructions into the email.
Never use Program Overview, Pricing Summary, or Travel Insurance sections unless specifically requested.
Only use information provided by the user.
Output only the email body ready to send.`

export const EMAIL_TEMPLATES = [
  {
    id: 'flight_offer',
    label: 'Flight Offer',
    description: 'Formal quotation with routes, schedules, and pricing',
    subjectPrefix: 'Flight Quotation',
    detailsHeading: 'Flight Details',
    recipient: 'client',
  },
  {
    id: 'cruise_offer',
    label: 'Cruise Offer',
    description: 'Cruise package offer with itinerary highlights and pricing',
    subjectPrefix: 'Cruise Offer',
    detailsHeading: 'Cruise Details',
    recipient: 'client',
  },
  {
    id: 'hotel_offer',
    label: 'Hotel Offer',
    description: 'Hotel quotation with property details and rates',
    subjectPrefix: 'Hotel Offer',
    detailsHeading: 'Hotel Details',
    recipient: 'client',
  },
  {
    id: 'supplier_request',
    label: 'Supplier Request',
    description: 'Request availability and rates from a supplier',
    subjectPrefix: 'Availability Request',
    detailsHeading: 'Request Details',
    recipient: 'supplier',
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    description: 'Friendly reminder for an upcoming payment',
    subjectPrefix: 'Payment Reminder',
    detailsHeading: 'Payment Details',
    recipient: 'client',
  },
]

export function getEmailTemplate(id) {
  return EMAIL_TEMPLATES.find((t) => t.id === id) || EMAIL_TEMPLATES[0]
}

export function getTemplateGuidance(templateId) {
  const template = getEmailTemplate(templateId)
  const greeting = template.recipient === 'supplier' ? 'Dear Supplier,' : 'Dear [Client Name],'

  const sectionMap = {
    flight_offer: `Use section heading "Flight Details". Include every route, date, time, airline, flight number, duration, and fare type from the provided data.`,
    cruise_offer: `Use section heading "Cruise Details" instead of Flight Details. Include ship, itinerary, cabin, dates, and all provided specifics.`,
    hotel_offer: `Use section heading "Hotel Details" instead of Flight Details. Include property name, room type, dates, board basis, and all provided specifics.`,
    supplier_request: `Address as "Dear Supplier,". Use "Request Details" for what you need. Omit Price unless the user provided a budget. Use formal supplier-facing language.`,
    payment_reminder: `Use "Payment Details" with amount and due date. Maintain a polite, professional, and firm tone. Omit Flight Details unless the user mentions travel specifics.`,
  }

  return `Email template: ${template.label}
${sectionMap[templateId] || ''}
Opening line: ${greeting}
Rewrite any voice notes into fully formal English. Copy all screenshot data exactly.
Adapt section headings to this template. Follow the standard structure. Output body only.`
}

export function buildEmailSubject(templateId, { destination = '', clientName = '' } = {}) {
  const template = getEmailTemplate(templateId)
  if (destination) return `${template.subjectPrefix} — ${destination}`
  if (clientName && template.recipient === 'client') return `${template.subjectPrefix} — ${clientName}`
  return template.subjectPrefix
}
