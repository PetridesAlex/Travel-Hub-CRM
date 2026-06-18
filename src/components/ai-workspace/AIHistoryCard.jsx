import { useState } from 'react'
import {
  Plane, Ship, Building2, Map, Mail, Calculator, Truck, CreditCard, Bot,
  Copy, Check, Eye, Trash2, Loader2, ChevronDown, MailOpen,
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
  flight_offer: 'ai-envelope--teal',
  cruise_offer: 'ai-envelope--blue',
  hotel_client_quote: 'ai-envelope--violet',
  hotel_request: 'ai-envelope--violet',
  honeymoon_offer: 'ai-envelope--pink',
  costing: 'ai-envelope--amber',
  payment_reminder: 'ai-envelope--rose',
  supplier_request: 'ai-envelope--indigo',
  itinerary: 'ai-envelope--emerald',
  general_email: 'ai-envelope--slate',
  follow_up: 'ai-envelope--slate',
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
  const [open, setOpen] = useState(false)
  const agentCategory = generation.ai_agents?.category || 'email'
  const Icon = AGENT_ICONS[agentCategory] || Bot
  const accent = CATEGORY_ACCENTS[generation.generation_type] || 'ai-envelope--slate'
  const categoryLabel = labelFor(AI_TEMPLATE_CATEGORIES, generation.generation_type)
  const templateName = generation.ai_templates?.name || 'Generation'
  const preview = (generation.generated_output || '').trim()
  const truncated = preview.length > 420 ? `${preview.slice(0, 420)}…` : preview

  return (
    <article className={`ai-envelope group ${accent} ${open ? 'ai-envelope--open' : ''}`}>
      <div className="ai-envelope-flap" aria-hidden />
      <div className="ai-envelope-seal" aria-hidden>
        <MailOpen className="h-3.5 w-3.5" />
      </div>

      <button
        type="button"
        className="ai-envelope-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="ai-envelope-header-inner">
          <div className="ai-envelope-icon">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <span className="ai-envelope-category">{categoryLabel}</span>
            <h3 className="ai-envelope-title">{templateName}</h3>
            <p className="ai-envelope-meta">
              {generation.ai_agents?.name}
              <span className="mx-1.5 opacity-50">·</span>
              {dateLabel}
            </p>
            {clientLabel && (
              <span className="ai-envelope-client">{clientLabel}</span>
            )}
          </div>
          <span className={`ai-envelope-chevron ${open ? 'ai-envelope-chevron--open' : ''}`}>
            <ChevronDown className="h-5 w-5" />
          </span>
        </div>
        {!open && truncated && (
          <p className="ai-envelope-teaser">{truncated.slice(0, 90)}{truncated.length > 90 ? '…' : ''}</p>
        )}
      </button>

      <div className="ai-envelope-letter" hidden={!open}>
        <div className="ai-envelope-letter-inner">
          {truncated ? (
            <p className="ai-envelope-preview whitespace-pre-wrap">{truncated}</p>
          ) : (
            <p className="ai-envelope-preview text-slate-400 italic">No content saved.</p>
          )}
          <div className="ai-envelope-actions">
            <button
              type="button"
              onClick={() => onView(generation)}
              className="ai-history-action-btn"
              title="View full output"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => onCopy(generation.generated_output || '')}
              className="ai-history-action-btn"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(generation)}
              disabled={deleting}
              className="ai-history-action-btn ai-history-action-btn--danger"
              title="Delete generation"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
