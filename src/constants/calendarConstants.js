export const CALENDAR_VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
]

export const CALENDAR_FILTERS = [
  { id: 'all', label: 'All events' },
  { id: 'task', label: 'Tasks' },
  { id: 'lead_follow_up', label: 'Lead follow-ups' },
  { id: 'booking_departure', label: 'Departures' },
  { id: 'payment_due', label: 'Payments due' },
  { id: 'invoice_due', label: 'Invoices due' },
  { id: 'custom', label: 'Custom events' },
]

export const EVENT_TYPE_META = {
  task: {
    label: 'Task',
    color: 'amber',
    bg: 'bg-amber-500',
    light: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  lead_follow_up: {
    label: 'Lead follow-up',
    color: 'sky',
    bg: 'bg-sky-500',
    light: 'bg-sky-50 text-sky-900 ring-sky-200/80',
    dot: 'bg-sky-500',
  },
  booking_departure: {
    label: 'Departure',
    color: 'teal',
    bg: 'bg-teal-500',
    light: 'bg-teal-50 text-teal-900 ring-teal-200/80',
    dot: 'bg-teal-500',
  },
  booking_return: {
    label: 'Return',
    color: 'emerald',
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  payment_due: {
    label: 'Payment due',
    color: 'red',
    bg: 'bg-red-500',
    light: 'bg-red-50 text-red-900 ring-red-200/80',
    dot: 'bg-red-500',
  },
  invoice_due: {
    label: 'Invoice due',
    color: 'violet',
    bg: 'bg-violet-500',
    light: 'bg-violet-50 text-violet-900 ring-violet-200/80',
    dot: 'bg-violet-500',
  },
  custom: {
    label: 'Event',
    color: 'indigo',
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50 text-indigo-900 ring-indigo-200/80',
    dot: 'bg-indigo-500',
  },
}

export const CUSTOM_EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Phone call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'travel', label: 'Travel' },
  { value: 'payment', label: 'Payment' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' },
]

export const HOUR_SLOTS = Array.from({ length: 24 }, (_, i) => i)
