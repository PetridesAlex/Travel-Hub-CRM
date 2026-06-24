import {
  CalendarCheck, FileText, MapPin, Repeat, Send, TrendingUp, Wallet,
} from 'lucide-react'
import { formatCurrency } from '../../utils/format'

const SOURCE_STYLES = {
  booking: {
    dot: 'bg-sky-500 ring-sky-100',
    badge: 'bg-sky-50 text-sky-800 ring-sky-100',
    label: 'Booked',
    icon: CalendarCheck,
  },
  quotation: {
    dot: 'bg-violet-500 ring-violet-100',
    badge: 'bg-violet-50 text-violet-800 ring-violet-100',
    label: 'Quoted',
    icon: FileText,
  },
  lead: {
    dot: 'bg-teal-500 ring-teal-100',
    badge: 'bg-teal-50 text-teal-800 ring-teal-100',
    label: 'Inquiry',
    icon: MapPin,
  },
}

function InsightCard({ icon: Icon, label, value, accent = 'slate' }) {
  const accents = {
    teal: 'border-teal-100/80 bg-gradient-to-br from-teal-50/60 to-white',
    violet: 'border-violet-100/80 bg-gradient-to-br from-violet-50/60 to-white',
    sky: 'border-sky-100/80 bg-gradient-to-br from-sky-50/60 to-white',
    amber: 'border-amber-100/80 bg-gradient-to-br from-amber-50/60 to-white',
  }
  const iconAccents = {
    teal: 'bg-teal-600 text-white',
    violet: 'bg-violet-600 text-white',
    sky: 'bg-sky-600 text-white',
    amber: 'bg-amber-500 text-white',
  }

  return (
    <div className={`rounded-xl border p-3.5 shadow-sm ${accents[accent]}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ${iconAccents[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function ClientTimeline({
  clientName,
  timeline = [],
  insights,
  onSelectEntry,
}) {
  const hasTimeline = timeline.length > 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-teal-50/30 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-600">Client timeline</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              {clientName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Travel history, pipeline, and lifetime value at a glance
            </p>
          </div>
          {insights?.isRepeatTraveler && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
              <Repeat className="h-3.5 w-3.5" />
              Repeat traveler
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_280px]">
        {/* Timeline */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Travel history</p>
          {hasTimeline ? (
            <ol className="relative space-y-0 border-l-2 border-slate-100 pl-5">
              {timeline.map((entry, index) => {
                const style = SOURCE_STYLES[entry.sourceType] || SOURCE_STYLES.lead
                const Icon = style.icon
                const isLast = index === timeline.length - 1

                return (
                  <li key={entry.id} className={`relative ${isLast ? '' : 'pb-5'}`}>
                    <span
                      className={`absolute -left-[1.65rem] top-1 flex h-3 w-3 rounded-full ring-4 ${style.dot}`}
                    />
                    <button
                      type="button"
                      onClick={() => onSelectEntry?.(entry)}
                      className="group w-full rounded-xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50/80"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-slate-900">
                          {entry.year || '—'}
                        </span>
                        <span className="text-slate-300">—</span>
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-800">
                          {entry.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.badge}`}>
                          <Icon className="h-3 w-3" />
                          {style.label}
                        </span>
                      </div>
                      {entry.meta && (
                        <p className="mt-1 text-xs text-slate-500">{entry.meta}</p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
              <MapPin className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">No travel history yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Trips appear here from bookings, quotations, and leads
              </p>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sales insights</p>
          <InsightCard
            icon={Send}
            label="Quotations sent"
            value={insights?.quotationsSent ?? 0}
            accent="violet"
          />
          <InsightCard
            icon={Wallet}
            label="Lifetime spend"
            value={formatCurrency(insights?.lifetimeSpend ?? 0, insights?.currency || 'EUR')}
            accent="teal"
          />
          <InsightCard
            icon={CalendarCheck}
            label="Trips booked"
            value={insights?.completedTrips ?? 0}
            accent="sky"
          />
          {insights?.activeLeads > 0 && (
            <InsightCard
              icon={TrendingUp}
              label="Active inquiries"
              value={insights.activeLeads}
              accent="amber"
            />
          )}
        </div>
      </div>
    </div>
  )
}
