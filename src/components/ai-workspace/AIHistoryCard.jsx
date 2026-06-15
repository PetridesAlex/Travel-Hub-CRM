import {
  Plane, Ship, Building2, Map, Mail, Calculator, Truck, CreditCard, Bot,
  Copy, Check, Eye, Trash2, Loader2,
} from 'lucide-react'
import { labelFor } from '../../utils/format'
import { AI_TEMPLATE_CATEGORIES } from '../../constants/aiTemplateFields'

const AGENT_ICONS = {
  flight: Plane,
  cruise: Ship,
  hotel: Building2,
  itinerary: Map,
  email: Mail,
  costing: Calculator,
  supplier: Truck,
  payment: CreditCard,
}

const CATEGORY_ACCENTS = {
  flight_offer: 'ai-history-card--teal',
  cruise_offer: 'ai-history-card--blue',
  hotel_client_quote: 'ai-history-card--violet',
  hotel_request: 'ai-history-card--violet',
  honeymoon_offer: 'ai-history-card--pink',
  costing: 'ai-history-card--amber',
  payment_reminder: 'ai-history-card--rose',
  supplier_request: 'ai-history-card--indigo',
  itinerary: 'ai-history-card--emerald',
  general_email: 'ai-history-card--slate',
  follow_up: 'ai-history-card--slate',
}

export default function AIHistoryCard({
  generation,
  clientLabel,
  dateLabel,
  onView,
  onCopy,
  onDelete,
  deleting = false,
  copied = false,
}) {
  const agentCategory = generation.ai_agents?.category || 'email'
  const Icon = AGENT_ICONS[agentCategory] || Bot
  const accent = CATEGORY_ACCENTS[generation.generation_type] || 'ai-history-card--slate'
  const categoryLabel = labelFor(AI_TEMPLATE_CATEGORIES, generation.generation_type)
  const preview = (generation.generated_output || '').trim()
  const truncated = preview.length > 280 ? `${preview.slice(0, 280)}…` : preview

  return (
    <article className={`ai-history-card group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg ${accent}`}>
      <div className="ai-history-card-accent pointer-events-none absolute inset-y-0 left-0 w-1" aria-hidden />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="ai-history-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {generation.ai_templates?.name || 'Generation'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {generation.ai_agents?.name}
              <span className="mx-1.5 text-slate-300">·</span>
              {categoryLabel}
              <span className="mx-1.5 text-slate-300">·</span>
              {dateLabel}
            </p>
            {clientLabel && (
              <span className="ai-history-client-chip mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                {clientLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onView(generation)}
            className="ai-history-action-btn"
            title="View full output"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>
          <button
            type="button"
            onClick={() => onCopy(generation.generated_output || '')}
            className="ai-history-action-btn"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(generation)}
            disabled={deleting}
            className="ai-history-action-btn ai-history-action-btn--danger"
            title="Delete generation"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {truncated && (
        <p className="ai-history-preview mt-4 line-clamp-4 text-sm leading-relaxed text-slate-600">
          {truncated}
        </p>
      )}
    </article>
  )
}
