const TRAVEL_TYPE_KEYWORDS = [
  { type: 'cruise', patterns: /\b(cruise|msc|celebrity cruises|royal caribbean|ferry)\b/i },
  { type: 'honeymoon', patterns: /\b(honeymoon|wedding|romantic|anniversary)\b/i },
  { type: 'school_trip', patterns: /\b(school trip|school group|student trip|education)\b/i },
  { type: 'group', patterns: /\b(group travel|group booking|large group)\b/i },
  { type: 'business', patterns: /\b(business trip|corporate|conference|meeting)\b/i },
  { type: 'flight', patterns: /\b(flight|airline|air ticket|return ticket|one way)\b/i },
  { type: 'hotel', patterns: /\b(hotel|accommodation|resort|villa|all inclusive)\b/i },
  { type: 'package', patterns: /\b(package|holiday deal|travel package|tour package)\b/i },
]

const FIELD_PATTERNS = [
  { key: 'full_name', patterns: [/^(?:full\s*)?name\s*[:=]\s*(.+)$/im, /^from\s*[:=]\s*(.+)$/im, /^client\s*[:=]\s*(.+)$/im] },
  { key: 'email', patterns: [/^(?:e-?mail|email address)\s*[:=]\s*(.+)$/im, /^reply-?to\s*[:=]\s*(.+)$/im] },
  { key: 'phone', patterns: [/^(?:phone|telephone|mobile|tel)\s*[:=]\s*(.+)$/im] },
  { key: 'destination', patterns: [/^(?:destination|where|travel to|location|country)\s*[:=]\s*(.+)$/im] },
  { key: 'travel_dates', patterns: [/^(?:travel dates?|dates?|when|departure|check-?in)\s*[:=]\s*(.+)$/im] },
  { key: 'budget', patterns: [/^(?:budget|price range|max budget)\s*[:=]\s*(.+)$/im] },
  { key: 'number_of_adults', patterns: [/^(?:adults?|number of adults?|pax|passengers?)\s*[:=]\s*(\d+)/im] },
  { key: 'number_of_children', patterns: [/^(?:children|kids|number of children)\s*[:=]\s*(\d+)/im] },
  { key: 'package_name', patterns: [/^(?:package|product|offer|trip|tour)\s*[:=]\s*(.+)$/im] },
  { key: 'message', patterns: [/^(?:message|comments?|inquiry|details|notes|your message)\s*[:=]\s*([\s\S]+)$/im] },
]

function cleanValue(value) {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function extractEmailFromText(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0] : ''
}

function parseBudget(value) {
  if (value == null || value === '') return null
  const normalized = String(value).replace(/[^\d.,]/g, '').replace(/,/g, '')
  const num = Number(normalized)
  return Number.isFinite(num) && num > 0 ? num : null
}

function parseCount(value) {
  if (value == null || value === '') return null
  const num = Number(String(value).replace(/[^\d]/g, ''))
  return Number.isFinite(num) ? num : null
}

function inferTravelType(text) {
  const haystack = String(text || '')
  for (const { type, patterns } of TRAVEL_TYPE_KEYWORDS) {
    if (patterns.test(haystack)) return type
  }
  return 'other'
}

function parseFromRawEmail(rawEmail) {
  const text = String(rawEmail || '')
  const parsed = { source: 'email' }

  for (const { key, patterns } of FIELD_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match?.[1]) {
        parsed[key] = cleanValue(match[1])
        break
      }
    }
  }

  if (!parsed.email) parsed.email = extractEmailFromText(text)
  if (!parsed.full_name) {
    const fromMatch = text.match(/^from\s*[:=]\s*(.+?)(?:<|$)/im)
    if (fromMatch) parsed.full_name = cleanValue(fromMatch[1].replace(/<.*>/, ''))
  }

  if (!parsed.message && parsed.package_name) {
    parsed.message = `Interested in package: ${parsed.package_name}`
  }

  return parsed
}

export function parseWebsiteInquiry(body = {}) {
  const hasStructuredFields = body.full_name || body.email || body.destination || body.message
  const rawEmail = body.raw_email || body.email_body || body.body

  let fields = hasStructuredFields ? { ...body } : {}
  if (rawEmail) {
    fields = { ...parseFromRawEmail(rawEmail), ...fields }
  }

  const fullName = cleanValue(fields.full_name || fields.name)
  const email = cleanValue(fields.email)
  const phone = cleanValue(fields.phone)
  const destination = cleanValue(fields.destination || fields.package_name || fields.package)
  const travelDates = cleanValue(fields.travel_dates || fields.dates)
  const budget = parseBudget(fields.budget)
  const adults = parseCount(fields.number_of_adults) ?? 1
  const children = parseCount(fields.number_of_children) ?? 0
  const source = cleanValue(fields.source) || (rawEmail ? 'website_email' : 'website_form')
  const packageName = cleanValue(fields.package_name || fields.package)
  const message = cleanValue(fields.message)

  const contextText = [destination, packageName, message, rawEmail].filter(Boolean).join('\n')
  const validTravelTypes = new Set([
    'cruise', 'honeymoon', 'business', 'school_trip', 'group', 'flight', 'hotel', 'package', 'other',
  ])
  const requestedType = cleanValue(fields.travel_type)
  const travelType = validTravelTypes.has(requestedType)
    ? requestedType
    : inferTravelType(contextText)

  const noteLines = [`Source: ${source}`]
  if (email) noteLines.push(`Email: ${email}`)
  if (phone) noteLines.push(`Phone: ${phone}`)
  if (packageName) noteLines.push(`Package: ${packageName}`)
  if (message) noteLines.push('', message)
  if (rawEmail && !message) noteLines.push('', '--- Original email ---', String(rawEmail).slice(0, 4000))

  return {
    client: {
      full_name: fullName || email.split('@')[0] || 'Website Inquiry',
      email: email || null,
      phone: phone || null,
    },
    lead: {
      destination: destination || packageName || 'Website inquiry',
      travel_type: travelType,
      budget,
      number_of_adults: adults,
      number_of_children: children,
      travel_dates: travelDates || null,
      status: 'new',
      notes: noteLines.join('\n'),
      follow_up_date: null,
    },
    meta: {
      source,
      package_name: packageName || null,
      message: message || null,
    },
  }
}
