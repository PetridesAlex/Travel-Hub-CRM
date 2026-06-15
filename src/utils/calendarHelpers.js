import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  isValid,
} from 'date-fns'

export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function parseEventDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? date : null
}

export function dateOnlyToStart(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return null
  return startOfDay(date)
}

export function dateOnlyToEnd(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return null
  return endOfDay(date)
}

export function getMonthGridDays(activeDate) {
  const monthStart = startOfMonth(activeDate)
  const monthEnd = endOfMonth(activeDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function getWeekDays(activeDate) {
  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(activeDate, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

export function groupEventsByDateKey(events) {
  const map = {}
  for (const event of events) {
    const start = parseEventDate(event.start)
    if (!start) continue
    const key = toDateKey(start)
    if (!map[key]) map[key] = []
    map[key].push(event)
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => {
      const aStart = parseEventDate(a.start)?.getTime() || 0
      const bStart = parseEventDate(b.start)?.getTime() || 0
      return aStart - bStart
    })
  }
  return map
}

export function filterEventsByType(events, filterId) {
  if (!filterId || filterId === 'all') return events
  return events.filter((e) => e.type === filterId)
}

export function filterEventsByClient(events, clientId) {
  if (!clientId) return events
  return events.filter((e) => e.clientId === clientId)
}

export function filterEventsInRange(events, rangeStart, rangeEnd) {
  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()
  return events.filter((event) => {
    const eventStart = parseEventDate(event.start)
    const eventEnd = parseEventDate(event.end || event.start)
    if (!eventStart || !eventEnd) return false
    return eventStart.getTime() <= endMs && eventEnd.getTime() >= startMs
  })
}

export function getViewRange(view, activeDate) {
  if (view === 'month') {
    const monthStart = startOfMonth(activeDate)
    const monthEnd = endOfMonth(activeDate)
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    }
  }
  if (view === 'week') {
    return {
      start: startOfWeek(activeDate, { weekStartsOn: 1 }),
      end: endOfWeek(activeDate, { weekStartsOn: 1 }),
    }
  }
  if (view === 'day') {
    return { start: startOfDay(activeDate), end: endOfDay(activeDate) }
  }
  const agendaStart = startOfDay(activeDate)
  return { start: agendaStart, end: endOfDay(addDays(agendaStart, 30)) }
}

export function getViewTitle(view, activeDate) {
  if (view === 'month') return format(activeDate, 'MMMM yyyy')
  if (view === 'week') {
    const days = getWeekDays(activeDate)
    return `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM yyyy')}`
  }
  if (view === 'day') return format(activeDate, 'EEEE, d MMMM yyyy')
  return 'Agenda — next 30 days'
}

export function navigateDate(view, activeDate, direction) {
  const delta = direction === 'next' ? 1 : -1
  if (view === 'month') return delta > 0 ? addMonths(activeDate, 1) : subMonths(activeDate, 1)
  if (view === 'week') return delta > 0 ? addWeeks(activeDate, 1) : subWeeks(activeDate, 1)
  return addDays(activeDate, delta)
}

export function formatEventTime(event) {
  if (event.allDay) return 'All day'
  const start = parseEventDate(event.start)
  if (!start) return ''
  return format(start, 'HH:mm')
}

export function isEventOverdue(event) {
  if (!event.isOverdueCapable) return false
  const end = parseEventDate(event.end || event.start)
  if (!end) return false
  return end < startOfDay(new Date()) && !event.completed
}

export { isSameDay, isSameMonth, isToday, format, startOfDay, endOfDay, addDays }
