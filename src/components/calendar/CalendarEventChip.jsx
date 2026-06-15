import { EVENT_TYPE_META } from '../../constants/calendarConstants'
import { formatEventTime, isEventOverdue } from '../../utils/calendarHelpers'

export default function CalendarEventChip({
  event,
  compact = false,
  onClick,
  draggable = false,
  onDragStart,
  className = '',
}) {
  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.custom
  const overdue = isEventOverdue(event)

  const accentBar = overdue ? 'bg-red-500' : meta.dot

  return (
    <button
      type="button"
      draggable={draggable && event.draggable}
      onDragStart={onDragStart}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
      className={`group/chip relative flex w-full items-start gap-1.5 overflow-hidden rounded-lg px-2 py-1 text-left shadow-sm ring-1 transition-all hover:-translate-y-px hover:shadow-md ${
        overdue
          ? 'bg-gradient-to-r from-red-50 to-white text-red-900 ring-red-200/90'
          : event.completed
            ? 'bg-slate-50 text-slate-500 ring-slate-200/80 line-through'
            : `${meta.light} hover:brightness-[0.98]`
      } ${compact ? 'text-[10px]' : 'text-[11px]'} ${className}`}
      title={event.title}
    >
      <span className={`absolute left-0 top-0 h-full w-0.5 ${accentBar}`} />
      <span className={`mt-1 ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${overdue ? 'bg-red-500' : meta.dot}`} />
      <span className="min-w-0 flex-1 truncate font-medium">
        {!event.allDay && !compact && (
          <span className="mr-1 font-bold opacity-70">{formatEventTime(event)}</span>
        )}
        {event.title}
      </span>
    </button>
  )
}
