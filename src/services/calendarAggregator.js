import { endOfDay, startOfDay } from 'date-fns'
import { getTasks } from './tasks'
import { getLeads } from './leads'
import { getBookings } from './bookings'
import { getInvoices } from './invoices'
import { getCalendarEvents } from './calendarEvents'
import { dateOnlyToEnd, dateOnlyToStart, parseEventDate } from '../utils/calendarHelpers'
import { formatClientName } from '../utils/format'

function makeId(type, sourceId, suffix = '') {
  return `${type}:${sourceId}${suffix ? `:${suffix}` : ''}`
}

function mapCustomEvent(row) {
  const start = parseEventDate(row.start_at)
  const end = parseEventDate(row.end_at) || start
  return {
    id: makeId('custom', row.id),
    type: 'custom',
    sourceType: 'calendar_event',
    sourceId: row.id,
    title: row.title,
    description: row.description || '',
    start: row.start_at,
    end: row.end_at || row.start_at,
    allDay: row.all_day,
    location: row.location || '',
    eventType: row.event_type,
    source: row.source,
    clientId: row.client_id,
    clientName: formatClientName(row.clients),
    leadId: row.lead_id,
    bookingId: row.booking_id,
    taskId: row.task_id,
    editable: true,
    draggable: true,
    deletable: true,
    completed: false,
    isOverdueCapable: false,
    href: null,
    meta: row,
  }
}

function safeIsoRange(start, end) {
  if (!start || !end) return null
  return { start: start.toISOString(), end: end.toISOString() }
}

function mapTask(task) {
  if (!task.due_date) return null
  const range = safeIsoRange(dateOnlyToStart(task.due_date), dateOnlyToEnd(task.due_date))
  if (!range) return null
  return {
    id: makeId('task', task.id),
    type: 'task',
    sourceType: 'task',
    sourceId: task.id,
    title: task.title,
    description: task.description || '',
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: task.client_id,
    clientName: formatClientName(task.clients),
    leadId: task.lead_id,
    editable: true,
    draggable: true,
    deletable: true,
    isOverdueCapable: true,
    href: '/tasks',
    meta: task,
  }
}

function mapLeadFollowUp(lead) {
  if (!lead.follow_up_date) return null
  const range = safeIsoRange(dateOnlyToStart(lead.follow_up_date), dateOnlyToEnd(lead.follow_up_date))
  if (!range) return null
  const clientName = formatClientName(lead.clients)
  return {
    id: makeId('lead_follow_up', lead.id),
    type: 'lead_follow_up',
    sourceType: 'lead',
    sourceId: lead.id,
    title: `Follow up: ${lead.destination || clientName || 'Lead'}`,
    description: lead.notes || '',
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: lead.client_id,
    clientName,
    leadId: lead.id,
    editable: true,
    draggable: true,
    deletable: false,
    completed: ['confirmed', 'lost'].includes(lead.status),
    isOverdueCapable: true,
    href: '/leads',
    meta: lead,
  }
}

function mapBookingDeparture(booking) {
  if (!booking.travel_start_date) return null
  const range = safeIsoRange(dateOnlyToStart(booking.travel_start_date), dateOnlyToEnd(booking.travel_start_date))
  if (!range) return null
  const clientName = formatClientName(booking.clients)
  return {
    id: makeId('booking_departure', booking.id),
    type: 'booking_departure',
    sourceType: 'booking',
    sourceId: booking.id,
    title: `Departure: ${clientName}${booking.booking_reference ? ` (${booking.booking_reference})` : ''}`,
    description: booking.supplier_name || '',
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: booking.client_id,
    clientName,
    editable: false,
    draggable: false,
    deletable: false,
    completed: booking.status === 'completed',
    isOverdueCapable: false,
    href: '/bookings',
    meta: booking,
  }
}

function mapBookingReturn(booking) {
  if (!booking.travel_end_date) return null
  const range = safeIsoRange(dateOnlyToStart(booking.travel_end_date), dateOnlyToEnd(booking.travel_end_date))
  if (!range) return null
  const clientName = formatClientName(booking.clients)
  return {
    id: makeId('booking_return', booking.id),
    type: 'booking_return',
    sourceType: 'booking',
    sourceId: booking.id,
    title: `Return: ${clientName}${booking.booking_reference ? ` (${booking.booking_reference})` : ''}`,
    description: booking.supplier_name || '',
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: booking.client_id,
    clientName,
    editable: false,
    draggable: false,
    deletable: false,
    completed: booking.status === 'completed',
    isOverdueCapable: false,
    href: '/bookings',
    meta: booking,
  }
}

function mapPaymentDue(booking) {
  if (!booking.due_date || !booking.balance_due) return null
  const range = safeIsoRange(dateOnlyToStart(booking.due_date), dateOnlyToEnd(booking.due_date))
  if (!range) return null
  const clientName = formatClientName(booking.clients)
  return {
    id: makeId('payment_due', booking.id),
    type: 'payment_due',
    sourceType: 'booking',
    sourceId: booking.id,
    title: `Payment due: ${clientName}`,
    description: `Balance: ${booking.balance_due}`,
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: booking.client_id,
    clientName,
    editable: true,
    draggable: true,
    deletable: false,
    completed: Number(booking.balance_due) <= 0,
    isOverdueCapable: true,
    href: '/bookings',
    meta: booking,
  }
}

function mapInvoiceDue(invoice) {
  if (!invoice.due_date || invoice.status === 'paid') return null
  const range = safeIsoRange(dateOnlyToStart(invoice.due_date), dateOnlyToEnd(invoice.due_date))
  if (!range) return null
  const clientName = formatClientName(invoice.clients)
  return {
    id: makeId('invoice_due', invoice.id),
    type: 'invoice_due',
    sourceType: 'invoice',
    sourceId: invoice.id,
    title: `Invoice due: ${invoice.invoice_number || clientName}`,
    description: invoice.description || '',
    start: range.start,
    end: range.end,
    allDay: true,
    clientId: invoice.client_id,
    clientName,
    editable: false,
    draggable: false,
    deletable: false,
    completed: invoice.status === 'paid',
    isOverdueCapable: true,
    href: '/invoices',
    meta: invoice,
  }
}

export async function fetchCalendarEvents(rangeStart, rangeEnd) {
  const start = startOfDay(rangeStart)
  const end = endOfDay(rangeEnd)

  const [tasks, leads, bookings, invoices, customEvents] = await Promise.all([
    getTasks('all'),
    getLeads(),
    getBookings(),
    getInvoices(),
    getCalendarEvents(start, end).catch(() => []),
  ])

  const aggregated = [
    ...tasks.map(mapTask).filter(Boolean),
    ...leads.map(mapLeadFollowUp).filter(Boolean),
    ...bookings.flatMap((b) => [
      mapBookingDeparture(b),
      mapBookingReturn(b),
      mapPaymentDue(b),
    ]).filter(Boolean),
    ...invoices.map(mapInvoiceDue).filter(Boolean),
    ...customEvents.map(mapCustomEvent),
  ]

  return aggregated.filter((event) => {
    const eventStart = parseEventDate(event.start)
    const eventEnd = parseEventDate(event.end || event.start)
    if (!eventStart || !eventEnd) return false
    return eventStart <= end && eventEnd >= start
  })
}

export function getCalendarSuggestions(events) {
  const today = startOfDay(new Date())
  const overdue = events.filter((e) => {
    if (!e.isOverdueCapable || e.completed) return false
    const end = parseEventDate(e.end || e.start)
    return end && end < today
  })

  const thisWeekEnd = endOfDay(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000))
  const upcoming = events.filter((e) => {
    const start = parseEventDate(e.start)
    return start && start >= today && start <= thisWeekEnd && !e.completed
  })

  const suggestions = []
  if (overdue.length) {
    suggestions.push({
      id: 'overdue',
      label: `${overdue.length} overdue item${overdue.length > 1 ? 's' : ''} need attention`,
      prompt: 'Summarize my overdue calendar items and suggest what to prioritize today.',
    })
  }
  const departures = upcoming.filter((e) => e.type === 'booking_departure')
  if (departures.length) {
    suggestions.push({
      id: 'departures',
      label: `${departures.length} departure${departures.length > 1 ? 's' : ''} this week`,
      prompt: 'List all client departures this week and suggest pre-travel check-in reminders.',
    })
  }
  const followUps = upcoming.filter((e) => e.type === 'lead_follow_up')
  if (followUps.length) {
    suggestions.push({
      id: 'followups',
      label: `${followUps.length} lead follow-up${followUps.length > 1 ? 's' : ''} this week`,
      prompt: 'What lead follow-ups do I have this week? Suggest talking points for each.',
    })
  }
  if (!suggestions.length) {
    suggestions.push({
      id: 'week',
      label: 'Review your week',
      prompt: 'Give me a professional summary of my calendar for the next 7 days.',
    })
  }
  return { overdue, upcoming, suggestions }
}
