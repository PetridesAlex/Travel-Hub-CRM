import { normalizeCrmCapturePayload } from '../../shared/crmCapture.js'

const TRAVEL_KEYWORDS = [
  { type: 'cruise', pattern: /\b(cruise|msc|ferry)\b/i },
  { type: 'honeymoon', pattern: /\b(honeymoon|wedding|anniversary)\b/i },
  { type: 'business', pattern: /\b(business trip|corporate|conference)\b/i },
  { type: 'flight', pattern: /\b(flight|airline|air ticket)\b/i },
  { type: 'hotel', pattern: /\b(hotel|resort|villa|all inclusive)\b/i },
  { type: 'package', pattern: /\b(package|holiday deal)\b/i },
]

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

function extractPhone(text) {
  const labeled =
    extractLabel(text, ['contact number', 'phone number', 'phone', 'mobile', 'tel', 'telephone', 'contact']) ||
    null
  if (labeled && /\d{5,}/.test(labeled)) return labeled.replace(/\s+/g, ' ').trim()

  const match = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/)
  return match ? match[0].replace(/\s+/g, ' ').trim() : null
}

function extractLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|[\\n,;])\\s*${label}\\s*[:=]\\s*(.+?)(?:[,;\\n]|$)`, 'im')
    const match = text.match(re)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function inferClientType(text, clientTypeHint) {
  if (clientTypeHint === 'business' || clientTypeHint === 'individual') return clientTypeHint
  if (/\b(individual|individuals|personal client|save as individual|add to individuals)\b/i.test(text)) {
    return 'individual'
  }
  if (/\b(corporate|company|business client|organisation|organization|add corporate|save as corporate)\b/i.test(text)) {
    return 'business'
  }
  return 'individual'
}

function inferTravelType(text) {
  for (const { type, pattern } of TRAVEL_KEYWORDS) {
    if (pattern.test(text)) return type
  }
  return 'other'
}

function inferName(text) {
  const patterns = [
    /(?:with the name|named|name is|client name|full name)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /(?:first name|name)\s*[:=]\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /(?:save|add)\s+(?:as\s+)?(?:individual|client)[\s,—–-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:new client|add client|client)\s*[-—–:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[,—–-]/m,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }

  const labeled =
    extractLabel(text, ['name', 'full name', 'client', 'contact person', 'contact']) ||
    extractLabel(text, ['from'])
  if (labeled) return labeled.replace(/<.*>/, '').trim()

  return null
}

function inferCompanyName(text) {
  return (
    extractLabel(text, ['company', 'company name', 'organisation', 'organization', 'corporate']) ||
    text.match(/company\s+([A-Z][A-Za-z0-9\s&.'-]{2,60})/i)?.[1]?.trim() ||
    null
  )
}

function inferDestination(text) {
  return (
    extractLabel(text, ['destination', 'where', 'travel to', 'location', 'trip to']) ||
    text.match(/\bwants?\s+([A-Z][a-zA-Z\s]{2,40})/i)?.[1]?.trim() ||
    text.match(/\bto\s+([A-Z][a-zA-Z\s]{2,30})/i)?.[1]?.trim() ||
    null
  )
}

function inferBudget(text) {
  const labeled = extractLabel(text, ['budget', 'price range', 'max budget'])
  const source = labeled || text
  const match =
    source.match(/(?:€|eur|euro|£|gbp|\$|usd)\s*([\d,.]+)/i) ||
    source.match(/([\d,.]+)\s*(?:€|eur|euros?|£|gbp|\$|usd)/i) ||
    source.match(/(?:around|about|~)\s*([\d,.]+)/i)
  if (!match?.[1]) return null
  const num = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(num) && num > 0 ? num : null
}

export function parseCrmCaptureFromText(text, mode = 'lead', options = {}) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Type a message with client or lead details first.')

  const clientTypeHint = options.clientTypeHint
  const clientType = inferClientType(trimmed, clientTypeHint)
  const email = extractEmail(trimmed)
  const phone = extractPhone(trimmed)
  const fullName = inferName(trimmed) || (email ? email.split('@')[0].replace(/[._]/g, ' ') : null)
  const companyName = clientType === 'business' ? inferCompanyName(trimmed) : null
  const destination = inferDestination(trimmed)
  const budget = inferBudget(trimmed)
  const travelDates = extractLabel(trimmed, ['travel dates', 'dates', 'when', 'departure'])
  const adultsMatch = trimmed.match(/(\d+)\s+adults?/i)
  const childrenMatch = trimmed.match(/(\d+)\s+(?:children|kids)/i)
  const hasTrip = Boolean(destination || budget || travelDates)

  const payload = {
    intent:
      mode === 'client'
        ? hasTrip && mode === 'lead'
          ? 'create_client_and_lead'
          : 'create_client'
        : hasTrip
          ? 'create_client_and_lead'
          : 'create_client',
    summary: buildSummary({ mode, clientType, fullName, companyName, destination, hasTrip }),
    client: {
      client_type: clientType,
      full_name: fullName,
      company_name: companyName,
      email,
      phone,
      nationality: extractLabel(trimmed, ['nationality', 'country']),
      notes: extractLabel(trimmed, ['notes', 'description', 'comments']) || null,
    },
    lead:
      mode === 'lead' && hasTrip
        ? {
            destination: destination || 'General inquiry',
            travel_type: inferTravelType(trimmed),
            budget,
            number_of_adults: adultsMatch ? Number(adultsMatch[1]) : 1,
            number_of_children: childrenMatch ? Number(childrenMatch[1]) : 0,
            travel_dates: travelDates,
            status: 'new',
            notes: trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed,
            follow_up_date: null,
          }
        : null,
  }

  return normalizeCrmCapturePayload(payload, mode, { clientTypeHint: mode === 'client' ? clientType : null })
}

function buildSummary({ mode, clientType, fullName, companyName, destination, hasTrip }) {
  const label = clientType === 'business' ? 'corporate client' : 'individual client'
  const who = companyName || fullName || 'new contact'

  if (mode === 'lead' && hasTrip) {
    return `Ready to save ${who}${destination ? ` with a ${destination} enquiry` : ''}.`
  }
  return `Ready to save ${who} as an ${label}.`
}
