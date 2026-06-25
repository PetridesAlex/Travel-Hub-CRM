const GENERIC_DESTINATIONS = new Set([
  'website inquiry',
  'general enquiry',
  'general inquiry',
])

const DESTINATION_LABEL_RE =
  /^(?:προορισμός|destination|where|travel to|location|country|trip to|τοποθεσία)\s*[:=]\s*/iu

const BOILERPLATE_RE =
  /\b(build your trip request|website inquiry|general enquiry|general inquiry|hone?ywell travel)\b/gi

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function titleCase(value) {
  const text = cleanLine(value)
  if (!text) return ''
  return text
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
}

export function normalizeLeadDestination(raw = '') {
  let text = cleanLine(raw)
  if (!text) return ''

  const dashParts = text.split(/\s*---\s*/).map(cleanLine).filter(Boolean)
  if (dashParts.length > 1) {
    text = dashParts[0]
  }

  text = text.replace(DESTINATION_LABEL_RE, '')
  text = text.replace(/\s+CRM\s*$/i, '')
  text = cleanLine(text)

  return titleCase(text)
}

function splitDestinationBlob(raw = '') {
  const parts = String(raw || '').split(/\s*---\s*/).map(cleanLine).filter(Boolean)
  if (parts.length <= 1) {
    return {
      destination: normalizeLeadDestination(raw),
      inquiryType: '',
      sourceHint: '',
    }
  }

  return {
    destination: normalizeLeadDestination(parts[0]),
    inquiryType: cleanLine(parts[1] || '').replace(BOILERPLATE_RE, '').trim() || parts[1] || '',
    sourceHint: cleanLine(parts.slice(2).join(' · ') || ''),
  }
}

function parseNotesField(notes, field) {
  const match = String(notes || '').match(new RegExp(`^${field}\\s*[:=]\\s*(.+)$`, 'im'))
  return match ? cleanLine(match[1]) : ''
}

export function parseLeadNotes(notes = '') {
  const text = String(notes || '')
  const source = parseNotesField(text, 'Source')
  const packageName = parseNotesField(text, 'Package')
  const email = parseNotesField(text, 'Email')
  const phone = parseNotesField(text, 'Phone')

  const bodyLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(source|email|phone|package)\s*[:=]/i.test(line))
    .filter((line) => !line.startsWith('--- Original email ---'))
    .filter((line) => !BOILERPLATE_RE.test(line))

  const messagePreview = cleanLine(bodyLines[0] || '')

  return { source, packageName, email, phone, messagePreview }
}

function parseSourceMeta(source = '', sourceHint = '') {
  const raw = cleanLine(source) || cleanLine(sourceHint)
  if (!raw) {
    return {
      origin: 'CRM',
      channel: 'Manual entry',
      tone: 'manual',
      label: 'Manual entry',
    }
  }

  const parts = raw.split(/\s*[—–-]\s*/).map(cleanLine).filter(Boolean)
  const originRaw = parts[0] || raw
  const channelRaw = parts[1] || ''

  let origin = originRaw
  if (/honeywell/i.test(originRaw) || /honeywelltravel\.com/i.test(originRaw)) {
    origin = 'Honeywell Travel'
  } else if (/^website$/i.test(originRaw) || /website/i.test(originRaw)) {
    origin = 'Website'
  } else if (/^crm$/i.test(originRaw)) {
    origin = 'CRM'
  }

  const channel = channelRaw || ''
  let label = origin
  if (channel && channel !== origin && !/^manual/i.test(channel)) {
    label = `${origin} · ${channel}`
  } else if (origin === 'CRM') {
    label = 'Manual entry'
  }

  let tone = 'website'
  if (origin === 'CRM' || /^manual/i.test(channel)) tone = 'manual'
  else if (/contact/i.test(channel) || /contact/i.test(originRaw)) tone = 'contact'
  else if (/package/i.test(channel) || /package/i.test(originRaw)) tone = 'package'
  else if (/cruise/i.test(channel) || /cruise/i.test(originRaw)) tone = 'cruise'
  else if (/book online|flight/i.test(channel) || /flight/i.test(originRaw)) tone = 'flight'
  else if (/honeymoon/i.test(channel) || /honeymoon/i.test(originRaw)) tone = 'honeymoon'
  else if (/email/i.test(channel) || /email/i.test(originRaw)) tone = 'email'

  return { origin, channel, tone, label }
}

function buildMetaLine(lead = {}) {
  const parts = []
  if (lead.travel_dates) parts.push(cleanLine(lead.travel_dates))

  if (lead.budget != null && Number(lead.budget) > 0) {
    const amount = Number(lead.budget)
    parts.push(`€${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`)
  }

  const adults = Number(lead.number_of_adults) || 0
  const children = Number(lead.number_of_children) || 0
  if (adults > 0 || children > 0) {
    const travellerParts = []
    if (adults > 0) travellerParts.push(`${adults} adult${adults === 1 ? '' : 's'}`)
    if (children > 0) travellerParts.push(`${children} child${children === 1 ? '' : 'ren'}`)
    parts.push(travellerParts.join(', '))
  }

  return parts.join(' · ')
}

function cleanContextLine(value) {
  const text = cleanLine(value)
  if (!text) return ''
  if (/^build your trip request$/i.test(text)) return 'Trip request'
  return text.length > 96 ? `${text.slice(0, 93)}…` : text
}

export function getLeadInquiryDisplay(lead = {}) {
  const { source, packageName, messagePreview } = parseLeadNotes(lead.notes)
  const { destination, inquiryType, sourceHint } = splitDestinationBlob(lead.destination)
  const destinationIsGeneric = !destination || GENERIC_DESTINATIONS.has(destination.toLowerCase())

  const title = !destinationIsGeneric
    ? destination
    : normalizeLeadDestination(packageName) || cleanContextLine(messagePreview) || 'General enquiry'

  const contextCandidates = [
    !destinationIsGeneric ? cleanContextLine(inquiryType) : '',
    !destinationIsGeneric && packageName && packageName !== destination ? packageName : '',
    messagePreview && messagePreview !== title ? messagePreview : '',
  ].filter(Boolean)

  const context = contextCandidates[0] || ''
  const metaLine = buildMetaLine(lead)
  const sourceMeta = parseSourceMeta(source, sourceHint)

  return {
    title,
    context,
    metaLine,
    sourceLabel: sourceMeta.label,
    origin: sourceMeta.origin,
    channel: sourceMeta.channel,
    tone: sourceMeta.tone,
  }
}

export const LEAD_SOURCE_TONES = {
  website: 'bg-teal-50 text-teal-800 ring-teal-200/70',
  contact: 'bg-sky-50 text-sky-800 ring-sky-200/70',
  package: 'bg-violet-50 text-violet-800 ring-violet-200/70',
  cruise: 'bg-indigo-50 text-indigo-800 ring-indigo-200/70',
  flight: 'bg-cyan-50 text-cyan-800 ring-cyan-200/70',
  honeymoon: 'bg-rose-50 text-rose-800 ring-rose-200/70',
  email: 'bg-amber-50 text-amber-800 ring-amber-200/70',
  manual: 'bg-slate-100 text-slate-600 ring-slate-200/70',
}

export const LEAD_INQUIRY_THEMES = {
  website: {
    icon: 'text-teal-600',
    dot: 'bg-teal-500',
  },
  contact: {
    icon: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  package: {
    icon: 'text-violet-600',
    dot: 'bg-violet-500',
  },
  cruise: {
    icon: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  flight: {
    icon: 'text-cyan-600',
    dot: 'bg-cyan-500',
  },
  honeymoon: {
    icon: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  email: {
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  manual: {
    icon: 'text-slate-500',
    dot: 'bg-slate-400',
  },
}

export function getLeadInquiryTheme(tone) {
  return LEAD_INQUIRY_THEMES[tone] || LEAD_INQUIRY_THEMES.website
}

export const TRAVEL_TYPE_THEMES = {
  cruise: { badge: 'border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800', icon: 'bg-indigo-500' },
  honeymoon: { badge: 'border-rose-200/80 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-800', icon: 'bg-rose-500' },
  business: { badge: 'border-slate-300/80 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-800', icon: 'bg-slate-600' },
  school_trip: { badge: 'border-lime-200/80 bg-gradient-to-r from-lime-50 to-green-50 text-lime-900', icon: 'bg-lime-600' },
  group: { badge: 'border-orange-200/80 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-900', icon: 'bg-orange-500' },
  flight: { badge: 'border-cyan-200/80 bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-900', icon: 'bg-cyan-500' },
  hotel: { badge: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900', icon: 'bg-amber-500' },
  package: { badge: 'border-violet-200/80 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-800', icon: 'bg-violet-500' },
  other: { badge: 'border-teal-200/80 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-800', icon: 'bg-teal-500' },
}

export const LEAD_STATUS_ROW_ACCENT = {
  new: 'border-l-blue-400',
  contacted: 'border-l-indigo-400',
  quoted: 'border-l-purple-400',
  follow_up: 'border-l-amber-400',
  confirmed: 'border-l-emerald-400',
  lost: 'border-l-red-300',
}

export function getTravelTypeTheme(travelType) {
  return TRAVEL_TYPE_THEMES[travelType] || TRAVEL_TYPE_THEMES.other
}
