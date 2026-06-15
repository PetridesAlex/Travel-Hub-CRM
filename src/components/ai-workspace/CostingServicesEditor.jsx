import { Bus, Shield, MapPin, Plus, Trash2, UtensilsCrossed, Plane, Users, Sparkles } from 'lucide-react'

export const COSTING_SERVICE_PRESETS = [
  { id: 'transfer', label: 'Transfer', icon: Bus },
  { id: 'guide', label: 'Tour Guide', icon: Users },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'excursion', label: 'Excursion', icon: MapPin },
  { id: 'flight', label: 'Flight', icon: Plane },
  { id: 'coach', label: 'Coach / Bus', icon: Bus },
  { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
  { id: 'other', label: 'Other', icon: Sparkles },
]

function emptyService(category = 'Transfer') {
  return { id: crypto.randomUUID(), category, name: '', cost: '' }
}

export default function CostingServicesEditor({ services = [], onChange, passengers = 1 }) {
  function addService(category = 'Transfer') {
    onChange([...services, emptyService(category)])
  }

  function updateService(id, patch) {
    onChange(services.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeService(id) {
    onChange(services.filter((s) => s.id !== id))
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Additional services</p>
        <button
          type="button"
          onClick={() => addService('Other')}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          <Plus className="h-3 w-3" /> Add service
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {COSTING_SERVICE_PRESETS.map((preset) => {
          const Icon = preset.icon
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => addService(preset.label)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
            >
              <Icon className="h-3 w-3" />
              {preset.label}
            </button>
          )
        })}
      </div>

      {services.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
          Add transfers, tour guides, insurance, excursions, or any other net cost for the full package quote.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(110px,130px)_1fr_minmax(90px,110px)_auto] sm:items-center">
              <select
                className="ai-gen-select w-full text-xs"
                value={service.category}
                onChange={(e) => updateService(service.id, { category: e.target.value })}
              >
                {COSTING_SERVICE_PRESETS.map((p) => (
                  <option key={p.id} value={p.label}>{p.label}</option>
                ))}
                {!COSTING_SERVICE_PRESETS.some((p) => p.label === service.category) && (
                  <option value={service.category}>{service.category}</option>
                )}
              </select>
              <input
                className="ai-gen-field w-full text-xs"
                placeholder="Description — e.g. Airport transfers Paphos"
                value={service.name}
                onChange={(e) => updateService(service.id, { name: e.target.value })}
              />
              <input
                className="ai-gen-field w-full text-xs"
                placeholder="Net €"
                value={service.cost}
                onChange={(e) => updateService(service.id, { cost: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeService(service.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Remove service"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {services.length > 0 && passengers > 0 && (
        <p className="mt-2 text-[10px] text-slate-500">
          Service costs are added to the selected hotel net rate before markup is applied.
          {passengers > 1 ? ` Per-person figures use ${passengers} passengers.` : ''}
        </p>
      )}
    </div>
  )
}
