import {
  buildRouteLabel,
  formatCityWithCode,
  formatLegDate,
  mergeParsedFlightScreenshots,
} from './parseFlightScreenshot'

function formatLegForTemplate(leg) {
  if (!leg) return ''
  const lines = []
  const date = formatLegDate(leg)
  if (date && date !== '—') lines.push(date)
  if (leg.departureTime || leg.arrivalTime) {
    lines.push(`Depart ${leg.departureTime || '—'} from ${formatCityWithCode(leg.from, leg.fromCode)}`)
    lines.push(`Arrive ${leg.arrivalTime || '—'} at ${formatCityWithCode(leg.to, leg.toCode)}`)
  }
  if (leg.flightNumber) {
    lines.push(`Flight ${leg.flightNumber}${leg.airline ? ` (${leg.airline})` : ''}`)
  }
  if (leg.duration) lines.push(`Duration: ${leg.duration}`)
  if (leg.stops && leg.stops !== 'Direct') lines.push(`Stops: ${leg.stops}`)
  return lines.join('\n')
}

function buildTravelDates(flightData) {
  const legs = flightData?.legs || []
  const outbound = legs[0]
  const inbound = legs[1]
  const outDate = formatLegDate(outbound)
  const inDate = formatLegDate(inbound)
  const out = outDate !== '—' ? outDate : ''
  const inn = inDate !== '—' ? inDate : ''
  if (out && inn) return `${out} – ${inn}`
  return out || inn || ''
}

function formatPriceField(flightData) {
  if (!flightData?.totalPrice) return ''
  const sym = { EUR: '€', USD: '$', GBP: '£' }[flightData.currency] || ''
  return sym ? `${sym}${flightData.totalPrice}` : `${flightData.totalPrice} ${flightData.currency || ''}`.trim()
}

export function flightDataToTemplateInput(flightData) {
  if (!flightData?.legs?.length) return {}

  const outbound = flightData.legs.find((l) => /outbound/i.test(l.label)) || flightData.legs[0]
  const inbound = flightData.legs.find((l) => /inbound|return/i.test(l.label)) || flightData.legs[1]

  const inclusions = [
    ...(flightData.inclusions || []),
    flightData.fareName ? `Fare: ${flightData.fareName}` : '',
  ].filter(Boolean)

  return {
    route: buildRouteLabel(flightData),
    travel_dates: buildTravelDates(flightData),
    outbound_details: formatLegForTemplate(outbound),
    return_details: formatLegForTemplate(inbound),
    inclusions: inclusions.join('\n'),
    price: formatPriceField(flightData),
  }
}

export function mergeTemplateInputData(existing = {}, extracted = {}) {
  const result = { ...existing }
  for (const [key, value] of Object.entries(extracted)) {
    if (typeof value === 'string' && value.trim()) {
      result[key] = value.trim()
    }
  }
  return result
}

export function parsedScreenshotsToFlightInput(parsedList) {
  const merged = mergeParsedFlightScreenshots(parsedList.filter(Boolean))
  if (!merged) return {}
  return flightDataToTemplateInput(merged)
}
