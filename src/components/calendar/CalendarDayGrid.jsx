import { format, setHours, setMinutes } from 'date-fns'
import CalendarEventChip from './CalendarEventChip'
import { HOUR_SLOTS } from '../../constants/calendarConstants'
import { parseEventDate, toDateKey } from '../../utils/calendarHelpers'

export default function CalendarDayGrid({
  activeDate,
  events,
  onSelectEvent,
  onDragStart,
  onDropOnSlot,
}) {
  const key = toDateKey(activeDate)
  const allDay = events.filter((e) => e.allDay)
  const timed = events.filter((e) => !e.allDay)

  function eventsForHour(hour) {
    return timed.filter((event) => {
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
      <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">All day</p>
        <div
          className="mt-2 flex min-h-[2.5rem] flex-wrap gap-2"
          onDragOver={handleDragOver}
          onDrop={(e) => {
            e.preventDefault()
            onDropOnSlot?.(activeDate, null)
          }}
        >
          {allDay.length ? allDay.map((event) => (
            <div key={event.id} className="max-w-xs flex-1">
              <CalendarEventChip
                event={event}
                draggable
                onDragStart={(e) => onDragStart?.(event, e)}
                onClick={onSelectEvent}
              />
            </div>
          )) : (
            <p className="text-sm text-slate-400">No all-day events</p>
          )}
        </div>
      </div>

      <div className="calendar-day-scroll max-h-[40rem] overflow-y-auto">
        {HOUR_SLOTS.map((hour) => {
          const slotEvents = eventsForHour(hour)
          return (
            <div
              key={hour}
              className="grid grid-cols-[4rem_1fr] border-b border-slate-50"
            >
              <div className="px-3 py-4 text-xs font-medium text-slate-400">
                {format(setMinutes(setHours(new Date(), hour), 0), 'HH:mm')}
              </div>
              <div
                className="min-h-[3.5rem] border-l border-slate-100 p-2 hover:bg-slate-50/50"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault()
                  onDropOnSlot?.(activeDate, hour)
                }}
              >
                <div className="space-y-1">
                  {slotEvents.map((event) => (
                    <CalendarEventChip
                      key={event.id}
                      event={event}
                      onDragStart={(e) => onDragStart?.(event, e)}
                      draggable
                      onClick={onSelectEvent}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
