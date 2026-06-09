export const AI_TEMPLATE_CATEGORIES = [
  { value: 'flight_offer', label: 'Flight Offer' },
  { value: 'cruise_offer', label: 'Cruise Offer' },
  { value: 'hotel_request', label: 'Hotel Request' },
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
  hotel: ['hotel_request', 'honeymoon_offer', 'general_email'],
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

/** Template categories that support screenshot → auto-fill */
export const SCREENSHOT_AUTO_FILL_CATEGORIES = ['flight_offer']
