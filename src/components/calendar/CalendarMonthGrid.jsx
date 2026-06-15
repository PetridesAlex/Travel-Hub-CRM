import { format, getDay } from 'date-fns'
import CalendarEventChip from './CalendarEventChip'
import {
  getMonthGridDays,
  groupEventsByDateKey,
  isSameMonth,
  isToday,
  toDateKey,
} from '../../utils/calendarHelpers'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isWeekend(day) {
  const d = getDay(day)
  return d === 0 || d === 6
}

export default function CalendarMonthGrid({
  activeDate,
  events,
  onSelectDay,
  onSelectEvent,
  onDragStart,
  onDropOnDay,
}) {
  const days = getMonthGridDays(activeDate)
  const byDate = groupEventsByDateKey(events)

  function handleDragOver(e) {
    e.preventDefault()
  }

  return (
    <div className="calendar-month-grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)]">
      <div className="grid grid-cols-7 border-b border-slate-800/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] ${
              i >= 5 ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-slate-100/50">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEvents = byDate[key] || []
          const inMonth = isSameMonth(day, activeDate)
          const today = isToday(day)
          const weekend = isWeekend(day)

          return (
            <div
              key={key}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.preventDefault()
                onDropOnDay?.(day)
              }}
              className={`calendar-day-cell group/cell relative min-h-[7.5rem] border-b border-r border-slate-200/60 p-1.5 transition-colors sm:min-h-[9rem] sm:p-2 ${
                inMonth
                  ? weekend
                    ? 'bg-slate-50/80 hover:bg-slate-100/60'
                    : 'bg-white hover:bg-slate-50/50'
                  : 'bg-slate-100/40'
              } ${today ? 'calendar-day-today' : ''}`}
            >
              {today && (
                <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-teal-400/30" />
              )}

              <div className="relative mb-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDay?.(day)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    today
                      ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-500/35'
                      : inMonth
                        ? 'text-slate-800 hover:bg-slate-200/80'
                        : 'text-slate-400 hover:bg-slate-200/50'
                  }`}
                >
                  {format(day, 'd')}
                </button>
                {dayEvents.length > 0 && (
                  <span className="rounded-full bg-slate-900/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="relative space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    compact
                    draggable
                    onDragStart={(e) => onDragStart?.(event, e)}
                    onClick={onSelectEvent}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay?.(day)}
                    className="w-full rounded-md bg-slate-900/5 px-1.5 py-0.5 text-left text-[10px] font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
