import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, Loader2, Search, Sparkles, Filter, AlertTriangle, Copy, Check, Trash2 } from 'lucide-react'
import { getGenerations, deleteGeneration } from '../../services/aiGenerations'
import { getAgents } from '../../services/aiAgents'
import { getClients } from '../../services/clients'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import AIHistoryHero from '../../components/ai-workspace/AIHistoryHero'
import AIHistoryCard from '../../components/ai-workspace/AIHistoryCard'
import { AI_TEMPLATE_CATEGORIES } from '../../constants/aiTemplateFields'
import { formatClientName, formatDateTime, labelFor } from '../../utils/format'

export default function AIHistory() {
  const [generations, setGenerations] = useState([])
  const [agents, setAgents] = useState([])
  const [clients, setClients] = useState([])
  const [agentFilter, setAgentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return generations
    return generations.filter((gen) => {
      const haystack = [
        gen.ai_templates?.name,
        gen.ai_agents?.name,
        labelFor(AI_TEMPLATE_CATEGORIES, gen.generation_type),
        gen.generated_output,
        gen.clients ? formatClientName(gen.clients) : '',
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [generations, search])

  async function handleCopy(text, id) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setDeleteError('')
    setDeletingId(confirmDelete.id)
    try {
      await deleteGeneration(confirmDelete.id)
      setGenerations((prev) => prev.filter((g) => g.id !== confirmDelete.id))
      if (viewing?.id === confirmDelete.id) setViewing(null)
      setConfirmDelete(null)
    } catch (err) {
      setDeleteError(err.message || 'Could not delete generation.')
    } finally {
      setDeletingId(null)
    }
  }

  const agentOptions = [{ value: '', label: 'All agents' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]
  const categoryOptions = [{ value: '', label: 'All categories' }, ...AI_TEMPLATE_CATEGORIES]
  const clientOptions = [{ value: '', label: 'All clients' }, ...clients.map((c) => ({ value: c.id, label: formatClientName(c) }))]
  const hasActiveFilters = Boolean(agentFilter || categoryFilter || clientFilter || search.trim())

  return (
    <div className="mx-auto max-w-[90rem] space-y-5">
      <AIHistoryHero total={generations.length} />

      <div className="ai-history-filters rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filter archive
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-slate-400" />
            <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search output, template, agent…"
              className="ai-history-search w-full"
            />
          </div>
          <Select label="Agent" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} options={agentOptions} />
          <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={categoryOptions} />
          <Select label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} options={clientOptions} />
        </div>
        {hasActiveFilters && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {filtered.length} of {generations.length} generations
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Loading your generation archive…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ai-history-empty rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
            <History className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {hasActiveFilters ? 'No matches found' : 'No generations yet'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {hasActiveFilters
              ? 'Try adjusting your filters or search term.'
              : 'Use the AI Generator to create emails, quotes, and proposals — they appear here automatically.'}
          </p>
          {!hasActiveFilters && (
            <Link
              to="/ai-workspace/generator"
              className="ai-history-cta mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Sparkles className="h-4 w-4" />
              Open AI Generator
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((gen) => (
            <AIHistoryCard
              key={gen.id}
              generation={gen}
              clientLabel={gen.clients ? formatClientName(gen.clients) : ''}
              dateLabel={formatDateTime(gen.created_at)}
              onView={setViewing}
              onCopy={(text) => handleCopy(text, gen.id)}
              onDelete={setConfirmDelete}
              deleting={deletingId === gen.id}
              copied={copiedId === gen.id}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.ai_templates?.name || 'Generation'}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{viewing?.ai_agents?.name}</span>
            <span>·</span>
            <span>{labelFor(AI_TEMPLATE_CATEGORIES, viewing?.generation_type)}</span>
            <span>·</span>
            <span>{formatDateTime(viewing?.created_at)}</span>
          </div>
          <textarea
            className="ai-history-modal-output w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-800"
            rows={16}
            readOnly
            value={viewing?.generated_output || ''}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleCopy(viewing?.generated_output || '', viewing?.id)}>
              {copiedId === viewing?.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedId === viewing?.id ? 'Copied' : 'Copy to clipboard'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmDelete(viewing)
                setViewing(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => !deletingId && setConfirmDelete(null)}
        title="Delete generation?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Remove &ldquo;{confirmDelete?.ai_templates?.name || 'this generation'}&rdquo;?
              </p>
              <p className="mt-1 text-sm text-slate-600">
                This cannot be undone. The saved output will be permanently deleted from your archive.
              </p>
            </div>
          </div>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="!bg-red-600 hover:!bg-red-700"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deletingId ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
