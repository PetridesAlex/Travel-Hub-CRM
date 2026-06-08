import { Pencil } from 'lucide-react'
import { formatCityWithCode, formatLegDate, formatPassengerSummary, buildRouteLabel } from '../utils/parseFlightScreenshot'
import { formatFlightSummaryPrice } from '../utils/formatFlightEmail'

function LegPreview({ leg }) {
  const dateLine = formatLegDate(leg)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-600">{leg.label || 'Flight'}</span>
        <span className="text-sm text-slate-500">{dateLine}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-2xl font-bold text-slate-900">{leg.departureTime || '—'}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatCityWithCode(leg.from, leg.fromCode)}</p>
        </div>

        <div className="flex flex-col items-center px-2">
          <div className="h-px w-12 bg-slate-300" />
          <p className="my-1 text-xs text-slate-400">{leg.duration || ''}</p>
          <div className="h-px w-12 bg-slate-300" />
        </div>

        <div className="flex-1 text-center">
          <p className="text-2xl font-bold text-slate-900">{leg.arrivalTime || '—'}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatCityWithCode(leg.to, leg.toCode)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {leg.flightNumber && <span className="rounded bg-slate-100 px-2 py-0.5">{leg.flightNumber}</span>}
        {leg.airline && <span className="rounded bg-slate-100 px-2 py-0.5">{leg.airline}</span>}
        {leg.stops && <span className="rounded bg-slate-100 px-2 py-0.5">{leg.stops}</span>}
      </div>
    </div>
  )
}

export default function FlightQuotationPreview({ flightData, price, onEdit }) {
  if (!flightData) return null

  const routeLabel = buildRouteLabel(flightData)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-teal-600 px-4 py-3 text-white">
        <p className="text-lg font-bold">{routeLabel || 'Route not detected'}</p>
        {!routeLabel && (
          <p className="mt-1 text-xs text-teal-100">Use Edit details to add cities — OCR may miss names in screenshots.</p>
        )}
        <p className="text-sm text-teal-100">
          {flightData.tripType} · {formatPassengerSummary(flightData)}
        </p>
        {(price || flightData.totalPrice) && (
          <p className="mt-2 text-xl font-bold">
            {formatFlightSummaryPrice(flightData, price)}
          </p>
        )}
      </div>

      {flightData.legs?.map((leg, i) => (
        <LegPreview key={i} leg={leg} />
      ))}

      {flightData.inclusions?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">What&apos;s Included</p>
          <ul className="space-y-1">
            {flightData.inclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-teal-600">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-sm text-teal-600 hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit details
        </button>
      )}
    </div>
  )
}
