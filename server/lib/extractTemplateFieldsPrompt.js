/** Field keys per template category — mirrors src/constants/aiTemplateFields.js */
export const CATEGORY_FIELD_SCHEMAS = {
  flight_offer: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'route', label: 'Route' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'outbound_details', label: 'Outbound Flight details' },
    { key: 'return_details', label: 'Return Flight details' },
    { key: 'inclusions', label: 'Fare Inclusions' },
    { key: 'price', label: 'Price' },
  ],
  cruise_offer: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'cruise_line', label: 'Cruise Line' },
    { key: 'ship_name', label: 'Ship' },
    { key: 'departure_date', label: 'Departure Date' },
    { key: 'duration', label: 'Duration' },
    { key: 'departure_port', label: 'Departure Port' },
    { key: 'passengers', label: 'Passengers' },
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'cabin_category', label: 'Cabin Category' },
    { key: 'cabin_type', label: 'Cabin Type' },
    { key: 'price_includes', label: 'Price Includes' },
    { key: 'price_excludes', label: 'Price Excludes' },
    { key: 'price', label: 'Total Price' },
    { key: 'price_per_person', label: 'Price Per Person' },
  ],
  hotel_client_quote: [
    { key: 'hotel_name', label: 'Hotel Name' },
    { key: 'destination', label: 'Destination' },
    { key: 'check_in', label: 'Check-in' },
    { key: 'check_out', label: 'Check-out' },
    { key: 'nights', label: 'Nights' },
    { key: 'guest_details', label: 'Guests' },
    { key: 'room_type', label: 'Room Type' },
    { key: 'meal_plan', label: 'Meal Plan' },
    { key: 'breakfast_included', label: 'Breakfast Included' },
    { key: 'supplier_net_rate', label: 'Supplier Total' },
    { key: 'booking_public_rate', label: 'Booking Total' },
    { key: 'inclusions', label: 'Inclusions' },
  ],
  hotel_request: [
    { key: 'supplier_name', label: 'Supplier Name' },
    { key: 'destination_or_hotel', label: 'Destination or Hotel' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'guest_details', label: 'Guests' },
    { key: 'room_requirements', label: 'Room Requirements' },
    { key: 'meal_plan', label: 'Meal Plan' },
    { key: 'notes', label: 'Additional Notes' },
  ],
  honeymoon_offer: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'destination', label: 'Destination' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'hotel_details', label: 'Hotel or Resort' },
    { key: 'inclusions', label: 'Package Includes' },
    { key: 'exclusions', label: 'Package Excludes' },
    { key: 'price', label: 'Total Cost' },
  ],
  payment_reminder: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'booking_details', label: 'Booking Details' },
    { key: 'total_cost', label: 'Total Cost' },
    { key: 'amount_received', label: 'Amount Received' },
    { key: 'balance_due', label: 'Balance Due' },
    { key: 'due_date', label: 'Due Date' },
  ],
  supplier_request: [
    { key: 'supplier_name', label: 'Supplier Name' },
    { key: 'destination_or_hotel', label: 'Destination or Service' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'guest_details', label: 'Guest Details' },
    { key: 'notes', label: 'Request Details' },
  ],
  follow_up: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'notes', label: 'Follow-up Context' },
  ],
  itinerary: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'destination', label: 'Destination' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'notes', label: 'Program Details' },
  ],
  costing: [
    { key: 'package_name', label: 'Package or Group Name' },
    { key: 'travel_dates', label: 'Travel Dates' },
    { key: 'passengers', label: 'Passengers' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'nights', label: 'Nights' },
    { key: 'markup_percent', label: 'Markup Percent' },
    { key: 'hotel_a_name', label: 'Hotel A Name' },
    { key: 'hotel_a_room', label: 'Hotel A Room Type' },
    { key: 'hotel_a_meal_plan', label: 'Hotel A Board Basis' },
    { key: 'hotel_a_total', label: 'Hotel A Total Net Rate' },
    { key: 'hotel_b_name', label: 'Hotel B Name' },
    { key: 'hotel_b_room', label: 'Hotel B Room Type' },
    { key: 'hotel_b_meal_plan', label: 'Hotel B Board Basis' },
    { key: 'hotel_b_total', label: 'Hotel B Total Net Rate' },
    { key: 'notes', label: 'Additional Notes' },
  ],
  general_email: [
    { key: 'client_name', label: 'Client Name' },
    { key: 'notes', label: 'Email Purpose or Details' },
  ],
}

const CATEGORY_CONTEXT = {
  flight_offer: 'airline booking screenshots (Ryanair, easyJet, etc.)',
  cruise_offer: 'cruise brochures, cabin selections, and fare pages',
  hotel_client_quote: 'supplier wholesale rates and public booking page screenshots',
  hotel_request: 'hotel availability, rate sheets, and supplier correspondence',
  honeymoon_offer: 'honeymoon package brochures, hotel and resort offers',
  payment_reminder: 'booking confirmations, invoices, and payment records',
  supplier_request: 'supplier quotes, availability requests, and rate documents',
  follow_up: 'client correspondence, quotes, and booking references',
  itinerary: 'travel programs, day-by-day itineraries, and booking summaries',
  costing: 'hotel rate sheets, supplier net quotes, and group package cost documents',
  general_email: 'travel documents, quotes, and reference images',
}

export function getFieldKeysForCategory(category) {
  return (CATEGORY_FIELD_SCHEMAS[category] || CATEGORY_FIELD_SCHEMAS.general_email).map((f) => f.key)
}

export function buildExtractTemplateInstructions(category) {
  const schema = CATEGORY_FIELD_SCHEMAS[category] || CATEGORY_FIELD_SCHEMAS.general_email
  const context = CATEGORY_CONTEXT[category] || 'travel industry screenshots and documents'
  const keyLines = schema.map((f) => `- ${f.key}: ${f.label}`).join('\n')

  return `You extract structured travel agency data from ${context} for template category "${category}".

Return ONLY a JSON object with these exact keys (use empty string if unknown):
${keyLines}

Rules:
- Use only information visible in the images.
- Do not invent prices, dates, names, or flight numbers.
- Preserve currencies, times, dates, and reference numbers exactly as shown — do not round or paraphrase.
- Extract every visible detail: flight times, hotel names, room types, meal plans, inclusions, and totals.
- Multi-line values are allowed for detail fields.
- If multiple images, merge information correctly without losing any detail.
- Output raw JSON only, no markdown.`
}

export function buildExtractTemplateUserMessage(category, imageCount) {
  const keys = getFieldKeysForCategory(category).join(', ')
  return `Analyse ${imageCount} image(s) for a "${category}" template and return JSON with keys: ${keys}.`
}

export function parseTemplateFieldsJson(text, category) {
  if (!text?.trim()) return {}
  const keys = getFieldKeysForCategory(category)
  const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '')

  const tryParse = (raw) => {
    const data = JSON.parse(raw)
    const result = {}
    for (const key of keys) {
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
