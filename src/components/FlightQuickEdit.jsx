import Input from './ui/Input'

/** Compact edit form — only shown when user clicks "Edit details" */
export default function FlightQuickEdit({ flightData, price, currency, onChange, onPriceChange, onCurrencyChange }) {
  function updateLeg(index, field, value) {
    onChange({
      ...flightData,
      legs: flightData.legs.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)),
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-medium text-amber-800">Fix anything the screenshot reader got wrong:</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Adults" type="number" min="0" value={flightData.adults} onChange={(e) => onChange({ ...flightData, adults: Number(e.target.value) })} />
        <Input label="Children" type="number" min="0" value={flightData.children} onChange={(e) => onChange({ ...flightData, children: Number(e.target.value) })} />
        <Input label="Infants" type="number" min="0" value={flightData.infants} onChange={(e) => onChange({ ...flightData, infants: Number(e.target.value) })} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Total Price" type="number" step="0.01" value={price} onChange={(e) => onPriceChange(e.target.value)} />
        <Input label="Currency" value={currency} onChange={(e) => onCurrencyChange(e.target.value)} />
        <Input label="Fare Name" value={flightData.fareName} onChange={(e) => onChange({ ...flightData, fareName: e.target.value })} />
      </div>

      {flightData.legs?.map((leg, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase text-teal-700">{leg.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Date" value={[leg.dayOfWeek, leg.date].filter(Boolean).join(', ')} onChange={(e) => {
              const value = e.target.value.trim()
              const weekdayMatch = value.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(.+)$/i)
              onChange({
                ...flightData,
                legs: flightData.legs.map((l, i) => {
                  if (i !== index) return l
                  if (weekdayMatch) {
                    return {
                      ...l,
                      dayOfWeek: weekdayMatch[1].slice(0, 3),
                      date: weekdayMatch[2].trim(),
                    }
                  }
                  return { ...l, dayOfWeek: '', date: value }
                }),
              })
            }} placeholder="Wed, 11 Jun" />
            <Input label="From → To" value={`${leg.from} → ${leg.to}`} onChange={(e) => {
              const [from, to] = e.target.value.split('→').map((s) => s.trim())
              onChange({
                ...flightData,
                legs: flightData.legs.map((l, i) => i === index ? { ...l, from: from || l.from, to: to || l.to } : l),
              })
            }} />
            <Input label="Depart" value={leg.departureTime} onChange={(e) => updateLeg(index, 'departureTime', e.target.value)} />
            <Input label="Arrive" value={leg.arrivalTime} onChange={(e) => updateLeg(index, 'arrivalTime', e.target.value)} />
            <Input label="Flight" value={leg.flightNumber} onChange={(e) => updateLeg(index, 'flightNumber', e.target.value)} />
            <Input label="Duration" value={leg.duration} onChange={(e) => updateLeg(index, 'duration', e.target.value)} />
            <Input label="Airline" value={leg.airline} onChange={(e) => updateLeg(index, 'airline', e.target.value)} />
            <Input label="Stops" value={leg.stops} onChange={(e) => updateLeg(index, 'stops', e.target.value)} />
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Inclusions (one per line)</label>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={(flightData.inclusions || []).join('\n')}
          onChange={(e) => onChange({ ...flightData, inclusions: e.target.value.split('\n').filter(Boolean) })}
          placeholder="Priority boarding&#10;20kg checked bag"
        />
      </div>
    </div>
  )
}
