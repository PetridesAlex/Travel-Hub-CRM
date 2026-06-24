const VALID_TRAVEL_TYPES = new Set([
  'cruise', 'honeymoon', 'business', 'school_trip', 'group', 'flight', 'hotel', 'package', 'other',
])

const VALID_STATUSES = new Set(['new', 'contacted', 'quoted', 'follow_up', 'confirmed', 'lost'])

function cleanString(value) {
  if (value == null) return null
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text || null
}

function cleanNotes(value) {
  if (value == null) return null
  const text = String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || null
}

function extractLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|[\\n])\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*([^\\n]+)`, 'im')
    const match = text.match(re)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function extractBlock(text, headerPattern) {
  const match = text.match(
    new RegExp(`(?:${headerPattern})[\\s─—-]*\\n([\\s\\S]*)`, 'i'),
  )
  const block = match?.[1]?.trim()
  if (!block) return null

  const nextSection = block.match(/\n\n[A-Z]{2,}(?:\s+[A-Z&/]+)*[\s\n─—-]*\n/)
  return nextSection ? block.slice(0, nextSection.index).trim() : block
}

export function buildNotesFromStructuredText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { clientNotes: null, leadNotes: null }

  const clientParts = []
  const leadParts = []

  const departureCity = extractLabel(trimmed, ['Departure City', 'Departing from', 'Departure city'])
  const departureCountry = extractLabel(trimmed, ['Departure Country', 'Country of departure', 'Departure country'])
  if (departureCity) clientParts.push(`Departure City: ${departureCity}`)
  if (departureCountry) clientParts.push(`Departure Country: ${departureCountry}`)

  const travellerNotes = extractBlock(trimmed, 'TRAVELLER|TRAVELER|CLIENT\\s+DETAILS')
  if (travellerNotes) {
    const stripped = travellerNotes
      .split('\n')
      .filter((line) => {
        const t = line.trim()
        if (!t) return false
        if (/^(full name|email|phone|departure city|departure country)\s*:/i.test(t)) return false
        return true
      })
      .join('\n')
      .trim()
    if (stripped) clientParts.push(stripped)
  }

  const tripBrief = extractBlock(trimmed, 'TRIP\\s+BRIEF|TRIP\\s+DETAILS|ENQUIRY|INQUIRY')
  if (tripBrief) {
    leadParts.push(tripBrief)
  } else {
    const roomAllocation = extractBlock(trimmed, 'ROOM\\s+ALLOCATION')
    if (roomAllocation) leadParts.push(`Room Allocation:\n${roomAllocation}`)

    const mustHaves = extractBlock(trimmed, 'MUST[- ]HAVES?|REQUIREMENTS?|INCLUSIONS?|WISH\\s+LIST')
    if (mustHaves) leadParts.push(`Must-Haves:\n${mustHaves}`)
  }

  const labelledLeadFields = [
    'Travel Month',
    'Hotel Category',
    'Travel Style',
    'Travellers',
    'Travelers',
  ]
  const extraLeadLines = labelledLeadFields
    .map((label) => {
      const val = extractLabel(trimmed, [label])
      return val ? `${label}: ${val}` : null
    })
    .filter(Boolean)

  if (extraLeadLines.length && !tripBrief) {
    leadParts.push(extraLeadLines.join('\n'))
  }

  const generalNotes = extractBlock(trimmed, 'IMPORTANT\\s+NOTES?|ADDITIONAL\\s+NOTES?|CLIENT\\s+NOTES?')
  if (generalNotes) {
    const stripped = generalNotes
      .split('\n')
      .filter((line) => !/^(departure city|departure country)\s*:/i.test(line.trim()))
      .join('\n')
      .trim()
    if (stripped) leadParts.push(stripped)
  }

  return {
    clientNotes: clientParts.length ? clientParts.join('\n\n') : null,
    leadNotes: leadParts.length ? leadParts.join('\n\n') : null,
  }
}

function mergeNotes(existing, extra) {
  const a = cleanNotes(existing)
  const b = cleanNotes(extra)
  if (!b) return a
  if (!a) return b
  if (a.includes(b.slice(0, Math.min(60, b.length)))) return a
  return `${a}\n\n${b}`
}

export function enrichCaptureWithSourceNotes(capture, sourceText) {
  if (!capture || !sourceText?.trim()) return capture

  const { clientNotes, leadNotes } = buildNotesFromStructuredText(sourceText)
  const next = { ...capture }

  if (next.client) {
    next.client = {
      ...next.client,
      notes: mergeNotes(next.client.notes, clientNotes),
    }
  }

  if (next.lead) {
    next.lead = {
      ...next.lead,
      notes: mergeNotes(next.lead.notes, leadNotes),
    }
  } else if (leadNotes && next.intent === 'create_client') {
    next.client = {
      ...next.client,
      notes: mergeNotes(next.client?.notes, leadNotes),
    }
  }

  return next
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
    notes: cleanNotes(raw.notes),
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
    notes: cleanNotes(raw.notes),
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
