import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ClipboardList, Search, Loader2, Sparkles, Bot,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
import { getForms, deleteForm, duplicateForm, getFormStats } from '../../services/forms'
import { importFormFromText, createAndPublishFormFromImport } from '../../services/formAiImport'
import FormAiAssistant from '../../components/forms/FormAiAssistant'
import FormCardGrid from '../../components/forms/FormCardGrid'
import Button from '../../components/ui/Button'

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'published', label: 'Live' },
  { id: 'archived', label: 'Archived' },
]

export default function Forms() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const [forms, setForms] = useState([])
  const [stats, setStats] = useState({})
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiOpen, setAiOpen] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResult, setAiResult] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await getForms(status)
      setForms(rows)
      const s = await getFormStats(rows.map((f) => f.id))
      setStats(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  const filtered = useMemo(() => {
    if (!search) return forms
    const q = search.toLowerCase()
    return forms.filter((f) =>
      f.title?.toLowerCase().includes(q)
      || f.description?.toLowerCase().includes(q),
    )
  }, [forms, search])

  const heroStats = useMemo(() => {
    const published = forms.filter((f) => f.status === 'published').length
    const responses = Object.values(stats).reduce((s, v) => s + (v.responses || 0), 0)
    return { total: forms.length, published, responses }
  }, [forms, stats])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this form and all responses?')) return
    await deleteForm(id)
    load()
  }

  const handleDuplicate = async (id) => {
    const copy = await duplicateForm(id, user.id)
    navigate(`/forms/${copy.id}/edit`)
  }

  async function handleAiGenerate(text) {
    if (!session?.access_token) {
      setAiError('You must be signed in to use the AI assistant.')
      return
    }
    if (!user?.id || !agency?.id) {
      setAiError('Agency not loaded. Please refresh and try again.')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    try {
      const imported = await importFormFromText(text, session, { useAi: true })
      const result = await createAndPublishFormFromImport(imported, user.id, agency.id)
      setAiResult(result)
      await load()
    } catch (err) {
      setAiError(err.message || 'Could not generate form.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-rose-900 p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-100">
              <ClipboardList className="h-3.5 w-3.5" />
              Feedback & surveys
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Forms</h1>
            <p className="mt-1 text-sm text-slate-300">Build premium surveys — AI-powered, branded, and ready to share</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setAiOpen((v) => !v)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Bot className="h-4 w-4" />
              {aiOpen ? 'Hide AI' : 'AI Assistant'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/forms/new')} className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Sparkles className="h-4 w-4" /> Manual import
            </Button>
            <Button onClick={() => navigate('/forms/new')} className="shadow-lg shadow-rose-900/30">
              <Plus className="h-4 w-4" /> New form
            </Button>
          </div>
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total forms', value: heroStats.total },
            { label: 'Live', value: heroStats.published },
            { label: 'Responses', value: heroStats.responses },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {aiOpen && (
        <FormAiAssistant
          onGenerate={handleAiGenerate}
          loading={aiLoading}
          result={aiResult}
          error={aiError}
        />
      )}

      {/* Instagram-style filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.id
            return (
              <button
                key={tab.id || 'all'}
                type="button"
                onClick={() => setStatus(tab.id)}
                className={`shrink-0 snap-start rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 text-white shadow-md shadow-rose-500/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="relative min-w-0 sm:max-w-xs sm:flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
            placeholder="Search forms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
          <span className="text-sm font-medium text-slate-500">Loading your forms…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-rose-200/80 bg-gradient-to-br from-rose-50/50 via-white to-violet-50/40 px-6 py-16 text-center shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />
          <div className="mx-auto max-w-md">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 p-[3px] shadow-lg shadow-rose-500/30">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                <Bot className="h-7 w-7 text-rose-600" />
              </span>
            </span>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">Create your first survey</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Use the AI assistant above to paste a survey and get a share link instantly — or start from scratch in the builder.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => setAiOpen(true)} className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700">
                <Sparkles className="h-4 w-4" /> Try AI assistant
              </Button>
              <Button variant="secondary" onClick={() => navigate('/forms/new')}>
                <Plus className="h-4 w-4" /> Blank form
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {filtered.length} form{filtered.length === 1 ? '' : 's'}
          </p>
          <FormCardGrid
            forms={filtered}
            stats={stats}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  )
}
