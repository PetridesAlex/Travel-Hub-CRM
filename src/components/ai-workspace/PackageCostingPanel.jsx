import { Building2, Users, Calendar, TrendingDown, Calculator, CheckCircle2 } from 'lucide-react'

function HotelOptionCard({ label, hotel, accent, selected, onSelect }) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50/60',
    orange: 'border-orange-200 bg-orange-50/60',
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[accent]} ${selected ? 'ring-2 ring-amber-400/50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{hotel.name || 'Enter hotel name'}</p>
        </div>
        {hotel.total && onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              selected
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100'
            }`}
          >
            {selected ? 'Selected' : 'Use'}
          </button>
        )}
      </div>
      {hotel.room && <p className="mt-2 text-xs text-slate-600">{hotel.room}{hotel.mealPlan ? ` · ${hotel.mealPlan}` : ''}</p>}
      {hotel.total ? (
        <div className="mt-3">
          <p className="text-2xl font-bold text-slate-900">{hotel.total}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-600">
            {hotel.perNight && <span>{hotel.perNight}/night</span>}
            {hotel.perPerson && <span>{hotel.perPerson}/person</span>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Enter rate or upload screenshot</p>
      )}
    </div>
  )
}

export default function PackageCostingPanel({ view, onSelectHotel }) {
  if (!view) return null
  if (!view.hasHotelA && !view.hasHotelB && !view.hasServices) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-4 text-sm text-amber-800">
        Enter hotel options and/or additional services (transfers, guides, insurance, excursions) to build the full package quote.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {view.packageName || 'Group package costing'}
          </h3>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
            {view.travelDates && (
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{view.travelDates}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {view.passengers} pax · {view.rooms} rooms · {view.nights} nights
            </span>
          </div>
        </div>
        {view.recommendedLabel && view.costSaving && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <TrendingDown className="h-3.5 w-3.5" />
            {view.recommendedLabel} saves {view.costSaving}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <HotelOptionCard
          label="Option A"
          hotel={view.hotelA}
          accent="amber"
          selected={view.selectedHotel === 'A'}
          onSelect={view.hasHotelA ? () => onSelectHotel?.('A') : undefined}
        />
        <HotelOptionCard
          label="Option B"
          hotel={view.hotelB}
          accent="orange"
          selected={view.selectedHotel === 'B'}
          onSelect={view.hasHotelB ? () => onSelectHotel?.('B') : undefined}
        />
      </div>

      {view.hasServices && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Additional services</p>
          <ul className="space-y-1.5">
            {view.extraServices.filter((s) => s.costRaw != null).map((service) => (
              <li key={service.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-700">{service.label}</span>
                <span className="font-semibold text-slate-900">
                  {service.cost}
                  {service.perPerson && <span className="ml-1 text-xs font-normal text-slate-500">({service.perPerson}/person)</span>}
                </span>
              </li>
            ))}
          </ul>
          {view.servicesTotal && (
            <p className="mt-3 border-t border-slate-200 pt-2 text-sm font-semibold text-slate-800">
              Services subtotal: {view.servicesTotal}
            </p>
          )}
        </div>
      )}

      {view.sellingPrice && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
            <Calculator className="h-4 w-4" />
            Package selling price ({view.markup.percent}% markup on full net)
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {view.hotelNetCost && (
              <div>
                <p className="text-[10px] uppercase text-slate-500">Hotel net</p>
                <p className="text-lg font-bold text-slate-900">{view.hotelNetCost}</p>
              </div>
            )}
            {view.servicesTotal && (
              <div>
                <p className="text-[10px] uppercase text-slate-500">Services</p>
                <p className="text-lg font-bold text-slate-900">{view.servicesTotal}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase text-slate-500">Package net</p>
              <p className="text-lg font-bold text-slate-900">{view.packageNetCost}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Markup</p>
              <p className="text-lg font-bold text-slate-900">{view.markup.amount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Selling price</p>
              <p className="text-lg font-bold text-emerald-800">{view.sellingPrice}</p>
              {view.sellingPerPerson && <p className="text-xs text-slate-600">{view.sellingPerPerson}/person</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 border-t border-emerald-100 pt-3 text-sm">
            <span className="text-slate-600">Profit: <span className="font-bold text-emerald-800">{view.profit}</span></span>
            {view.marginPercent && <span className="text-slate-600">Margin: <span className="font-bold text-emerald-800">{view.marginPercent}</span></span>}
          </div>
        </div>
      )}

      {view.recommendedLabel && (
        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Best value for group operations: <span className="font-semibold text-slate-800">{view.recommendedLabel}</span>
        </p>
      )}
    </div>
  )
}
