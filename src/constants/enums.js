export const CLIENT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Corporate' },
]

export const TRAVEL_TYPES = [
  { value: 'cruise', label: 'Cruise' },
  { value: 'honeymoon', label: 'Honeymoon' },
  { value: 'business', label: 'Business' },
  { value: 'school_trip', label: 'School Trip' },
  { value: 'group', label: 'Group' },
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'package', label: 'Package' },
  { value: 'other', label: 'Other' },
]

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'lost', label: 'Lost' },
]

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

export const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const INVOICE_SERVICE_TYPES = [
  { value: 'flight', label: 'Flight Services' },
  { value: 'hotel', label: 'Hotel Services' },
  { value: 'ferry', label: 'Ferry Services' },
  { value: 'car_rental', label: 'Car Rental Services' },
  { value: 'travel_insurance', label: 'Travel Insurance Services' },
  { value: 'cruise', label: 'Cruise Services' },
  { value: 'travel_package', label: 'Travel Package' },
  { value: 'other', label: 'Other Services' },
]

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export const SUPPLIER_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'airline', label: 'Airline' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'dmc', label: 'DMC' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]

export const EMAIL_TYPES = [
  { value: 'flight_offer', label: 'Flight Offer' },
  { value: 'cruise_offer', label: 'Cruise Offer' },
  { value: 'hotel_offer', label: 'Hotel Offer' },
  { value: 'supplier_request', label: 'Supplier Request' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
]

export const CAMPAIGN_TYPES = [
  { value: 'cruise', label: 'Cruise' },
  { value: 'honeymoon', label: 'Honeymoon' },
  { value: 'school_trip', label: 'School Trip' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'general', label: 'General' },
]

export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
]

export const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-purple-100 text-purple-800',
  follow_up: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  draft: 'bg-slate-100 text-slate-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  individual: 'bg-teal-100 text-teal-800',
  business: 'bg-violet-100 text-violet-800',
}

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/clients', label: 'Clients', icon: 'Users' },
  { path: '/leads', label: 'Leads', icon: 'Target' },
  { path: '/quotations', label: 'Quotations', icon: 'FileText' },
  { path: '/bookings', label: 'Bookings', icon: 'CalendarCheck' },
  { path: '/invoices', label: 'Invoices', icon: 'ScrollText' },
  { path: '/receipts', label: 'Receipts', icon: 'Receipt' },
  { path: '/suppliers', label: 'Suppliers', icon: 'Building2' },
  { path: '/tasks', label: 'Tasks', icon: 'CheckSquare' },
  { path: '/calendar', label: 'Calendar', icon: 'Calendar' },
  { path: '/forms', label: 'Forms', icon: 'ClipboardList' },
  { path: '/packages', label: 'Packages', icon: 'Package' },
  { path: '/ai-workspace/generator', label: 'AI Generator', icon: 'Sparkles' },
  { path: '/ai-workspace/agents', label: 'AI Agents', icon: 'Bot' },
  { path: '/ai-workspace/templates', label: 'AI Templates', icon: 'FileStack' },
  { path: '/ai-workspace/history', label: 'AI History', icon: 'History' },
  { path: '/ai-email', label: 'AI Email', icon: 'Mail' },
  { path: '/voice-notes', label: 'Voice Notes', icon: 'Mic' },
  { path: '/marketing', label: 'Marketing', icon: 'Megaphone' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
]
