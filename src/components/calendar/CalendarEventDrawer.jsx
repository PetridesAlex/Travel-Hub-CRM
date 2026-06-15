import { Link } from 'react-router-dom'
import {
  X, ExternalLink, CheckCircle2, Trash2, Pencil, MapPin, User, Clock,
} from 'lucide-react'
import { EVENT_TYPE_META } from '../../constants/calendarConstants'
import { formatDateTime } from '../../utils/format'
import { formatEventTime, isEventOverdue, parseEventDate } from '../../utils/calendarHelpers'
import Button from '../ui/Button'

export default function CalendarEventDrawer({
  event,
  onClose,
  onEdit,
  onDelete,
  onMarkComplete,
}) {
  if (!event) return null

  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.custom
  const overdue = isEventOverdue(event)
  const start = parseEventDate(event.start)
  const end = parseEventDate(event.end || event.start)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200/80 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                overdue ? 'bg-red-500/20 text-red-100 ring-red-400/30' : 'bg-white/10 text-white/90 ring-white/20'
              }`}>
                {meta.label}
              </span>
              <h3 className="mt-2 text-lg font-bold leading-snug">{event.title}</h3>
              {event.clientName && event.clientName !== '—' && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                  <User className="h-3.5 w-3.5" />
                  {event.clientName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {event.allDay ? 'All day' : `${formatEventTime(event)}${end && !event.allDay ? ` – ${formatDateTime(end).split(' ').slice(-1)[0]}` : ''}`}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {start ? formatDateTime(start).replace(/ \d{2}:\d{2}$/, event.allDay ? '' : ` ${formatEventTime(event)}`) : '—'}
                </p>
                {overdue && (
                  <p className="mt-1 text-xs font-semibold text-red-600">Overdue — needs attention</p>
                )}
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{event.location}</span>
              </div>
            )}

            {event.description && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Details</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {event.sourceType === 'task' && event.meta?.status !== 'completed' && (
              <Button size="sm" onClick={() => onMarkComplete?.(event)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark done
              </Button>
            )}
            {event.editable && event.sourceType === 'calendar_event' && (
              <Button size="sm" variant="secondary" onClick={() => onEdit?.(event)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {event.deletable && (
              <Button size="sm" variant="ghost" onClick={() => onDelete?.(event)} className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            {event.href && (
              <Link to={event.href} className="inline-flex">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-4 w-4" />
                  Open in CRM
                </Button>
              </Link>
            )}
            {event.clientId && (
              <Link to={`/clients/${event.clientId}`} className="inline-flex">
                <Button size="sm" variant="ghost">
                  <User className="h-4 w-4" />
                  Client profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
