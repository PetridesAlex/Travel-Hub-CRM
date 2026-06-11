export const EMPTY_LEG = {
  label: 'Outbound',
  date: '',
  dayOfWeek: '',
  from: '',
  fromCode: '',
  to: '',
  toCode: '',
  departureTime: '',
  arrivalTime: '',
  flightNumber: '',
  airline: '',
  duration: '',
  stops: 'Direct',
}

export const EMPTY_FLIGHT_DATA = {
  tripType: 'Return',
  adults: 1,
  children: 0,
  infants: 0,
  legs: [],
  totalPrice: '',
  currency: 'EUR',
  fareName: '',
  inclusions: [],
  rawText: '',
}

// Common cities — OCR will match these reliably
const KNOWN_CITIES = [
  'Paphos', 'Athens', 'Larnaca', 'Limassol', 'Nicosia', 'Thessaloniki', 'Heraklion', 'Rhodes',
  'London', 'Paris', 'Rome', 'Milan', 'Barcelona', 'Madrid', 'Amsterdam', 'Berlin', 'Dubai',
  'Istanbul', 'Cairo', 'Tel Aviv', 'Budapest', 'Vienna', 'Prague', 'Manchester', 'Dublin',
  'Edinburgh', 'Frankfurt', 'Munich', 'Zurich', 'Geneva', 'Brussels', 'Copenhagen', 'Stockholm',
  'Oslo', 'Helsinki', 'Lisbon', 'Porto', 'Malta', 'Valletta', 'Corfu', 'Santorini', 'Mykonos',
  'Chania', 'Kos', 'Zakynthos', 'Split', 'Dubrovnik', 'Antalya', 'Bodrum', 'Marrakech',
]

// Valid IATA codes only — never show random OCR 3-letter garbage
const VALID_IATA = new Set([
  'PFO', 'ATH', 'LCA', 'SKG', 'HER', 'RHO', 'CFU', 'JMK', 'CHQ', 'KGS', 'JTR', 'JSI',
  'LHR', 'STN', 'LGW', 'LTN', 'MAN', 'DUB', 'EDI', 'CDG', 'ORY', 'FCO', 'MXP', 'BCN',
  'MAD', 'AMS', 'BER', 'MUC', 'FRA', 'DXB', 'IST', 'SAW', 'CAI', 'TLV', 'VIE', 'PRG',
  'BUD', 'CPH', 'ARN', 'OSL', 'HEL', 'LIS', 'OPO', 'MLA', 'BGY', 'CIA', 'TFS', 'PMI',
])

const IATA_TO_CITY = {
  PFO: 'Paphos', ATH: 'Athens', LCA: 'Larnaca', SKG: 'Thessaloniki', HER: 'Heraklion',
  RHO: 'Rhodes', CFU: 'Corfu', JMK: 'Mykonos', CHQ: 'Chania', LHR: 'London', STN: 'London',
  LGW: 'London', LTN: 'London', MAN: 'Manchester', DUB: 'Dublin', EDI: 'Edinburgh',
  CDG: 'Paris', ORY: 'Paris', FCO: 'Rome', MXP: 'Milan', BCN: 'Barcelona', MAD: 'Madrid',
  AMS: 'Amsterdam', BER: 'Berlin', MUC: 'Munich', FRA: 'Frankfurt', DXB: 'Dubai',
  IST: 'Istanbul', CAI: 'Cairo', TLV: 'Tel Aviv', VIE: 'Vienna', PRG: 'Prague', BUD: 'Budapest',
}

const UI_JUNK_WORDS = new Set([
  'update', 'relaunch', 'edit', 'login', 'sign', 'fees', 'review', 'pay', 'seats', 'bags',
  'extras', 'flights', 'selected', 'fare', 'saver', 'time', 'return', 'adult', 'adults',
  'your', 'the', 'and', 'for', 'from', 'with', 'click', 'upload', 'search', 'myryanair',
  'ryanair', 'portal', 'checkout', 'easily', 'companion', 'payment', 'manage', 'booking',
  'continue', 'next', 'back', 'home', 'menu', 'help', 'faq', 'edit search', 'jun', 'jul',
])

function cleanLines(rawText) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 1)
}

function isValidCityName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 35) return false
  if (/\.{2,}|…/.test(trimmed)) return false
  if (/^\d|[@#$%^&*()[\]{}|\\/<>]/.test(trimmed)) return false

  const lower = trimmed.toLowerCase()
  const words = lower.split(/\s+/)

  if (words.some((w) => UI_JUNK_WORDS.has(w))) return false
  if (words.some((w) => w.length <= 2 && !/^(st|de|la|le)$/i.test(w))) return false

  // Known city — always accept
  if (KNOWN_CITIES.some((c) => c.toLowerCase() === lower)) return true

  // Proper place name: 1-3 words, each starts with capital, mostly letters
  if (!/^[A-ZÀ-ÿ]/.test(trimmed)) return false
  if (!/^[A-Za-zÀ-ÿ\s'-]+$/.test(trimmed)) return false
  if (words.length > 3) return false
  if (!words.some((w) => w.length >= 4)) return false

  return true
}

function sanitizeCity(name) {
  return isValidCityName(name) ? name.trim() : ''
}

function sanitizeCode(code) {
  if (!code || typeof code !== 'string') return ''
  const upper = code.trim().toUpperCase()
  return VALID_IATA.has(upper) ? upper : ''
}

function findKnownCitiesInText(fullText) {
  const found = []
  for (const city of KNOWN_CITIES) {
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(fullText)) found.push(city)
  }
  return found
}

function citiesFromAirportCodes(fullText) {
  const codes = parseAirportCodes(fullText)
  return codes.map((code) => IATA_TO_CITY[code] || '').filter(Boolean)
}

function parseRoute(fullText, lines) {
  // 1. Best: find known cities in text (Ryanair header "Paphos ... Athens")
  const known = findKnownCitiesInText(fullText)
  if (known.length >= 2) {
    return { from: known[0], to: known[1] }
  }

  // 1b. Airport codes when city names are misread by OCR (e.g. PFO → ATH)
  const codeCities = citiesFromAirportCodes(fullText)
  if (codeCities.length >= 2) {
    return { from: codeCities[0], to: codeCities[1] }
  }
  if (known.length === 1 && codeCities.length === 1 && known[0] !== codeCities[0]) {
    return { from: known[0], to: codeCities[0] }
  }
  if (known.length === 1) {
    return { from: known[0], to: codeCities[0] && codeCities[0] !== known[0] ? codeCities[0] : '' }
  }
  if (codeCities.length === 1) {
    return { from: codeCities[0], to: '' }
  }

  // 2. "City to City" on a clean line
  for (const line of lines) {
    const toMatch = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,25}?)\s+(?:to|→)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,25})$/i)
    if (toMatch) {
      const from = toMatch[1].trim()
      const to = toMatch[2].trim()
      if (isValidCityName(from) && isValidCityName(to)) {
        return { from, to }
      }
    }
  }

  // 3. Line with plane symbol between cities
  const planeMatch = fullText.match(/([A-Za-zÀ-ÿ]{3,20})\s*[✈→–—]\s*([A-Za-zÀ-ÿ]{3,20})/)
  if (planeMatch) {
    const from = planeMatch[1].trim()
    const to = planeMatch[2].trim()
    if (isValidCityName(from) && isValidCityName(to)) {
      return { from, to }
    }
  }

  // 4. City names on their own lines (Ryanair: time above, city below)
  const cityLines = lines.filter((line) => {
    const t = line.trim()
    return /^[A-ZÀ-ÿ][a-zà-ÿ]+$/.test(t) && t.length >= 4 && t.length <= 20
      && KNOWN_CITIES.some((c) => c.toLowerCase() === t.toLowerCase())
  })
  if (cityLines.length >= 2) {
    return { from: cityLines[0], to: cityLines[1] }
  }

  return { from: '', to: '' }
}

function parseAirportCodes(fullText) {
  const matches = fullText.match(/\b([A-Z]{3})\b/g) || []
  return matches
    .map((c) => c.toUpperCase())
    .filter((c) => VALID_IATA.has(c))
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .slice(0, 4)
}

function parsePrice(fullText) {
  const matches = [...fullText.matchAll(/[€$£]\s?(\d+[.,]\d{2})|(\d+[.,]\d{2})\s?[€$£]/g)]
  if (!matches.length) return { price: '', currency: 'EUR' }
  const last = matches[matches.length - 1]
  const value = (last[1] || last[2] || '').replace(',', '.')
  let currency = 'EUR'
  if (fullText.includes('$') || fullText.includes('USD')) currency = 'USD'
  if (fullText.includes('£') || fullText.includes('GBP')) currency = 'GBP'
  return { price: value, currency }
}

const MONTH_NAMES = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
}

const MONTH_PATTERN = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
const WEEKDAY_PATTERN = 'Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'

const WEEKDAY_WITH_DATE = new RegExp(
  `\\b(${WEEKDAY_PATTERN})[a-z]*,?\\s+(\\d{1,2})\\s+(${MONTH_PATTERN})[a-z]*\\.?(?:\\s+(\\d{4}))?\\b`,
  'gi',
)

// (?<![:\d]) avoids matching ":00 Jun" from times like "21:00 Jun"
const DAY_MONTH_ONLY = new RegExp(
  `(?<![:\\d])(\\d{1,2})\\s+(${MONTH_PATTERN})[a-z]*\\.?(?:\\s+(\\d{4}))?\\b`,
  'gi',
)

const GLUED_DAY_MONTH = new RegExp(
  `(?<![:\\d])(\\d{1,2})(${MONTH_PATTERN})\\b`,
  'gi',
)

const MONTH_DAY = new RegExp(
  `\\b(${MONTH_PATTERN})[a-z]*\\.?\\s+(\\d{1,2})(?!:)\\b`,
  'gi',
)

const DATE_RANGE = new RegExp(
  `(?<![:\\d])(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})[a-z]*`,
  'gi',
)

const NUMERIC_DATE = /(?<![:\d/])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)/g

function isValidCalendarDay(dayNum) {
  return Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31
}

function isValidMonthNum(monthNum) {
  return Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12
}

function monthNumToName(monthNum) {
  return Object.values(MONTH_NAMES)[monthNum - 1] || ''
}

function normalizeMonth(raw) {
  const key = raw.toLowerCase().replace(/\.$/, '').slice(0, 3)
  return MONTH_NAMES[key] || raw.charAt(0).toUpperCase() + raw.slice(1, 3).toLowerCase()
}

function capitalizeWeekday(raw) {
  if (!raw) return ''
  const short = raw.slice(0, 3).toLowerCase()
  return short.charAt(0).toUpperCase() + short.slice(1)
}

function buildDateString(dayNum, monthRaw, yearRaw) {
  const month = normalizeMonth(monthRaw)
  if (yearRaw) return `${dayNum} ${month} ${yearRaw}`
  return `${dayNum} ${month}`
}

function makeDateEntry(dayOfWeek, dayNum, monthRaw, yearRaw) {
  if (!isValidCalendarDay(dayNum)) return null
  const date = buildDateString(dayNum, monthRaw, yearRaw)
  return {
    dayOfWeek: capitalizeWeekday(dayOfWeek),
    date,
    key: `${dayOfWeek || ''}|${date}`.toLowerCase(),
  }
}

function makeDateFromNumeric(dayNum, monthNum, yearRaw) {
  if (!isValidCalendarDay(dayNum) || !isValidMonthNum(monthNum)) return null
  const month = monthNumToName(monthNum)
  if (!month) return null
  const year = yearRaw
    ? (yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
    : ''
  return makeDateEntry('', dayNum, month, year)
}

function addDateResult(results, seen, entry) {
  if (!entry || seen.has(entry.key)) return
  seen.add(entry.key)
  results.push({ dayOfWeek: entry.dayOfWeek, date: entry.date })
}

function parseDatesFromSingleLine(line) {
  const results = []
  const seen = new Set()

  const addWithPosition = (entry, matchIndex = 0) => {
    if (!entry) return
    const key = `${entry.key}|${matchIndex}`
    if (seen.has(key)) return
    seen.add(key)
    results.push({ ...entry, charIndex: matchIndex })
  }

  for (const match of line.matchAll(WEEKDAY_WITH_DATE)) {
    addWithPosition(makeDateEntry(match[1], parseInt(match[2], 10), match[3], match[4]), match.index)
  }

  for (const match of line.matchAll(DATE_RANGE)) {
    addWithPosition(makeDateEntry('', parseInt(match[1], 10), match[3], ''), match.index)
    addWithPosition(makeDateEntry('', parseInt(match[2], 10), match[3], ''), match.index)
  }

  for (const match of line.matchAll(DAY_MONTH_ONLY)) {
    addWithPosition(makeDateEntry('', parseInt(match[1], 10), match[2], match[3]), match.index)
  }

  for (const match of line.matchAll(GLUED_DAY_MONTH)) {
    addWithPosition(makeDateEntry('', parseInt(match[1], 10), match[2], ''), match.index)
  }

  for (const match of line.matchAll(MONTH_DAY)) {
    addWithPosition(makeDateEntry('', parseInt(match[2], 10), match[1], ''), match.index)
  }

  for (const match of line.matchAll(NUMERIC_DATE)) {
    addWithPosition(makeDateFromNumeric(parseInt(match[1], 10), parseInt(match[2], 10), match[3]), match.index)
  }

  return results
}

function parseDatesFromLines(lines) {
  const results = []
  const seen = new Set()

  for (const line of lines) {
    if (/^\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/.test(line)) continue
    for (const entry of parseDatesFromSingleLine(line)) {
      addDateResult(results, seen, entry)
    }
  }

  return results
}

function parseDatesFromFullText(fullText) {
  const results = []
  const seen = new Set()

  for (const entry of parseDatesFromSingleLine(fullText)) {
    addDateResult(results, seen, entry)
  }

  return results
}

function parseDatesWithDay(fullText, lines) {
  const fromLines = parseDatesFromLines(lines)
  if (fromLines.length) return fromLines
  return parseDatesFromFullText(fullText)
}

function collectLineDates(lines) {
  const results = []
  lines.forEach((line, lineIndex) => {
    if (/^\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/.test(line)) return
    parseDatesFromSingleLine(line).forEach((entry) => {
      results.push({ ...entry, lineIndex })
    })
  })
  return results
}

function getOrderedUniqueDates(lines) {
  const lineDates = collectLineDates(lines)
  lineDates.sort((a, b) => a.lineIndex - b.lineIndex || a.charIndex - b.charIndex)

  const unique = []
  const seen = new Set()
  for (const entry of lineDates) {
    if (!seen.has(entry.date)) {
      seen.add(entry.date)
      unique.push(entry)
    }
  }
  return unique
}

function detectSectionLine(line) {
  const trimmed = line.trim()
  if (/^outbound\b/i.test(trimmed) && !/\bto\b/i.test(trimmed)) return 'outbound'
  if (/^(return|inbound)\b/i.test(trimmed) && !/\bto\b/i.test(trimmed) && !/\d{1,2}[./]\d{1,2}/.test(trimmed)) {
    return 'inbound'
  }
  if (/^outbound\s*$/i.test(trimmed)) return 'outbound'
  if (/^(return|inbound)\s*$/i.test(trimmed)) return 'inbound'
  return null
}

function assignDatesBySections(lines, legs) {
  const sectionDates = { outbound: null, inbound: null }
  let current = null

  for (const line of lines) {
    const section = detectSectionLine(line)
    if (section) {
      current = section
      continue
    }

    if (!current) continue
    const found = parseDatesFromSingleLine(line)
    if (found.length) sectionDates[current] = found[0]
  }

  return legs.map((leg) => {
    const isInbound = /inbound|return/i.test(leg.label || '')
    const sectionDate = isInbound ? sectionDates.inbound : sectionDates.outbound
    if (!sectionDate) return leg
    return sanitizeLeg({ ...leg, date: sectionDate.date, dayOfWeek: sectionDate.dayOfWeek })
  })
}

function assignDatesByLegOrder(legs, orderedDates) {
  let dateIdx = 0
  const used = new Set()

  return legs.map((leg) => {
    if (leg.date) {
      used.add(leg.date)
      return leg
    }
    if (!leg.departureTime && !leg.arrivalTime) return leg

    while (dateIdx < orderedDates.length && used.has(orderedDates[dateIdx].date)) {
      dateIdx++
    }
    if (dateIdx >= orderedDates.length) return leg

    const next = orderedDates[dateIdx++]
    used.add(next.date)
    return sanitizeLeg({ ...leg, date: next.date, dayOfWeek: next.dayOfWeek })
  })
}

function postProcessLegDates(legs, fullText, lines) {
  const orderedDates = getOrderedUniqueDates(lines)
  if (!orderedDates.length) return legs.map(sanitizeLeg)

  let result = legs.map((leg) => sanitizeLeg({ ...leg, date: '', dayOfWeek: '' }))
  result = assignDatesBySections(lines, result)
  result = assignDatesByLegOrder(result, orderedDates)
  return result.map(sanitizeLeg)
}

function sanitizeDateFields(dayOfWeek, date) {
  if (!date?.trim()) return { dayOfWeek: '', date: '' }

  const combined = [dayOfWeek, date].filter(Boolean).join(' ').trim()
  const weekdayMatch = combined.match(
    new RegExp(`^(${WEEKDAY_PATTERN})[a-z]*,?\\s+(\\d{1,2})\\s+(${MONTH_PATTERN})[a-z]*(?:\\s+(\\d{4}))?$`, 'i'),
  )
  if (weekdayMatch) {
    const entry = makeDateEntry(weekdayMatch[1], parseInt(weekdayMatch[2], 10), weekdayMatch[3], weekdayMatch[4])
    return entry ? { dayOfWeek: entry.dayOfWeek, date: entry.date } : { dayOfWeek: '', date: '' }
  }

  const plainMatch = combined.match(new RegExp(`^(\\d{1,2})\\s+(${MONTH_PATTERN})[a-z]*(?:\\s+(\\d{4}))?$`, 'i'))
  if (plainMatch) {
    const entry = makeDateEntry('', parseInt(plainMatch[1], 10), plainMatch[2], plainMatch[3])
    return entry ? { dayOfWeek: '', date: entry.date } : { dayOfWeek: '', date: '' }
  }

  const gluedMatch = combined.match(new RegExp(`^(\\d{1,2})(${MONTH_PATTERN})$`, 'i'))
  if (gluedMatch) {
    const entry = makeDateEntry('', parseInt(gluedMatch[1], 10), gluedMatch[2], '')
    return entry ? { dayOfWeek: '', date: entry.date } : { dayOfWeek: '', date: '' }
  }

  const numericMatch = combined.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (numericMatch) {
    const entry = makeDateFromNumeric(parseInt(numericMatch[1], 10), parseInt(numericMatch[2], 10), numericMatch[3])
    return entry ? { dayOfWeek: '', date: entry.date } : { dayOfWeek: '', date: '' }
  }

  return { dayOfWeek: '', date: '' }
}

function parsePassengers(fullText) {
  const adults = fullText.match(/(\d+)\s*Adults?/i)
  const children = fullText.match(/(\d+)\s*Child(?:ren)?/i)
  const infants = fullText.match(/(\d+)\s*Infants?/i)
  return {
    adults: adults ? parseInt(adults[1], 10) : fullText.match(/\d+\s*Adult/i) ? 1 : 1,
    children: children ? parseInt(children[1], 10) : 0,
    infants: infants ? parseInt(infants[1], 10) : 0,
  }
}

function parseAirline(fullText) {
  const airlines = ['Ryanair', 'easyJet', 'Wizz Air', 'Emirates', 'Lufthansa', 'British Airways', 'Aegean', 'Cyprus Airways', 'Jet2', 'TUI']
  return airlines.find((name) => fullText.toLowerCase().includes(name.toLowerCase())) || ''
}

function parseStops(fullText) {
  if (/\bDirect\b/i.test(fullText)) return 'Direct'
  const stopMatch = fullText.match(/(\d+)\s*stop/i)
  if (stopMatch) return `${stopMatch[1]} stop${stopMatch[1] === '1' ? '' : 's'}`
  const viaMatch = fullText.match(/(?:via|layover in)\s+([A-Za-z\s]{3,25})/i)
  if (viaMatch && isValidCityName(viaMatch[1].trim())) {
    return `Layover in ${viaMatch[1].trim()}`
  }
  return 'Direct'
}

function normalizeInclusionText(text) {
  return text
    .replace(/^[•·✓✔☑\-–—]\s*/, '')
    .replace(/[€$£]\s?\d+[.,]?\d*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isOcrGarbage(text) {
  if (!text) return true
  if (/[©®™@#]/.test(text)) return true
  if (/\b(review\s*&?\s*pay|checkout|continue|edit search|select flight|login|sign in|myryanair)\b/i.test(text)) return true
  if (/\d+\s+bags?\s+\d+/i.test(text)) return true
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(text)) return true

  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
  if (!words.length) return true

  let badWords = 0
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '')
    if (!clean || clean.length < 3) continue
    const vowels = (clean.match(/[aeiou]/g) || []).length
    if (clean.length >= 5 && vowels / clean.length < 0.2) badWords++
    if (/^(exes|frstoff|uptontseats|fights|gg|v|pay|bags)$/i.test(clean)) badWords++
  }

  return badWords >= 1 && badWords / words.length >= 0.3
}

function isInclusionCandidate(line) {
  const text = normalizeInclusionText(line)
  if (!text || text.length < 8 || text.length > 55) return false
  if (isOcrGarbage(text)) return false
  if (/^\d{1,2}:\d{2}/.test(text)) return false
  if (/[€$£]|\b\d+[.,]\d{2}\b|\btotal\b|\bcontinue\b|\bpay\b|\bcheckout\b|\bedit search\b/i.test(text)) return false
  if (/^(mon|tue|wed|thu|fri|sat|sun)\b/i.test(text)) return false
  if (UI_JUNK_WORDS.has(text.toLowerCase())) return false

  const lower = text.toLowerCase()
  const strongPatterns = [
    /priority boarding/i,
    /be (?:the )?first on (?:and )?off the plane/i,
    /\d+\s*kg\s*(?:check-in|checked|cabin|carry-on|carry on)?\s*bag/i,
    /(?:small|large|cabin|checked|check-in|carry-on|carry on|personal)\s+bag/i,
    /free seat selection/i,
    /(?:fast track|fasttrack|fast-track)/i,
    /queue jump/i,
    /flexible ticket/i,
    /online check-in/i,
    /(?:\d+|two)\s+cabin bags?/i,
  ]

  return strongPatterns.some((pattern) => pattern.test(lower))
}

function parseInclusions(fullText, lines) {
  const inclusions = []
  const seen = new Set()
  const fareMatch = fullText.match(/\b(TIME SAVER|BASIC|PLUS|FLEX|REGULAR|ECONOMY|BUSINESS|PREMIUM|STANDARD|LIGHT|SAVER|VALUE)\b/i)

  const inclusionPatterns = [
    /be the first on and off the plane/i,
    /priority boarding(?:\s*&\s*\d+\s*cabin bags?)?/i,
    /(?:\d+\s*x?\s*)?\d+\s*kg\s*(?:check-in|checked|cabin|carry-on|carry on)?\s*bag/i,
    /\d+kg\s*(?:check-in|checked|cabin)?\s*bag/i,
    /(?:small|large|cabin|checked|check-in|carry-on|carry on|personal)\s+bag/i,
    /\d+\s*(?:cabin|checked)\s+bags?/i,
    /free seat selection/i,
    /(?:free|standard|reserved)\s+seat(?:\s+selection)?/i,
    /flexible ticket/i,
    /travel insurance/i,
    /meal included/i,
    /(?:fast track|fasttrack|fast-track)/i,
    /queue jump/i,
    /online check-in/i,
    /airport check-in/i,
    /(?:2|two)\s+cabin bags?/i,
  ]

  function addInclusion(raw) {
    const text = normalizeInclusionText(raw)
    if (!text || text.length < 8 || text.length > 55) return
    if (isOcrGarbage(text)) return
    if (/[€$£]|\b\d+[.,]\d{2}\b/.test(text)) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    if ([...seen].some((existing) => existing.includes(key) || key.includes(existing))) return
    seen.add(key)
    inclusions.push(text.charAt(0).toUpperCase() + text.slice(1))
  }

  for (const pattern of inclusionPatterns) {
    const match = fullText.match(pattern)
    if (match) addInclusion(match[0])
  }

  let inInclusionSection = false
  for (const line of lines) {
    if (/what'?s included|included in (?:this|your) fare|your bundle|fare includes|bundle includes/i.test(line)) {
      inInclusionSection = true
      continue
    }

    if (inInclusionSection && /^(total|price|€|continue|pay|select flight|checkout)/i.test(line)) {
      inInclusionSection = false
    }

    const bulletParts = line.split(/[•·✓✔☑]/).map((part) => part.trim()).filter(Boolean)
    const candidates = bulletParts.length > 1 ? bulletParts : [line]

    for (const candidate of candidates) {
      if (inInclusionSection || isInclusionCandidate(candidate)) {
        for (const pattern of inclusionPatterns) {
          const match = candidate.match(pattern)
          if (match) addInclusion(match[0])
        }
        if (isInclusionCandidate(candidate)) {
          addInclusion(candidate)
        }
      }
    }
  }

  if (fareMatch && /TIME SAVER/i.test(fareMatch[1]) && !inclusions.some((i) => /priority|first on/i.test(i))) {
    inclusions.unshift('Priority boarding — be first on and off the plane')
  }

  return { fareName: fareMatch?.[1] || '', inclusions }
}

function parseFlightNumbers(fullText) {
  return [...new Set(fullText.match(/\b[A-Z]{2}\s?\d{2,4}\b/g) || [])].slice(0, 4)
}

function sanitizeLeg(leg) {
  const { dayOfWeek, date } = sanitizeDateFields(leg.dayOfWeek, leg.date)
  return {
    ...leg,
    from: sanitizeCity(leg.from),
    to: sanitizeCity(leg.to),
    fromCode: sanitizeCode(leg.fromCode),
    toCode: sanitizeCode(leg.toCode),
    dayOfWeek,
    date,
  }
}

function assignReturnLegTimes(times) {
  const outbound = { departureTime: '', arrivalTime: '' }
  const inbound = { departureTime: '', arrivalTime: '' }

  if (times.length >= 4) {
    outbound.departureTime = times[0]
    outbound.arrivalTime = times[1]
    inbound.departureTime = times[2]
    inbound.arrivalTime = times[3]
  } else if (times.length === 3) {
    outbound.departureTime = times[0]
    outbound.arrivalTime = times[1]
    inbound.departureTime = times[2]
  } else if (times.length === 2) {
    outbound.departureTime = times[0]
    inbound.departureTime = times[1]
  } else if (times.length === 1) {
    outbound.departureTime = times[0]
  }

  return { outbound, inbound }
}

export function parseFlightScreenshot(rawText) {
  if (!rawText?.trim()) return { ...EMPTY_FLIGHT_DATA, legs: [] }

  const lines = cleanLines(rawText)
  const fullText = lines.join(' ')
  const route = parseRoute(fullText, lines)
  const times = fullText.match(/\b\d{1,2}:\d{2}\b/g) || []
  const flightNumbers = parseFlightNumbers(fullText)
  const durations = fullText.match(/\d+\s*h(?:our)?s?\s*\d*\s*m(?:in)?|\d+\s*h\s*\d+\s*m|\d+h\s*\d+m/gi) || []
  const { price, currency } = parsePrice(fullText)
  const passengers = parsePassengers(fullText)
  const { fareName, inclusions } = parseInclusions(fullText, lines)
  const airline = parseAirline(fullText)
  const codes = parseAirportCodes(fullText)

  const tripType = /return/i.test(fullText) ? 'Return' : /one[\s-]?way/i.test(fullText) ? 'One Way' : 'Return'
  const returnTimes = tripType === 'Return' ? assignReturnLegTimes(times) : null

  const outbound = sanitizeLeg({
    ...EMPTY_LEG,
    label: 'Outbound',
    date: '',
    dayOfWeek: '',
    from: route.from,
    fromCode: codes[0] || '',
    to: route.to,
    toCode: codes[1] || '',
    departureTime: returnTimes?.outbound.departureTime || times[0] || '',
    arrivalTime: returnTimes?.outbound.arrivalTime || times[1] || '',
    flightNumber: flightNumbers[0] || '',
    duration: durations[0] || '',
    airline,
    stops: parseStops(fullText),
  })

  const legs = [outbound]

  if (tripType === 'Return') {
    legs.push(sanitizeLeg({
      ...EMPTY_LEG,
      label: 'Inbound',
      date: '',
      dayOfWeek: '',
      from: route.to || outbound.to,
      fromCode: codes[1] || outbound.toCode || '',
      to: route.from || outbound.from,
      toCode: codes[0] || outbound.fromCode || '',
      departureTime: returnTimes?.inbound.departureTime || times[2] || '',
      arrivalTime: returnTimes?.inbound.arrivalTime || times[3] || '',
      flightNumber: flightNumbers[1] || '',
      duration: durations[1] || '',
      airline,
      stops: parseStops(fullText),
    }))
  }

  const processedLegs = postProcessLegDates(legs, fullText, lines)

  return {
    tripType,
    adults: passengers.adults,
    children: passengers.children,
    infants: passengers.infants,
    legs: processedLegs,
    totalPrice: price,
    currency,
    fareName,
    inclusions,
    rawText: lines.join('\n'),
  }
}

function mergeLeg(base, incoming, fallbackLabel) {
  const merged = {
    ...EMPTY_LEG,
    ...base,
    label: base?.label || incoming?.label || fallbackLabel,
  }

  const fields = [
    'date', 'dayOfWeek', 'from', 'fromCode', 'to', 'toCode',
    'departureTime', 'arrivalTime', 'flightNumber', 'airline', 'duration', 'stops',
  ]

  for (const field of fields) {
    const baseVal = merged[field]
    const incomingVal = incoming?.[field]
    if (!incomingVal) continue
    if (!baseVal) {
      merged[field] = incomingVal
    } else if (field === 'stops' && baseVal === 'Direct' && incomingVal !== 'Direct') {
      merged[field] = incomingVal
    }
  }

  return sanitizeLeg(merged)
}

function legHasSchedule(leg) {
  return Boolean(leg?.departureTime || leg?.arrivalTime || leg?.date)
}

function mergeLegs(baseLegs = [], incomingLegs = []) {
  if (!incomingLegs.length) return baseLegs
  if (!baseLegs.length) return incomingLegs.map(sanitizeLeg)

  const labels = ['Outbound', 'Inbound']
  const result = [...baseLegs.map(sanitizeLeg)]
  const incoming = incomingLegs.map(sanitizeLeg)

  for (let i = 0; i < incoming.length; i++) {
    result[i] = mergeLeg(
      result[i] || { ...EMPTY_LEG, label: labels[i] || `Leg ${i + 1}` },
      incoming[i],
      labels[i] || `Leg ${i + 1}`,
    )
  }

  // Return-leg screenshot often parses as outbound — move it to inbound when outbound is already set.
  if (result.length >= 2 && legHasSchedule(incoming[0]) && !legHasSchedule(result[1]) && legHasSchedule(result[0])) {
    const sameSchedule =
      result[0].date === incoming[0].date &&
      result[0].departureTime === incoming[0].departureTime &&
      result[0].arrivalTime === incoming[0].arrivalTime

    if (!sameSchedule) {
      result[1] = mergeLeg(result[1], incoming[0], 'Inbound')
    }
  }

  return result
}

function pickField(baseVal, incomingVal) {
  return baseVal || incomingVal || ''
}

export function mergeFlightScreenshotData(base, incoming) {
  if (!base?.legs?.length) return incoming
  if (!incoming?.legs?.length) {
    return mergeInclusionsFromText(base, incoming.rawText || '')
  }

  const merged = {
    tripType: base.tripType || incoming.tripType,
    adults: base.adults || incoming.adults,
    children: base.children || incoming.children,
    infants: base.infants || incoming.infants,
    legs: mergeLegs(base.legs, incoming.legs),
    totalPrice: pickField(base.totalPrice, incoming.totalPrice),
    currency: pickField(base.currency, incoming.currency),
    fareName: pickField(base.fareName, incoming.fareName),
    inclusions: [...new Set([...(base.inclusions || []), ...(incoming.inclusions || [])])],
    rawText: [base.rawText, incoming.rawText].filter(Boolean).join('\n---\n'),
  }

  const lines = cleanLines(merged.rawText.replace(/\n---\n/g, '\n'))
  merged.legs = postProcessLegDates(merged.legs, lines.join(' '), lines)
  return merged
}

export function mergeParsedFlightScreenshots(parsedList) {
  return parsedList.reduce((acc, parsed) => {
    if (!parsed) return acc
    return acc ? mergeFlightScreenshotData(acc, parsed) : parsed
  }, null)
}

export function mergeInclusionsFromText(flightData, rawText) {
  if (!rawText?.trim()) return flightData
  const lines = cleanLines(rawText)
  const fullText = lines.join(' ')
  const { fareName, inclusions } = parseInclusions(fullText, lines)
  const { price, currency } = parsePrice(fullText)

  return {
    ...flightData,
    fareName: fareName || flightData.fareName,
    totalPrice: flightData.totalPrice || price,
    currency: flightData.currency || currency,
    inclusions: [...new Set([...(flightData.inclusions || []), ...inclusions])],
  }
}

export function buildRouteLabel(flightData) {
  if (!flightData?.legs?.length) return ''

  const outbound = flightData.legs[0]
  const from = sanitizeCity(outbound.from) || sanitizeCode(outbound.fromCode)
  const to = sanitizeCity(outbound.to) || sanitizeCode(outbound.toCode)

  if (!from && !to) return ''
  if (from && to) {
    return flightData.tripType === 'Return' ? `${from} ↔ ${to}` : `${from} → ${to}`
  }
  return from || to
}

export function formatPassengerSummary(flightData) {
  const parts = []
  if (flightData.adults) parts.push(`${flightData.adults} Adult${flightData.adults !== 1 ? 's' : ''}`)
  if (flightData.children) parts.push(`${flightData.children} Child${flightData.children !== 1 ? 'ren' : ''}`)
  if (flightData.infants) parts.push(`${flightData.infants} Infant${flightData.infants !== 1 ? 's' : ''}`)
  return parts.join(', ') || '1 Adult'
}

export function formatCityWithCode(city, code) {
  const validCity = sanitizeCity(city)
  const validCode = sanitizeCode(code)
  if (validCity && validCode) return `${validCity} (${validCode})`
  if (validCity) return validCity
  if (validCode) return validCode
  return '—'
}

export function formatLegDate(leg) {
  const { dayOfWeek, date } = sanitizeDateFields(leg?.dayOfWeek, leg?.date)
  if (dayOfWeek && date) return `${dayOfWeek}, ${date}`
  return date || '—'
}
