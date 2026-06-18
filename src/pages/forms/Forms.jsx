import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, ClipboardList, Search, Loader2, Pencil, Trash2, BarChart3, MessageSquare,
  Copy, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getForms, deleteForm, duplicateForm, getFormStats } from '../../services/forms'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../../components/leads/LeadTableHeader'
import { FORM_CATEGORIES } from '../../constants/formFields'
import { formatDate, labelFor } from '../../utils/format'

const STATUS_TABS = [
  { id: '', label: 'All Forms', icon: ClipboardList },
  { id: 'draft', label: 'Draft', icon: Pencil },
  { id: 'published', label: 'Published', icon: MessageSquare },
  { id: 'archived', label: 'Archived', icon: ClipboardList },
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

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-cyan-50/40 p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-teal-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Operations</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Forms</h1>
            <p className="mt-1 text-sm text-slate-600">Feedback & surveys for your clients</p>
          </div>
          <Button onClick={() => navigate('/forms/new')}>
            <Plus className="h-4 w-4" /> New form
          </Button>
        </div>
        <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total forms', value: heroStats.total },
            { label: 'Published', value: heroStats.published },
            { label: 'Total responses', value: heroStats.responses },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon
          const active = status === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm"
          placeholder="Search forms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading forms…
        </div>
      ) : (
        <Table variant="premium">
          <LeadTableHeader
            columns={[
              { key: 'title', label: 'Form', className: PREMIUM_HEADER_CLASS },
              { key: 'category', label: 'Category', className: PREMIUM_HEADER_CLASS },
              { key: 'status', label: 'Status', className: PREMIUM_HEADER_CLASS },
              { key: 'responses', label: 'Responses', className: PREMIUM_HEADER_CLASS },
              { key: 'updated', label: 'Updated', className: PREMIUM_HEADER_CLASS },
              { key: 'actions', label: '', className: PREMIUM_HEADER_CLASS },
            ]}
          />
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                  No forms yet. Create your first feedback form.
                </td>
              </tr>
            ) : (
              filtered.map((form) => (
                <tr key={form.id} className="border-t border-slate-100/80 hover:bg-slate-50/50">
                  <td className={PREMIUM_CELL_CLASS}>
                    <Link to={`/forms/${form.id}/edit`} className="font-semibold text-slate-900 hover:text-teal-700">
                      {form.title}
                    </Link>
                    {form.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{form.description}</p>
                    )}
                  </td>
                  <td className={PREMIUM_CELL_CLASS}>{labelFor(FORM_CATEGORIES, form.category)}</td>
                  <td className={PREMIUM_CELL_CLASS}>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {form.status}
                    </span>
                  </td>
                  <td className={PREMIUM_CELL_CLASS}>{stats[form.id]?.responses || 0}</td>
                  <td className={PREMIUM_CELL_CLASS}>{formatDate(form.updated_at)}</td>
                  <td className={PREMIUM_CELL_CLASS}>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  )
}
