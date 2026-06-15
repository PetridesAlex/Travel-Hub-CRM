const META_INSTRUCTION_PATTERNS = [
  /prepare.{0,30}email/i,
  /use.{0,20}template/i,
  /email platform/i,
  /voice note/i,
  /dictate/i,
  /random info/i,
  /whole email/i,
  /most professional email/i,
  /send (?:it |this )?to\b/i,
  /please (?:prepare|write|create|generate)/i,
]

export function formatClientSalutation(name) {
  const trimmed = (name || '').trim()
  if (!trimmed || /^valued client$/i.test(trimmed)) return 'Valued Client'
  if (/^(Mr|Mrs|Ms|Miss|Dr)\.?\s/i.test(trimmed)) return trimmed
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function isMetaInstructionText(text) {
  if (!text?.trim()) return false
  return META_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(text))
}

export function buildImportantNotesFromBrief(userPrompt = '', extraNotes = '', emailType = 'flight_offer') {
  const combined = [userPrompt, extraNotes].filter(Boolean).join('\n')
  const notes = []

  if (/passport/i.test(combined)) {
    notes.push('Please provide passport copies for all passengers to proceed with the booking.')
  }

  if (/payment|balance|deposit|due/i.test(combined)) {
    notes.push('Payment terms will be confirmed upon acceptance of this quotation.')
  }

  const defaultByType = {
    flight_offer: 'Please note that fares are subject to availability and may change until the booking is confirmed and ticketed. Should you wish to proceed, kindly confirm at your earliest convenience.',
    cruise_offer: 'Cabins and fares are subject to availability until confirmed in writing. Please contact us to secure your booking.',
    hotel_offer: 'Rates are subject to availability at the time of booking confirmation.',
    supplier_request: 'Please include cancellation policy and confirm availability at your earliest convenience.',
    payment_reminder: 'If you have already made this payment, please disregard this message. Kindly arrange payment at your earliest convenience to secure your booking.',
  }

  const base = defaultByType[emailType] || defaultByType.flight_offer
  if (!notes.length) return base
  return [...notes, base].join('\n\n')
}

export function buildProfessionalDetailsSection({
  flightDetails = '',
  destination = '',
  emailType = 'flight_offer',
}) {
  if (flightDetails?.trim()) return flightDetails.trim()

  const heading = emailType === 'flight_offer' ? 'route' : 'details'

  if (destination?.trim()) {
    return `Proposed ${heading}: ${destination.trim()}\n\nExact flight times, dates, and fares will be confirmed upon your instruction to proceed.`
  }

  const placeholders = {
    flight_offer: 'Flight options are being finalised based on your requirements. Confirmed routes, dates, times, and fares will be issued upon your approval to proceed.',
    cruise_offer: 'Cruise options are being prepared according to your requirements. Full itinerary and cabin details will follow upon confirmation.',
    hotel_offer: 'Accommodation options are being prepared according to your requirements. Confirmed property, dates, and rates will follow shortly.',
    payment_reminder: 'Please refer to the payment information below.',
    supplier_request: 'Please advise availability and net rates for the requirements outlined above.',
  }

  return placeholders[emailType] || placeholders.flight_offer
}

export function sanitizeEmailBody(body = '', userPrompt = '') {
  let result = body.trim()
  if (!result || !userPrompt?.trim()) return result

  const prompt = userPrompt.trim()
  if (prompt.length > 20 && result.toLowerCase().includes(prompt.toLowerCase().slice(0, 40))) {
    const lines = result.split('\n')
    result = lines
      .filter((line) => {
        const lower = line.toLowerCase()
        if (isMetaInstructionText(line)) return false
        if (prompt.length > 30 && lower.includes(prompt.toLowerCase().slice(0, 24))) return false
        return true
      })
      .join('\n')
  }

  result = result.replace(/\nFlight Details\n[^\n]*(?:prepare|template|platform|random|dictate)[^\n]*/gi, '\nFlight Details\n')
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export const PROFESSIONAL_EMAIL_EXAMPLE = `CORRECT EXAMPLE (agent brief was informal — output is formal and never quotes the brief):

Dear Mr Alex,

Thank you for your enquiry. We are pleased to provide the following flight quotation.

Flight Details
Outbound — Tue, 19 Jun
Depart: 06:10 from Paphos (PFO)
Arrive: 08:15 at Athens (ATH)
Flight: FR3328 · Ryanair · Direct

Return — Sat, 25 Jun
Depart: 08:55 from Athens (ATH)
Arrive: 09:50 at Paphos (PFO)
Flight: FR3327 · Ryanair · Direct

Price
€164.28

Important Notes
Please note that fares are subject to availability until confirmed and ticketed. Passport copies are required for all passengers to proceed. Kindly confirm if you wish to secure this booking.

Kind Regards,
Honeywell Travel

WRONG — NEVER output agent instructions like this:
Flight Details
so please prepare me the most professional email... use a template... include passports...`
