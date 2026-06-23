const VALID_TRAVEL_TYPES = new Set([
  'cruise', 'honeymoon', 'business', 'school_trip', 'group', 'flight', 'hotel', 'package', 'other',
])

const VALID_STATUSES = new Set(['new', 'contacted', 'quoted', 'follow_up', 'confirmed', 'lost'])

function cleanString(value) {
  if (value == null) return null
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text || null
}

function parseNumber(value) {
  if (value == null || value === '') return null
  const num = Number(String(value).replace(/[^\d.,]/g, '').replace(/,/g, ''))
  return Number.isFinite(num) && num > 0 ? num : null
}

function parseCount(value, fallback = 0) {
  if (value == null || value === '') return fallback
  const num = Number(String(value).replace(/[^\d]/g, ''))
  return Number.isFinite(num) && num >= 0 ? num : fallback
}

function normalizeClient(raw = {}) {
  const clientType = raw.client_type === 'business' ? 'business' : 'individual'
  return {
    client_type: clientType,
    full_name: cleanString(raw.full_name),
    company_name: clientType === 'business' ? cleanString(raw.company_name) : null,
    email: cleanString(raw.email)?.toLowerCase() || null,
    phone: cleanString(raw.phone),
    nationality: cleanString(raw.nationality),
    notes: cleanString(raw.notes),
  }
}

function normalizeLead(raw = null) {
  if (!raw || typeof raw !== 'object') return null

  const destination = cleanString(raw.destination)
  const hasLeadData =
    destination ||
    raw.budget != null ||
    cleanString(raw.travel_dates) ||
    cleanString(raw.notes)

  if (!hasLeadData) return null

  const travelType = VALID_TRAVEL_TYPES.has(raw.travel_type) ? raw.travel_type : 'other'
  const status = VALID_STATUSES.has(raw.status) ? raw.status : 'new'

  return {
    destination: destination || 'General inquiry',
    travel_type: travelType,
    budget: parseNumber(raw.budget),
    number_of_adults: parseCount(raw.number_of_adults, 1) || 1,
    number_of_children: parseCount(raw.number_of_children, 0),
    travel_dates: cleanString(raw.travel_dates),
    status,
    notes: cleanString(raw.notes),
    follow_up_date: cleanString(raw.follow_up_date),
  }
}

export function normalizeCrmCapturePayload(data, mode = 'lead', options = {}) {
  if (!data || typeof data !== 'object') throw new Error('Invalid capture data')

  const clientTypeHint = options.clientTypeHint === 'business' ? 'business' : options.clientTypeHint === 'individual' ? 'individual' : null
  const rawClient = { ...(data.client || {}) }

  if (clientTypeHint && mode === 'client') {
    rawClient.client_type = clientTypeHint
    if (clientTypeHint === 'individual') rawClient.company_name = null
  }

  const client = normalizeClient(rawClient)
  let lead = normalizeLead(data.lead)

  let intent = data.intent
  if (!['create_client', 'create_client_and_lead', 'create_lead_only'].includes(intent)) {
    if (mode === 'client') intent = 'create_client'
    else if (lead) intent = 'create_client_and_lead'
    else intent = 'create_client'
  }

  if (mode === 'client' && intent === 'create_client_and_lead' && !lead) {
    intent = 'create_client'
  }

  if (mode === 'client' && intent !== 'create_lead_only') {
    lead = intent === 'create_client_and_lead' ? lead : null
  }

  const summary = cleanString(data.summary) || 'Ready to save to your CRM.'

  if (intent !== 'create_lead_only' && !client.full_name && !client.email && !client.company_name) {
    throw new Error('Could not find a client name, company, or email in your message.')
  }

  if (intent === 'create_lead_only' && !lead) {
    throw new Error('Could not find travel inquiry details in your message.')
  }

  return {
    intent,
    summary,
    client: intent === 'create_lead_only' ? null : client,
    lead,
  }
}

export function parseAiCrmCaptureJson(output, mode = 'lead', options = {}) {
  const text = String(output || '').trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON.')
  const parsed = JSON.parse(jsonMatch[0])
  return normalizeCrmCapturePayload(parsed, mode, options)
}
