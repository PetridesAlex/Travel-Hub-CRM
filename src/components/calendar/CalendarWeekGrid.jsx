import { format, setHours, setMinutes } from 'date-fns'
import CalendarEventChip from './CalendarEventChip'
import { HOUR_SLOTS } from '../../constants/calendarConstants'
import {
  getWeekDays,
  groupEventsByDateKey,
  isToday,
  parseEventDate,
  toDateKey,
} from '../../utils/calendarHelpers'

export default function CalendarWeekGrid({
  activeDate,
  events,
  onSelectEvent,
  onDragStart,
  onDropOnSlot,
}) {
  const days = getWeekDays(activeDate)
  const allDayByDate = groupEventsByDateKey(events.filter((e) => e.allDay))
  const timedEvents = events.filter((e) => !e.allDay)

  function eventsForHour(day, hour) {
    const key = toDateKey(day)
    return timedEvents.filter((event) => {
      const start = parseEventDate(event.start)
      if (!start || toDateKey(start) !== key) return false
      return start.getHours() === hour
    })
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/80">
        <div />
        {days.map((day) => (
          <div
            key={toDateKey(day)}
            className={`border-l border-slate-100 px-2 py-3 text-center ${
              isToday(day) ? 'bg-teal-50/50' : ''
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {format(day, 'EEE')}
            </p>
            <p className={`mt-0.5 text-lg font-bold ${isToday(day) ? 'text-teal-700' : 'text-slate-900'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-amber-50/30">
        <div className="px-2 py-2 text-[10px] font-semibold uppercase text-slate-500">All day</div>
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEvents = allDayByDate[key] || []
          return (
            <div
              key={key}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.preventDefault()
                onDropOnSlot?.(day, null)
              }}
              className="min-h-[3rem] space-y-1 border-l border-slate-100 p-1"
            >
              {dayEvents.map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  compact
                  draggable
                  onDragStart={(e) => onDragStart?.(event, e)}
                  onClick={onSelectEvent}
                />
              ))}
            </div>
          )
        })}
      </div>

      <div className="calendar-week-scroll max-h-[36rem] overflow-y-auto">
        {HOUR_SLOTS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-50"
          >
            <div className="px-2 py-3 text-[10px] font-medium text-slate-400">
              {format(setMinutes(setHours(new Date(), hour), 0), 'HH:mm')}
            </div>
            {days.map((day) => {
              const slotEvents = eventsForHour(day, hour)
              return (
                <div
                  key={`${toDateKey(day)}-${hour}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault()
                    onDropOnSlot?.(day, hour)
                  }}
                  className="min-h-[3rem] border-l border-slate-100 p-1 hover:bg-slate-50/50"
                >
                  {slotEvents.map((event) => (
                    <CalendarEventChip
                      key={event.id}
                      event={event}
                      draggable
                      onDragStart={(e) => onDragStart?.(event, e)}
                      onClick={onSelectEvent}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
