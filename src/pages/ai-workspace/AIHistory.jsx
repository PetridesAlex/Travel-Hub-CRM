import { useEffect, useMemo, useState } from 'react'
import { History, Copy, Check, Eye, Loader2 } from 'lucide-react'
import { getGenerations } from '../../services/aiGenerations'
import { getAgents } from '../../services/aiAgents'
import { getClients } from '../../services/clients'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { AI_TEMPLATE_CATEGORIES } from '../../constants/aiTemplateFields'
import { formatClientName, formatDateTime, labelFor } from '../../utils/format'

export default function AIHistory() {
  const [generations, setGenerations] = useState([])
  const [agents, setAgents] = useState([])
  const [clients, setClients] = useState([])
  const [agentFilter, setAgentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    loadGenerations()
  }, [agentFilter, categoryFilter, clientFilter])

  async function loadFilters() {
    const [agentsData, clientsData] = await Promise.all([getAgents(), getClients()])
    setAgents(agentsData)
    setClients(clientsData)
  }

  async function loadGenerations() {
    try {
      setLoading(true)
      const data = await getGenerations({
        agentId: agentFilter,
        category: categoryFilter,
        clientId: clientFilter,
      })
      setGenerations(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => generations, [generations])

  async function handleCopy(text) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const agentOptions = [{ value: '', label: 'All agents' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]
  const categoryOptions = [{ value: '', label: 'All categories' }, ...AI_TEMPLATE_CATEGORIES]
  const clientOptions = [{ value: '', label: 'All clients' }, ...clients.map((c) => ({ value: c.id, label: formatClientName(c) }))]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white">
          <History className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">AI History</h2>
          <p className="text-sm text-slate-500">Previous AI generations saved automatically</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Agent" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} options={agentOptions} />
        <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={categoryOptions} />
        <Select label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} options={clientOptions} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">
          No generations yet. Use the AI Generator to create content.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((gen) => (
            <div
              key={gen.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{gen.ai_templates?.name || 'Generation'}</p>
                  <p className="text-xs text-slate-500">
                    {gen.ai_agents?.name} · {labelFor(AI_TEMPLATE_CATEGORIES, gen.generation_type)} · {formatDateTime(gen.created_at)}
                  </p>
                  {gen.clients && (
                    <span className="mt-2 inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                      {formatClientName(gen.clients)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setViewing(gen)}>
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(gen.generated_output || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap text-sm text-slate-600">
                {(gen.generated_output || '').slice(0, 300)}{(gen.generated_output || '').length > 300 ? '…' : ''}
              </pre>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.ai_templates?.name || 'Generation'}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{formatDateTime(viewing?.created_at)}</p>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed"
            rows={16}
            readOnly
            value={viewing?.generated_output || ''}
          />
          <Button onClick={() => handleCopy(viewing?.generated_output || '')}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
