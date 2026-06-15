import {
  Plane, Ship, Building2, Map, Mail, Calculator, Truck, CreditCard, Bot, FileStack,
  ChevronDown, Check, Link2, Users,
} from 'lucide-react'
import { useState } from 'react'

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

const AGENT_ACCENTS = {
  flight: 'ai-gen-agent--sky',
  cruise: 'ai-gen-agent--blue',
  hotel: 'ai-gen-agent--violet',
  itinerary: 'ai-gen-agent--emerald',
  email: 'ai-gen-agent--teal',
  costing: 'ai-gen-agent--amber',
  supplier: 'ai-gen-agent--indigo',
  payment: 'ai-gen-agent--rose',
}

function StepHeader({ step, title, subtitle, done }) {
  return (
    <div className="ai-gen-step-header">
      <div className={`ai-gen-step-badge ${done ? 'ai-gen-step-badge--done' : ''}`}>
        {done ? <Check className="h-3 w-3" /> : step}
      </div>
      <div className="min-w-0">
        <p className="ai-gen-step-title">{title}</p>
        {subtitle && <p className="ai-gen-step-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function AIGeneratorSetupPanel({
  agents,
  compatibleTemplates,
  clients,
  leads,
  agentId,
  templateId,
  clientId,
  leadId,
  selectedAgent,
  selectedTemplate,
  onAgentChange,
  onTemplateChange,
  onClientChange,
  onLeadChange,
}) {
  const [linksOpen, setLinksOpen] = useState(false)
  const step = selectedTemplate ? 3 : selectedAgent ? 2 : 1

  return (
    <aside className="ai-gen-setup flex max-h-[calc(100vh-10rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xl">
      <div className="ai-gen-setup-header shrink-0 px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-violet-600/80">Workspace setup</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Configure your AI session</p>
        <div className="ai-gen-progress mt-3">
          <div className="ai-gen-progress-track">
            <div className="ai-gen-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-slate-500">Step {step} of 3</p>
        </div>
      </div>

      <div className="ai-gen-setup-body flex-1 space-y-5 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
        <section>
          <StepHeader
            step={1}
            title="Choose specialist"
            subtitle="Select the AI expert for your task"
            done={Boolean(selectedAgent)}
          />
          <div className="ai-gen-agent-list mt-3 space-y-1.5">
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.category] || Bot
              const active = agentId === agent.id
              const accent = AGENT_ACCENTS[agent.category] || AGENT_ACCENTS.email
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onAgentChange(agent.id)}
                  className={`ai-gen-agent-btn ${accent} ${active ? 'ai-gen-agent-btn--active' : ''}`}
                >
                  <span className="ai-gen-agent-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{agent.name}</p>
                    <p className="truncate text-[11px] capitalize opacity-70">{agent.category}</p>
                  </div>
                  {active && <span className="ai-gen-agent-check"><Check className="h-3 w-3" /></span>}
                </button>
              )
            })}
          </div>
        </section>

        {selectedAgent && (
          <section className="ai-gen-setup-divider pt-1">
            <StepHeader
              step={2}
              title="Select template"
              subtitle={`Templates for ${selectedAgent.name}`}
              done={Boolean(selectedTemplate)}
            />
            {compatibleTemplates.length === 0 ? (
              <p className="ai-gen-empty-note mt-3">
                No templates yet for this specialist. Add one in AI Templates.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {compatibleTemplates.map((t) => {
                  const active = templateId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTemplateChange(t.id)}
                      className={`ai-gen-template-btn ${active ? 'ai-gen-template-btn--active' : ''}`}
                    >
                      <FileStack className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{t.name}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
                    </button>
                  )
                })}
              </div>
            )}
            {selectedAgent.description && (
              <p className="mt-3 rounded-lg bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
                {selectedAgent.description}
              </p>
            )}
          </section>
        )}

        {selectedTemplate && (
          <section className="ai-gen-setup-divider pt-1">
            <button
              type="button"
              onClick={() => setLinksOpen((v) => !v)}
              className="ai-gen-links-toggle flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-violet-500" />
                Link client or lead
                <span className="text-[10px] font-normal text-slate-400">(optional)</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${linksOpen ? 'rotate-180' : ''}`} />
            </button>
            {linksOpen && (
              <div className="ai-gen-links-panel mt-2 space-y-2">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Users className="h-3 w-3" /> Client
                  </span>
                  <select value={clientId} onChange={(e) => onClientChange(e.target.value)} className="ai-gen-select w-full">
                    <option value="">No client linked</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name || c.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Lead</span>
                  <select value={leadId} onChange={(e) => onLeadChange(e.target.value)} className="ai-gen-select w-full">
                    <option value="">No lead linked</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.destination || `Lead ${l.id.slice(0, 8)}`}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  )
}
