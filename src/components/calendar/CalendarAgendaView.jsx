import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import CalendarEventChip from './CalendarEventChip'
import { EVENT_TYPE_META } from '../../constants/calendarConstants'
import { formatEventTime, isEventOverdue, parseEventDate } from '../../utils/calendarHelpers'

function groupByDay(events) {
  const groups = []
  const map = new Map()

  const sorted = [...events].sort((a, b) => {
    const aT = parseEventDate(a.start)?.getTime() || 0
    const bT = parseEventDate(b.start)?.getTime() || 0
    return aT - bT
  })

  for (const event of sorted) {
    const start = parseEventDate(event.start)
    if (!start) continue
    const key = format(start, 'yyyy-MM-dd')
    if (!map.has(key)) {
      const group = { date: start, key, events: [] }
      map.set(key, group)
      groups.push(group)
    }
    map.get(key).events.push(event)
  }

  return groups
}

export default function CalendarAgendaView({ events, onSelectEvent }) {
  const groups = groupByDay(events)

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <CalendarDays className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">No events in this period</p>
        <p className="mt-1 text-xs text-slate-400">Create an event or add tasks with due dates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.key}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">{format(group.date, 'EEEE, d MMMM yyyy')}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {group.events.map((event) => {
              const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.custom
              const overdue = isEventOverdue(event)
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent?.(event)}
                  className="flex w-full items-start gap-4 px-4 py-3 text-left transition hover:bg-slate-50/80"
                >
                  <div className="w-16 shrink-0 pt-0.5 text-xs font-semibold text-slate-500">
                    {event.allDay ? 'All day' : formatEventTime(event)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold text-slate-900 ${event.completed ? 'line-through text-slate-500' : ''}`}>
                        {event.title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${overdue ? 'bg-red-50 text-red-800 ring-red-200' : meta.light}`}>
                        {meta.label}
                      </span>
                    </div>
                    {event.clientName && event.clientName !== '—' && (
                      <p className="mt-1 text-xs text-slate-500">{event.clientName}</p>
                    )}
                    {event.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{event.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
