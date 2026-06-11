import { Pencil, Plane, ArrowRight, Users, Tag, ScanLine } from 'lucide-react'
import { formatCityWithCode, formatLegDate, formatPassengerSummary, buildRouteLabel } from '../utils/parseFlightScreenshot'
import { formatFlightSummaryPrice } from '../utils/formatFlightEmail'

function LegPreview({ leg, index }) {
  const dateLine = formatLegDate(leg)
  const label = (leg.label || 'Flight').toUpperCase()
  const hasRoute = leg.from || leg.to || leg.fromCode || leg.toCode

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
        </div>
        <span className="text-xs font-medium text-slate-500">{dateLine !== '—' ? dateLine : 'Date TBC'}</span>
      </div>

      <div className="px-4 py-5">
        <div className="flex items-stretch gap-2 sm:gap-4">
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Depart</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
              {leg.departureTime || '—'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatCityWithCode(leg.from, leg.fromCode) !== '—'
                ? formatCityWithCode(leg.from, leg.fromCode)
                : 'Origin TBC'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center px-1 sm:px-3">
            <div className="flex w-full items-center gap-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 shadow-sm">
                <Plane className="h-3.5 w-3.5 rotate-90 text-white" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
            </div>
            {leg.duration && (
              <p className="mt-2 text-[11px] font-medium text-slate-400">{leg.duration}</p>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Arrive</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
              {leg.arrivalTime || '—'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatCityWithCode(leg.to, leg.toCode) !== '—'
                ? formatCityWithCode(leg.to, leg.toCode)
                : 'Destination TBC'}
            </p>
          </div>
        </div>

        {(leg.flightNumber || leg.airline || leg.stops) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-4">
            {leg.flightNumber && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {leg.flightNumber}
              </span>
            )}
            {leg.airline && (
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                {leg.airline}
              </span>
            )}
            {leg.stops && (
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                {leg.stops}
              </span>
            )}
          </div>
        )}

        {!hasRoute && (
          <p className="mt-3 text-center text-xs text-amber-700">
            Route details incomplete — use Edit details to confirm cities and airports.
          </p>
        )}
      </div>
    </div>
  )
}

export default function FlightQuotationPreview({ flightData, price, onEdit }) {
  if (!flightData) return null

  const routeLabel = buildRouteLabel(flightData)
  const displayPrice = formatFlightSummaryPrice(flightData, price)
  const passengerSummary = formatPassengerSummary(flightData)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

      {/* Header */}
      <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 ring-1 ring-teal-400/30">
              <ScanLine className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Extracted quotation</p>
              <p className="mt-0.5 text-base font-semibold tracking-tight text-white">
                {routeLabel || 'Route pending confirmation'}
              </p>
              {!routeLabel && (
                <p className="mt-1 text-xs text-slate-400">
                  OCR may miss city names — edit details to complete the route.
                </p>
              )}
            </div>
          </div>
          {displayPrice && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
              <p className="text-xl font-bold tabular-nums tracking-tight text-white">{displayPrice}</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
            <ArrowRight className="h-3 w-3" />
            {flightData.tripType || 'Return'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
            <Users className="h-3 w-3" />
            {passengerSummary}
          </span>
          {flightData.fareName && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-2.5 py-1 text-xs font-semibold text-teal-200 ring-1 ring-teal-400/20">
              <Tag className="h-3 w-3" />
              {flightData.fareName}
            </span>
          )}
        </div>
      </div>

      {/* Legs */}
      <div className="space-y-3 bg-gradient-to-b from-slate-50/50 to-white p-4 sm:p-5">
        {flightData.legs?.map((leg, i) => (
          <LegPreview key={i} leg={leg} index={i} />
        ))}
      </div>

      {onEdit && (
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-teal-800 hover:ring-teal-200"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit flight details
          </button>
        </div>
      )}
    </div>
  )
}
