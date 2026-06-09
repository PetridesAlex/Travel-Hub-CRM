import {
  HOTEL_EXTRACT_KEYS,
  computeHotelQuoteFields,
  buildComparisonView,
  normalizeExtractedPrices,
} from '../../shared/hotelRateComparison.js'

export { computeHotelQuoteFields, buildComparisonView, normalizeExtractedPrices }

export const HOTEL_COMPARE_FIELD_KEYS = HOTEL_EXTRACT_KEYS

export function buildCompareHotelRatesInstructions() {
  const keyLines = HOTEL_EXTRACT_KEYS.map((key) => `- ${key}`).join('\n')

  return `You extract detailed hotel booking data from travel agency screenshots for rate comparison.

You will receive two groups of images:
1. SUPPLIER images — wholesale/B2B platforms (Hotelbeds, WebBeds, TBO, DMC portals) showing NET rates.
2. BOOKING images — public OTA pages (Booking.com, Expedia, hotel website) showing RETAIL/public rates.

Return ONLY a JSON object with these exact keys (use empty string if unknown):
${keyLines}

Extraction rules:
- hotel_name: full property name exactly as shown.
- destination: city, area, or country.
- check_in / check_out: dates as shown (e.g. "14 Jun 2026", "14/06/2026").
- nights: number of nights as a string (e.g. "5") — count from dates if shown.
- guest_details: e.g. "2 adults", "2 adults + 1 child".
- room_type: e.g. "Deluxe Double Sea View", "Standard Twin".
- room_details: extra room info (size, view, bed type).
- meal_plan: e.g. "Bed & Breakfast", "Half Board", "Room Only".
- breakfast_included: "Yes", "No", or brief note if visible.
- supplier_net_rate / booking_public_rate: human-readable TOTAL with currency symbol (e.g. "€3457.28").
- supplier_net_amount / booking_public_amount: TOTAL as plain number ONLY — digits and one decimal point, NO thousand separators (e.g. "3457.28"). This is the most important price field.
- supplier_price_per_night / booking_price_per_night: per-night with currency if visible.
- supplier_per_night_amount / booking_per_night_amount: per-night as plain number (e.g. "691.46").
- Read the price from the TOTAL / GRAND TOTAL line for the full stay — NOT reference numbers, booking IDs, points, or loyalty numbers.
- Double-check prices are realistic for a hotel stay (typically €50–€15,000 total). If unsure, leave amount fields empty rather than guessing.
- supplier_platform / booking_platform: platform name if visible.
- cancellation_policy, taxes_and_fees, star_rating, additional_notes: any visible terms.
- inclusions: brief summary of what is included.
- Match supplier and booking to the SAME room type and dates when possible.
- Use only visible information. Do not invent rates or dates.
- Preserve currencies exactly.
- Output raw JSON only, no markdown.`
}

export function buildCompareHotelRatesUserMessage(supplierCount, bookingCount) {
  return `Analyse ${supplierCount} supplier image(s) and ${bookingCount} booking image(s). Extract hotel name, check-in, check-out, nights, room type, breakfast/board, guests, total prices, per-night prices if shown, and all useful booking details. Return JSON with keys: ${HOTEL_EXTRACT_KEYS.join(', ')}.`
}

export function parseCompareHotelRatesJson(text) {
  if (!text?.trim()) return {}
  const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '')

  const tryParse = (raw) => {
    const data = JSON.parse(raw)
    const result = {}
    for (const key of HOTEL_EXTRACT_KEYS) {
      if (data[key] != null && String(data[key]).trim()) {
        result[key] = String(data[key]).trim()
      }
    }
    return result
  }

  try {
    return tryParse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try {
      return tryParse(match[0])
    } catch {
      return {}
    }
  }
}
