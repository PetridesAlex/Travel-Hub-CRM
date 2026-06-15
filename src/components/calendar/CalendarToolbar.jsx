import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { CALENDAR_VIEWS } from '../../constants/calendarConstants'
import Button from '../ui/Button'

export default function CalendarToolbar({
  view,
  title,
  onViewChange,
  onNavigate,
  onToday,
  onNewEvent,
  onToggleAi,
  aiOpen,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-50/80 p-1">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                view === v.id
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => onNavigate('prev')}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-white hover:shadow-sm"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate('next')}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAi}
          className={aiOpen ? 'bg-violet-50 text-violet-800 ring-1 ring-violet-200' : ''}
        >
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>
        <Button size="sm" onClick={onNewEvent} className="shadow-md shadow-teal-600/20">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>
    </div>
  )
}
