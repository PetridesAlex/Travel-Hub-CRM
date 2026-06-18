import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, ClipboardList, Search, Loader2, Pencil, Trash2, BarChart3, MessageSquare,
  Copy, Sparkles, Bot, FileText, MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getForms, deleteForm, duplicateForm, getFormStats } from '../../services/forms'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../../components/leads/LeadTableHeader'
import { FORM_CATEGORIES } from '../../constants/formFields'
import { formatDate, labelFor } from '../../utils/format'

const STATUS_TABS = [
  { id: '', label: 'All Forms' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
]

export default function Forms() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [stats, setStats] = useState({})
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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
    return forms.filter((f) => f.title?.toLowerCase().includes(q))
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

  const columns = [
    {
      key: 'title',
      label: 'Form',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={FileText} label="Form" accent="teal" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => (
        <div>
          <Link to={`/forms/${form.id}/edit`} className="font-semibold text-slate-900 hover:text-teal-700">
            {form.title}
          </Link>
          {form.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{form.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={ClipboardList} label="Category" accent="violet" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => labelFor(FORM_CATEGORIES, form.category),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Sparkles} label="Status" accent="amber" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
          {form.status}
        </span>
      ),
    },
    {
      key: 'responses',
      label: 'Responses',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={MessageSquare} label="Responses" accent="emerald" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => stats[form.id]?.responses || 0,
    },
    {
      key: 'updated',
      label: 'Updated',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Pencil} label="Updated" accent="sky" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => formatDate(form.updated_at),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (form) => (
        <div className="flex justify-end gap-1">
          <Link to={`/forms/${form.id}/responses`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-teal-700" title="Responses">
            <MessageSquare className="h-4 w-4" />
          </Link>
          <Link to={`/forms/${form.id}/analytics`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-700" title="Analytics">
            <BarChart3 className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => handleDuplicate(form.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <Link to={`/forms/${form.id}/edit`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Edit">
            <Pencil className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => handleDelete(form.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

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
            <p className="mt-1 text-sm text-slate-300">Build Google Forms-style surveys — import from ChatGPT, add hero images, send to clients</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/forms/new')} className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Bot className="h-4 w-4" /> Import from AI
            </Button>
            <Button onClick={() => navigate('/forms/new')} className="shadow-lg shadow-rose-900/30">
              <Plus className="h-4 w-4" /> New form
            </Button>
          </div>
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total forms', value: heroStats.total },
            { label: 'Published', value: heroStats.published },
            { label: 'Total responses', value: heroStats.responses },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.id
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm"
          placeholder="Search forms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-16 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading forms…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300/80 bg-gradient-to-br from-[#f0ebe3]/50 via-white to-rose-50/30 px-6 py-16 text-center shadow-sm">
          <div className="mx-auto max-w-md">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg">
              <Bot className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">Create your first feedback form</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Paste a survey from ChatGPT, add hotel photos to each question, set a hero banner, and publish — just like Google Forms.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/forms/new')}>
                <Sparkles className="h-4 w-4" /> Generate with AI
              </Button>
              <Button variant="secondary" onClick={() => navigate('/forms/new')}>
                <Plus className="h-4 w-4" /> Blank form
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Table
          variant="premium"
          columns={columns}
          data={filtered}
          emptyMessage="No forms match your search."
        />
      )}
    </div>
  )
}
