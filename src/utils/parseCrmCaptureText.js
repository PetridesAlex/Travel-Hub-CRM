import { normalizeCrmCapturePayload } from '../../shared/crmCapture.js'

const TRAVEL_KEYWORDS = [
  { type: 'cruise', pattern: /\b(cruise|msc|ferry)\b/i },
  { type: 'honeymoon', pattern: /\b(honeymoon|wedding|anniversary)\b/i },
  { type: 'business', pattern: /\b(business|corporate|conference)\b/i },
  { type: 'flight', pattern: /\b(flight|airline|air ticket)\b/i },
  { type: 'hotel', pattern: /\b(hotel|resort|villa|all inclusive)\b/i },
  { type: 'package', pattern: /\b(package|holiday deal)\b/i },
]

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

function extractPhone(text) {
  const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)
  return match ? match[0].replace(/\s+/g, ' ').trim() : null
}

function extractLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:=]\\s*(.+)$`, 'im')
    const match = text.match(re)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function inferTravelType(text) {
  for (const { type, pattern } of TRAVEL_KEYWORDS) {
    if (pattern.test(text)) return type
  }
  return 'other'
}

function inferName(text) {
  const labeled =
    extractLabel(text, ['name', 'full name', 'client', 'contact']) ||
    extractLabel(text, ['from'])
  if (labeled) return labeled.replace(/<.*>/, '').trim()

  const newClient = text.match(/(?:new client|add client|client)\s*[-—–:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i)
  if (newClient?.[1]) return newClient[1].trim()

  return null
}

function inferDestination(text) {
  return (
    extractLabel(text, ['destination', 'where', 'travel to', 'location', 'trip to']) ||
    (text.match(/\bto\s+([A-Z][a-zA-Z\s]{2,30})/)?.[1]?.trim() || null)
  )
}

function inferBudget(text) {
  const labeled = extractLabel(text, ['budget', 'price range', 'max budget'])
  const source = labeled || text
  const match = source.match(/(?:€|eur|euro|£|gbp|\$|usd)\s*([\d,.]+)/i) || source.match(/([\d,.]+)\s*(?:€|eur|euros?|£|gbp|\$|usd)/i)
  if (!match?.[1]) return null
  const num = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(num) && num > 0 ? num : null
}

export function parseCrmCaptureFromText(text, mode = 'lead') {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Type a message with client or lead details first.')

  const email = extractEmail(trimmed)
  const phone = extractPhone(trimmed)
  const fullName = inferName(trimmed) || (email ? email.split('@')[0].replace(/[._]/g, ' ') : null)
  const destination = inferDestination(trimmed)
  const budget = inferBudget(trimmed)
  const travelDates = extractLabel(trimmed, ['travel dates', 'dates', 'when', 'departure'])
  const adultsMatch = trimmed.match(/(\d+)\s+adults?/i)
  const childrenMatch = trimmed.match(/(\d+)\s+(?:children|kids)/i)
  const hasTrip = Boolean(destination || budget || travelDates)

  const payload = {
    intent: mode === 'client' ? (hasTrip ? 'create_client_and_lead' : 'create_client') : hasTrip ? 'create_client_and_lead' : 'create_client',
    summary: hasTrip
      ? `Captured client${destination ? ` and ${destination} inquiry` : ''} from your message.`
      : 'Captured client details from your message.',
    client: {
      client_type: /\b(corporate|company|business)\b/i.test(trimmed) ? 'business' : 'individual',
      full_name: fullName,
      company_name: extractLabel(trimmed, ['company', 'organisation', 'organization']),
      email,
      phone,
      nationality: extractLabel(trimmed, ['nationality', 'country']),
      notes: extractLabel(trimmed, ['notes', 'description', 'comments']) || null,
    },
    lead: hasTrip
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

  if (mode === 'client' && !hasTrip) payload.lead = null

  return normalizeCrmCapturePayload(payload, mode)
}
