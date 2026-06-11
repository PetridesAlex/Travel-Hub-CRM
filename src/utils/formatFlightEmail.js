import { formatCityWithCode, formatLegDate, formatPassengerSummary } from './parseFlightScreenshot'

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━'

function formatPrice(amount, currency) {
  if (!amount) return ''
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : ''
  return sym ? `${sym}${amount}` : `${amount} ${currency}`
}

function formatLegBlock(leg) {
  const label = (leg.label || 'Flight').toUpperCase()
  const formattedDate = formatLegDate(leg)
  const dateLine = formattedDate === '—' ? 'Date TBC' : formattedDate

  const lines = [
    DIVIDER,
    `${label} — ${dateLine}`,
    DIVIDER,
    `Depart:  ${leg.departureTime || '—'}  from  ${formatCityWithCode(leg.from, leg.fromCode)}`,
    `Arrive:  ${leg.arrivalTime || '—'}  at    ${formatCityWithCode(leg.to, leg.toCode)}`,
    '',
    `Flight:   ${leg.flightNumber || '—'}${leg.airline ? `  ·  ${leg.airline}` : ''}`,
    `Duration: ${leg.duration || '—'}`,
    `Stops:    ${leg.stops || 'Direct'}`,
  ]

  return lines.join('\n')
}

export function formatFlightDataForEmail(flightData) {
  if (!flightData?.legs?.length) return ''

  const route = flightData.legs[0]
  const routeLabel = route.from && route.to
    ? (flightData.tripType === 'Return' ? `${route.from} ↔ ${route.to}` : `${route.from} → ${route.to}`)
    : ''

  const header = [
    'FLIGHT QUOTATION',
    `${routeLabel}  ·  ${flightData.tripType || 'Return'}  ·  ${formatPassengerSummary(flightData)}`,
    '',
    flightData.totalPrice ? `TOTAL PRICE: ${formatPrice(flightData.totalPrice, flightData.currency)}` : null,
    flightData.fareName ? `Fare: ${flightData.fareName}` : null,
  ].filter(Boolean)

  const legBlocks = flightData.legs.map(formatLegBlock)

  return [...header, '', ...legBlocks].join('\n')
}

export function formatLegSummary(leg) {
  const datePart = leg.dayOfWeek ? `${leg.dayOfWeek}, ${leg.date}` : leg.date
  const route = leg.from && leg.to ? `${leg.from} → ${leg.to}` : ''
  const time = leg.departureTime && leg.arrivalTime
    ? `${leg.departureTime}–${leg.arrivalTime}`
    : leg.departureTime || ''
  const parts = [datePart, route, time, leg.flightNumber, leg.duration, leg.stops !== 'Direct' ? leg.stops : null].filter(Boolean)
  return parts.join(' · ')
}

export function formatFlightSummaryPrice(flightData, priceOverride) {
  const price = priceOverride || flightData.totalPrice
  if (!price) return ''
  return `${formatPrice(price, flightData.currency)}${flightData.fareName ? ` · ${flightData.fareName}` : ''}`
}
