export const AI_TEMPLATE_CATEGORIES = [
  { value: 'flight_offer', label: 'Flight Offer' },
  { value: 'cruise_offer', label: 'Cruise Offer' },
  { value: 'hotel_request', label: 'Hotel Request' },
  { value: 'hotel_client_quote', label: 'Hotel Rate Quote' },
  { value: 'honeymoon_offer', label: 'Honeymoon Offer' },
  { value: 'supplier_request', label: 'Supplier Request' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'costing', label: 'Costing' },
  { value: 'general_email', label: 'General Email' },
]

export const AI_AGENT_CATEGORIES = [
  { value: 'flight', label: 'Flight' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'email', label: 'Email' },
  { value: 'costing', label: 'Costing' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'payment', label: 'Payment' },
]

/** Map agent category → compatible template categories */
export const AGENT_TEMPLATE_MAP = {
  flight: ['flight_offer', 'general_email'],
  cruise: ['cruise_offer', 'general_email'],
  hotel: ['hotel_client_quote', 'hotel_request', 'honeymoon_offer', 'general_email'],
  itinerary: ['itinerary', 'general_email'],
  email: ['general_email', 'follow_up', 'flight_offer', 'cruise_offer', 'honeymoon_offer', 'payment_reminder'],
  costing: ['costing'],
  supplier: ['supplier_request', 'hotel_request'],
  payment: ['payment_reminder'],
}

export const TEMPLATE_FIELD_SCHEMAS = {
  flight_offer: [
    { key: 'client_name', label: 'Client Name', type: 'text', placeholder: 'Mr Andreas' },
    { key: 'route', label: 'Route', type: 'text', placeholder: 'Paphos – Athens – Paphos' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text', placeholder: '14 June 2026 – 21 June 2026' },
    { key: 'outbound_details', label: 'Outbound Flight', type: 'textarea', rows: 3 },
    { key: 'return_details', label: 'Return Flight', type: 'textarea', rows: 3 },
    { key: 'inclusions', label: 'Fare Inclusions', type: 'textarea', rows: 3 },
    { key: 'price', label: 'Price', type: 'text', placeholder: '€258.74' },
  ],
  cruise_offer: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'ship_name', label: 'Cruise Ship', type: 'text' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text' },
    { key: 'itinerary', label: 'Itinerary', type: 'textarea', rows: 4 },
    { key: 'cabin_details', label: 'Cabin Option', type: 'text' },
    { key: 'inclusions', label: 'Price Includes', type: 'textarea', rows: 3 },
    { key: 'exclusions', label: 'Price Excludes', type: 'textarea', rows: 2 },
    { key: 'price', label: 'Total Cost', type: 'text' },
  ],
  hotel_client_quote: [
    { key: 'client_name', label: 'Client Name', type: 'text', section: 'client' },
    { key: 'hotel_name', label: 'Hotel Name', type: 'text', section: 'stay' },
    { key: 'destination', label: 'Destination', type: 'text', section: 'stay' },
    { key: 'check_in', label: 'Check-in', type: 'text', section: 'stay' },
    { key: 'check_out', label: 'Check-out', type: 'text', section: 'stay' },
    { key: 'nights', label: 'Nights', type: 'text', section: 'stay' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text', section: 'stay', readOnly: true },
    { key: 'guest_details', label: 'Guests', type: 'text', placeholder: '2 adults', section: 'stay' },
    { key: 'room_type', label: 'Room Type', type: 'text', section: 'stay' },
    { key: 'room_details', label: 'Room Details', type: 'textarea', rows: 2, section: 'stay' },
    { key: 'meal_plan', label: 'Meal Plan', type: 'text', placeholder: 'Bed & Breakfast', section: 'stay' },
    { key: 'breakfast_included', label: 'Breakfast Included', type: 'text', section: 'stay' },
    { key: 'supplier_platform', label: 'Supplier Platform', type: 'text', placeholder: 'Hotelbeds', section: 'rates' },
    { key: 'supplier_net_rate', label: 'Supplier Total (Net)', type: 'text', placeholder: '€420.00', section: 'rates' },
    { key: 'supplier_price_per_night', label: 'Supplier Per Night', type: 'text', readOnly: true, section: 'rates' },
    { key: 'booking_platform', label: 'Booking Platform', type: 'text', placeholder: 'Booking.com', section: 'rates' },
    { key: 'booking_public_rate', label: 'Booking Total (Public)', type: 'text', placeholder: '€589.00', section: 'rates' },
    { key: 'booking_price_per_night', label: 'Booking Per Night', type: 'text', readOnly: true, section: 'rates' },
    { key: 'price_difference', label: 'Net vs Public Difference', type: 'text', readOnly: true, section: 'rates' },
    { key: 'margin_percent', label: 'Margin %', type: 'text', placeholder: '15', section: 'quote' },
    { key: 'margin_amount', label: 'Margin Amount', type: 'text', readOnly: true, section: 'quote' },
    { key: 'client_quote_price', label: 'Client Quote (Total)', type: 'text', section: 'quote' },
    { key: 'cancellation_policy', label: 'Cancellation Policy', type: 'textarea', rows: 2, section: 'terms' },
    { key: 'taxes_and_fees', label: 'Taxes & Fees', type: 'text', section: 'terms' },
    { key: 'inclusions', label: 'Inclusions', type: 'textarea', rows: 2, section: 'terms' },
    { key: 'comparison_summary', label: 'Email Comparison Block', type: 'textarea', rows: 6, readOnly: true, section: 'email' },
  ],
  hotel_request: [
    { key: 'supplier_name', label: 'Supplier Name', type: 'text', placeholder: 'Dear Supplier' },
    { key: 'destination_or_hotel', label: 'Destination / Hotel', type: 'text' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text' },
    { key: 'guest_details', label: 'Guests', type: 'text' },
    { key: 'room_requirements', label: 'Room Requirements', type: 'textarea', rows: 2 },
    { key: 'meal_plan', label: 'Meal Plan', type: 'text' },
    { key: 'notes', label: 'Additional Notes', type: 'textarea', rows: 2 },
  ],
  honeymoon_offer: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'destination', label: 'Destination', type: 'text' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text' },
    { key: 'hotel_details', label: 'Hotel / Resort', type: 'textarea', rows: 2 },
    { key: 'inclusions', label: 'Package Includes', type: 'textarea', rows: 3 },
    { key: 'exclusions', label: 'Package Excludes', type: 'textarea', rows: 2 },
    { key: 'price', label: 'Total Cost', type: 'text' },
  ],
  payment_reminder: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'booking_details', label: 'Booking Details', type: 'textarea', rows: 2 },
    { key: 'total_cost', label: 'Total Cost', type: 'text' },
    { key: 'amount_received', label: 'Amount Received', type: 'text' },
    { key: 'balance_due', label: 'Balance Due', type: 'text' },
    { key: 'due_date', label: 'Due Date', type: 'text' },
  ],
  supplier_request: [
    { key: 'supplier_name', label: 'Supplier Name', type: 'text' },
    { key: 'destination_or_hotel', label: 'Destination / Service', type: 'text' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text' },
    { key: 'guest_details', label: 'Guest / Pax Details', type: 'text' },
    { key: 'notes', label: 'Request Details', type: 'textarea', rows: 4 },
  ],
  follow_up: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'notes', label: 'Follow-up Context', type: 'textarea', rows: 4 },
  ],
  itinerary: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'destination', label: 'Destination', type: 'text' },
    { key: 'travel_dates', label: 'Travel Dates', type: 'text' },
    { key: 'notes', label: 'Program Details', type: 'textarea', rows: 6 },
  ],
  costing: [
    { key: 'notes', label: 'Costing Details', type: 'textarea', rows: 6, placeholder: 'Supplier cost, markup %, selling price...' },
  ],
  general_email: [
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'notes', label: 'Email Purpose / Details', type: 'textarea', rows: 5 },
  ],
}

export function getFieldsForCategory(category) {
  return TEMPLATE_FIELD_SCHEMAS[category] || TEMPLATE_FIELD_SCHEMAS.general_email
}

export function getEmptyInputForCategory(category) {
  const fields = getFieldsForCategory(category)
  return Object.fromEntries(fields.map((f) => [f.key, '']))
}

/** Upload hint copy per template category */
export const SCREENSHOT_UPLOAD_HINTS = {
  flight_offer: 'Ryanair, booking confirmations, fare pages — route, flights, price fill automatically',
  cruise_offer: 'Cruise brochures, cabin pages, fare summaries',
  hotel_client_quote: 'Supplier platform net rates + Booking.com/OTA page — compares prices and fills your client quote',
  hotel_request: 'Hotel rates, availability sheets, supplier quotes',
  honeymoon_offer: 'Resort brochures, package inclusions, pricing',
  payment_reminder: 'Invoices, booking confirmations, payment records',
  supplier_request: 'Supplier quotes, availability, rate documents',
  follow_up: 'Quotes, emails, booking references',
  itinerary: 'Programs, day-by-day plans, booking summaries',
  costing: 'Cost sheets, supplier invoices, markup notes',
  general_email: 'Quotes, brochures, reference documents',
}

export function getScreenshotUploadHint(category) {
  return SCREENSHOT_UPLOAD_HINTS[category] || SCREENSHOT_UPLOAD_HINTS.general_email
}
