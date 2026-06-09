import { Building2, Calendar, Users, BedDouble, Coffee, TrendingDown } from 'lucide-react'

function RateCell({ label, platform, total, perNight, accent }) {
  const styles = {
    violet: 'border-violet-200 bg-violet-50/60',
    sky: 'border-sky-200 bg-sky-50/60',
    teal: 'border-teal-200 bg-teal-50/60',
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[accent]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{platform}</p>
      {total ? (
        <>
          <p className="mt-3 text-2xl font-bold text-slate-900">{total}</p>
          {perNight && (
            <p className="mt-1 text-sm text-slate-600">{perNight} / night</p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Upload screenshot</p>
      )}
    </div>
  )
}

function Detail({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm text-slate-700">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <span className="text-slate-500">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  )
}

export default function HotelRateComparisonPanel({ comparison, loading }) {
  if (!comparison && !loading) return null

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Reading screenshots and comparing rates…
      </div>
    )
  }

  const c = comparison
  const hasAnyRate = c.hasSupplierRate || c.hasBookingRate

  if (!hasAnyRate) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
        Could not read prices from the screenshots. Try a clearer crop showing the total amount and dates.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          {c.hotelName || 'Hotel comparison'}
          {c.starRating ? ` · ${c.starRating}` : ''}
        </h3>
        {c.destination && (
          <p className="text-sm text-slate-500">{c.destination}</p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Detail icon={Calendar} label="Check-in" value={c.checkIn} />
        <Detail icon={Calendar} label="Check-out" value={c.checkOut} />
        <Detail icon={Calendar} label="Stay" value={c.nights ? `${c.nights} night${c.nights === 1 ? '' : 's'}` : c.travelDates} />
        <Detail icon={Users} label="Guests" value={c.guests} />
        <Detail icon={BedDouble} label="Room" value={c.roomType || c.roomDetails} />
        <Detail icon={Coffee} label="Board" value={[c.mealPlan, c.breakfastIncluded].filter(Boolean).join(' · ')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <RateCell
          label="Supplier net"
          platform={c.supplier.platform}
          total={c.supplier.total}
          perNight={c.supplier.perNight}
          accent="violet"
        />
        <RateCell
          label="Public booking"
          platform={c.booking.platform}
          total={c.booking.total}
          perNight={c.booking.perNight}
          accent="sky"
        />
        <RateCell
          label={`Your quote (+${c.margin.percent}%)`}
          platform="Client price"
          total={c.clientQuote.total}
          perNight={c.clientQuote.perNight}
          accent="teal"
        />
      </div>

      {(c.priceWarnings?.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
          <p className="font-semibold">Price adjusted — please verify</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {c.priceWarnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      {(c.savingsVsBooking || c.netVsPublicDiff) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            {c.savingsVsBooking && (
              <p className="font-semibold">Client saves {c.savingsVsBooking} vs {c.booking.platform}</p>
            )}
            {c.netVsPublicDiff && c.netVsPublicCheaper === 'supplier' && (
              <p className="text-emerald-800">Wholesale net is {c.netVsPublicDiff} below public rate — margin room: {c.margin.amount}</p>
            )}
          </div>
        </div>
      )}

      {(c.cancellationPolicy || c.taxesAndFees || c.additionalNotes) && (
        <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
          {c.cancellationPolicy && <p><span className="font-medium">Cancellation:</span> {c.cancellationPolicy}</p>}
          {c.taxesAndFees && <p><span className="font-medium">Taxes/fees:</span> {c.taxesAndFees}</p>}
          {c.additionalNotes && <p><span className="font-medium">Notes:</span> {c.additionalNotes}</p>}
        </div>
      )}

      {!c.hotelName && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Building2 className="h-3.5 w-3.5" />
          Upload clearer screenshots if hotel name or dates are missing.
        </p>
      )}
    </div>
  )
}
