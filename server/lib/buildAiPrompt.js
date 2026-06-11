const PLACEHOLDER_DEFAULTS = {
  client_name: 'Valued Client',
  supplier_name: 'Supplier',
  agency_name: 'Your Travel Agency',
  route: '',
  travel_dates: '',
  outbound_details: '',
  return_details: '',
  inclusions: '',
  price: '',
  ship_name: '',
  itinerary: '',
  cabin_details: '',
  exclusions: '',
  destination_or_hotel: '',
  guest_details: '',
  room_requirements: '',
  meal_plan: '',
  notes: '',
  destination: '',
  hotel_details: '',
  booking_details: '',
  total_cost: '',
  amount_received: '',
  balance_due: '',
  due_date: '',
  hotel_name: '',
  check_in: '',
  check_out: '',
  nights: '',
  room_type: '',
  breakfast_included: '',
  supplier_platform: '',
  supplier_net_rate: '',
  supplier_price_per_night: '',
  booking_platform: '',
  booking_public_rate: '',
  booking_price_per_night: '',
  price_difference: '',
  margin_percent: '',
  margin_amount: '',
  client_quote_price: '',
  comparison_summary: '',
  cancellation_policy: '',
  taxes_and_fees: '',
  star_rating: '',
  additional_notes: '',
}

export function fillTemplate(templateBody, data = {}) {
  const merged = { ...PLACEHOLDER_DEFAULTS, ...data }
  return templateBody.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = merged[key]
    if (value === undefined || value === null || String(value).trim() === '') {
      return 'To be confirmed'
    }
    return String(value)
  })
}

export function buildStructuredInput(inputData = {}) {
  const lines = Object.entries(inputData)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
  return lines.join('\n')
}

export function buildOpenAiUserMessage({ templateBody, inputData, agencyName, extraNotes = '' }) {
  const filled = fillTemplate(templateBody, { ...inputData, agency_name: agencyName || inputData.agency_name })
  const structured = buildStructuredInput(inputData)

  const parts = [
    'Use the template structure below as a guide. Produce fully formal, professional business English suitable for sending directly to a client or supplier.',
    'Rewrite any informal voice notes into polished formal language while preserving every factual detail.',
    'Copy all extracted screenshot data exactly — do not omit, alter, or round prices, dates, times, or flight numbers.',
    '',
    '--- TEMPLATE ---',
    filled,
    '--- END TEMPLATE ---',
  ]

  if (structured) {
    parts.push('', '--- PROVIDED DATA (use every detail accurately) ---', structured)
  }

  if (extraNotes?.trim()) {
    parts.push('', '--- ADDITIONAL NOTES (rewrite formally, keep all facts) ---', extraNotes.trim())
  }

  parts.push(
    '',
    'IMPORTANT:',
    '- Output only the final client-ready content in fully formal business English.',
    '- Do not add Program Overview, Accommodation, Travel Insurance, or Next Steps unless they appear in the template above.',
    '- Use only provided information — never invent details.',
    '- No markdown, no commentary, no subject line unless the template includes one.',
  )

  return parts.join('\n')
}

export { extractOpenAiText } from './openaiService.js'
