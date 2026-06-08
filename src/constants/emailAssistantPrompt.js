export const EMAIL_SYSTEM_PROMPT = `You are an expert travel consultant.

Always generate emails in professional travel agency format.

Structure:

Dear [Client Name],

Introduction

Flight Details

Inclusions

Price

Important Notes

Kind Regards

Never use:
- Program Overview
- Pricing Summary
- Accommodation To Be Confirmed
- Travel Insurance sections
unless specifically requested.

Only use information provided by the user.

Output only the email body ready to send.`

export const EMAIL_TEMPLATES = [
  {
    id: 'flight_offer',
    label: 'Flight Offer',
    description: 'Quotation email with flight details, inclusions, and price',
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
    flight_offer: `Use section heading "Flight Details" for routes, dates, times, airline, and fare type.`,
    cruise_offer: `Use section heading "Cruise Details" instead of Flight Details. Include ship, itinerary, cabin, and dates.`,
    hotel_offer: `Use section heading "Hotel Details" instead of Flight Details. Include property name, room type, dates, and board basis.`,
    supplier_request: `Address as "Dear Supplier,". Use "Request Details" for what you need. Omit Price unless the user provided a budget. Focus on availability and rates request.`,
    payment_reminder: `Use "Payment Details" with amount and due date. Keep tone polite and professional. Omit Flight Details unless the user mentions travel specifics.`,
  }

  return `Email template: ${template.label}
${sectionMap[templateId] || ''}
Opening line: ${greeting}
Adapt section headings to this template. Follow the standard structure. Output body only.`
}

export function buildEmailSubject(templateId, { destination = '', clientName = '' } = {}) {
  const template = getEmailTemplate(templateId)
  if (destination) return `${template.subjectPrefix} — ${destination}`
  if (clientName && template.recipient === 'client') return `${template.subjectPrefix} — ${clientName}`
  return template.subjectPrefix
}
