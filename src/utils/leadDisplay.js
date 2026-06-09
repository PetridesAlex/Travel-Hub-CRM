const GENERIC_DESTINATIONS = new Set([
  'website inquiry',
  'general enquiry',
  'general inquiry',
])

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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

  const messagePreview = cleanLine(bodyLines[0] || '')

  return { source, packageName, email, phone, messagePreview }
}

function parseSourceMeta(source = '') {
  const raw = cleanLine(source)
  if (!raw) {
    return {
      origin: 'CRM',
      channel: 'Manual entry',
      tone: 'manual',
    }
  }

  const parts = raw.split(/\s*[—–-]\s*/).map(cleanLine).filter(Boolean)
  const originRaw = parts[0] || raw
  const channelRaw = parts[1] || ''

  let origin = originRaw
  if (/honeywell/i.test(originRaw) || /honeywelltravel\.com/i.test(originRaw)) {
    origin = 'Honeywell Travel'
  } else if (/website/i.test(originRaw)) {
    origin = 'Website'
  }

  const channel = channelRaw || originRaw

  let tone = 'website'
  if (/contact/i.test(channel)) tone = 'contact'
  else if (/package/i.test(channel)) tone = 'package'
  else if (/cruise/i.test(channel)) tone = 'cruise'
  else if (/book online|flight/i.test(channel)) tone = 'flight'
  else if (/honeymoon/i.test(channel)) tone = 'honeymoon'
  else if (/email/i.test(channel)) tone = 'email'

  return { origin, channel, tone }
}

export function getLeadInquiryDisplay(lead = {}) {
  const { source, packageName, messagePreview } = parseLeadNotes(lead.notes)
  const destination = cleanLine(lead.destination)
  const destinationIsGeneric = !destination || GENERIC_DESTINATIONS.has(destination.toLowerCase())

  const title = !destinationIsGeneric
    ? destination
    : packageName || messagePreview || 'General enquiry'

  const subtitle = !destinationIsGeneric && packageName && packageName !== destination
    ? packageName
    : messagePreview && messagePreview !== title
      ? messagePreview
      : ''

  const sourceMeta = parseSourceMeta(source)

  return {
    title,
    subtitle: subtitle.length > 72 ? `${subtitle.slice(0, 69)}…` : subtitle,
    ...sourceMeta,
  }
}

export const LEAD_SOURCE_TONES = {
  website: 'bg-teal-50 text-teal-800 ring-teal-200/80',
  contact: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  package: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  cruise: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
  flight: 'bg-cyan-50 text-cyan-800 ring-cyan-200/80',
  honeymoon: 'bg-rose-50 text-rose-800 ring-rose-200/80',
  email: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  manual: 'bg-slate-100 text-slate-600 ring-slate-200/80',
}

export const LEAD_INQUIRY_THEMES = {
  website: {
    card: 'border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/50 shadow-[0_4px_14px_-8px_rgba(20,184,166,0.45)]',
    accent: 'bg-gradient-to-b from-teal-400 to-emerald-500',
    iconWrap: 'bg-teal-100 text-teal-700 ring-teal-200/80',
    title: 'text-teal-950',
    channel: 'bg-teal-100/90 text-teal-800 ring-teal-200/70',
  },
  contact: {
    card: 'border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/50 shadow-[0_4px_14px_-8px_rgba(14,165,233,0.4)]',
    accent: 'bg-gradient-to-b from-sky-400 to-blue-500',
    iconWrap: 'bg-sky-100 text-sky-700 ring-sky-200/80',
    title: 'text-sky-950',
    channel: 'bg-sky-100/90 text-sky-800 ring-sky-200/70',
  },
  package: {
    card: 'border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 shadow-[0_4px_14px_-8px_rgba(139,92,246,0.4)]',
    accent: 'bg-gradient-to-b from-violet-400 to-fuchsia-500',
    iconWrap: 'bg-violet-100 text-violet-700 ring-violet-200/80',
    title: 'text-violet-950',
    channel: 'bg-violet-100/90 text-violet-800 ring-violet-200/70',
  },
  cruise: {
    card: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/40 shadow-[0_4px_14px_-8px_rgba(99,102,241,0.4)]',
    accent: 'bg-gradient-to-b from-indigo-400 to-blue-600',
    iconWrap: 'bg-indigo-100 text-indigo-700 ring-indigo-200/80',
    title: 'text-indigo-950',
    channel: 'bg-indigo-100/90 text-indigo-800 ring-indigo-200/70',
  },
  flight: {
    card: 'border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/40 shadow-[0_4px_14px_-8px_rgba(6,182,212,0.4)]',
    accent: 'bg-gradient-to-b from-cyan-400 to-sky-500',
    iconWrap: 'bg-cyan-100 text-cyan-700 ring-cyan-200/80',
    title: 'text-cyan-950',
    channel: 'bg-cyan-100/90 text-cyan-800 ring-cyan-200/70',
  },
  honeymoon: {
    card: 'border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/40 shadow-[0_4px_14px_-8px_rgba(244,63,94,0.35)]',
    accent: 'bg-gradient-to-b from-rose-400 to-pink-500',
    iconWrap: 'bg-rose-100 text-rose-700 ring-rose-200/80',
    title: 'text-rose-950',
    channel: 'bg-rose-100/90 text-rose-800 ring-rose-200/70',
  },
  email: {
    card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 shadow-[0_4px_14px_-8px_rgba(245,158,11,0.35)]',
    accent: 'bg-gradient-to-b from-amber-400 to-orange-500',
    iconWrap: 'bg-amber-100 text-amber-700 ring-amber-200/80',
    title: 'text-amber-950',
    channel: 'bg-amber-100/90 text-amber-800 ring-amber-200/70',
  },
  manual: {
    card: 'border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/50 shadow-[0_4px_14px_-8px_rgba(100,116,139,0.25)]',
    accent: 'bg-gradient-to-b from-slate-400 to-slate-500',
    iconWrap: 'bg-slate-100 text-slate-600 ring-slate-200/80',
    title: 'text-slate-900',
    channel: 'bg-slate-100 text-slate-700 ring-slate-200/70',
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
