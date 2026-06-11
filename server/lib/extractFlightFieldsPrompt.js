export const FLIGHT_FIELD_KEYS = [
  'route',
  'travel_dates',
  'outbound_details',
  'return_details',
  'inclusions',
  'price',
]

export const EXTRACT_FLIGHT_INSTRUCTIONS = `You extract flight booking details from airline website screenshots (Ryanair, easyJet, etc.) for a travel agency CRM.

Return ONLY a JSON object with these exact keys (use empty string if unknown):
- route: e.g. "Paphos – Athens – Paphos"
- travel_dates: outbound to return date range
- outbound_details: multi-line text with date, flight number, times, airports, duration
- return_details: same format for return leg if visible
- inclusions: fare inclusions, bags, seats, bundle name (bullet lines ok)
- price: total price with currency symbol e.g. "€258.74"

Rules:
- Use only information visible in the images.
- Do not invent data.
- Preserve currencies and flight numbers exactly.
- If multiple images, merge outbound/return/fare info correctly.
- Output raw JSON only, no markdown.`

export function buildExtractFlightUserMessage(imageCount) {
  return `Analyse ${imageCount} flight screenshot(s) and return the JSON object with route, travel_dates, outbound_details, return_details, inclusions, and price.`
}

export function parseFlightFieldsJson(text) {
  if (!text?.trim()) return {}
  const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '')
  try {
    const data = JSON.parse(cleaned)
    const result = {}
    for (const key of FLIGHT_FIELD_KEYS) {
      if (data[key] != null && String(data[key]).trim()) {
        result[key] = String(data[key]).trim()
      }
    }
    return result
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      const data = JSON.parse(match[0])
      const result = {}
      for (const key of FLIGHT_FIELD_KEYS) {
        if (data[key] != null && String(data[key]).trim()) {
          result[key] = String(data[key]).trim()
        }
      }
      return result
    } catch {
      return {}
    }
  }
}
