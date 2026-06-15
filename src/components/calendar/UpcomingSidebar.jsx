import { format } from 'date-fns'
import { AlertTriangle, CalendarDays, ChevronRight, Clock } from 'lucide-react'
import { EVENT_TYPE_META } from '../../constants/calendarConstants'
import { formatEventTime, isEventOverdue, isToday, parseEventDate } from '../../utils/calendarHelpers'

export default function UpcomingSidebar({ events, onSelectEvent, miniDays = [], activeDate, onSelectDay }) {
  const today = new Date()
  const upcoming = [...events]
    .filter((e) => {
      const start = parseEventDate(e.start)
      return start && start >= today && !e.completed
    })
    .sort((a, b) => {
      const aT = parseEventDate(a.start)?.getTime() || 0
      const bT = parseEventDate(b.start)?.getTime() || 0
      return aT - bT
    })
    .slice(0, 8)

  const overdueCount = events.filter((e) => isEventOverdue(e)).length

  return (
    <div className="space-y-4">
      {miniDays?.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quick jump</p>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={`${d}-${i}`} className="py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{d}</span>
              ))}
              {miniDays.map((day) => {
                const isActive = format(day, 'yyyy-MM-dd') === format(activeDate, 'yyyy-MM-dd')
                const isCurrentMonth = day.getMonth() === activeDate.getMonth()
                const isDayToday = isToday(day)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onSelectDay?.(day)}
                    className={`relative rounded-lg py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-500/30'
                        : isDayToday
                          ? 'bg-teal-50 text-teal-800 ring-2 ring-teal-400/40'
                          : isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-4 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-teal-500/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 ring-1 ring-teal-400/30">
                <CalendarDays className="h-4 w-4 text-teal-300" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight">Upcoming</p>
                <p className="text-[10px] text-slate-400">Next on your schedule</p>
              </div>
            </div>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-100 ring-1 ring-red-400/30">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100/80">
          {upcoming.length ? upcoming.map((event) => {
            const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.custom
            const start = parseEventDate(event.start)
            const overdue = isEventOverdue(event)
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent?.(event)}
                className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gradient-to-r hover:from-slate-50 hover:to-white"
              >
                <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2 ring-1 ${
                  overdue
                    ? 'bg-gradient-to-br from-red-50 to-white ring-red-200/80'
                    : 'bg-gradient-to-br from-slate-50 to-white ring-slate-200/80 group-hover:ring-teal-200/80'
                }`}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {start ? format(start, 'MMM') : ''}
                  </p>
                  <p className={`text-xl font-bold leading-none ${overdue ? 'text-red-700' : 'text-slate-900'}`}>
                    {start ? format(start, 'd') : '—'}
                  </p>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-teal-900">
                    {event.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                      overdue ? 'bg-red-50 text-red-800 ring-red-200/80' : meta.light
                    }`}>
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Clock className="h-3 w-3" />
                      {event.allDay ? 'All day' : formatEventTime(event)}
                    </span>
                  </div>
                  {event.clientName && event.clientName !== '—' && (
                    <p className="mt-1 truncate text-[11px] text-slate-500">{event.clientName}</p>
                  )}
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-teal-500" />
              </button>
            )
          }) : (
            <div className="px-4 py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-200" />
              <p className="mt-2 text-sm font-medium text-slate-500">Nothing scheduled ahead</p>
              <p className="mt-0.5 text-xs text-slate-400">Add a task or follow-up to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
