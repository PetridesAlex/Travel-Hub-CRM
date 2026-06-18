import { useEffect, useState, Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getForm } from '../../services/forms'
import { getFormResponses, getResponseWithAnswers, exportFormResponsesCsv } from '../../services/formResponses'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../../components/leads/LeadTableHeader'
import { formatDate } from '../../utils/format'

export default function FormResponses() {
  const { formId } = useParams()
  const { session } = useAuth()
  const [form, setForm] = useState(null)
  const [responses, setResponses] = useState([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [f, rows] = await Promise.all([
        getForm(formId),
        getFormResponses(formId, { search }),
      ])
      setForm(f)
      setResponses(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [formId, search])

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(id)
    const data = await getResponseWithAnswers(id)
    setDetail(data)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { blob, filename } = await exportFormResponsesCsv(formId, session)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message)
    } finally {
      setExporting(false)
    }
  }

  if (loading && !form) {
    return (
      <div className="flex items-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading responses…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/forms" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form?.title}</h1>
            <p className="text-sm text-slate-500">{responses.length} responses</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table variant="premium">
        <LeadTableHeader
          columns={[
            { key: 'expand', label: '', className: PREMIUM_HEADER_CLASS },
            { key: 'respondent', label: 'Respondent', className: PREMIUM_HEADER_CLASS },
            { key: 'email', label: 'Email', className: PREMIUM_HEADER_CLASS },
            { key: 'submitted', label: 'Submitted', className: PREMIUM_HEADER_CLASS },
          ]}
        />
        <tbody>
          {responses.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-16 text-center text-slate-500">No responses yet.</td>
            </tr>
          ) : (
            responses.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className={PREMIUM_CELL_CLASS}>
                    <button type="button" onClick={() => toggleExpand(r.id)} className="text-slate-400">
                      {expandedId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className={PREMIUM_CELL_CLASS}>{r.respondent_name || r.form_recipients?.name || 'Anonymous'}</td>
                  <td className={PREMIUM_CELL_CLASS}>{r.respondent_email || r.form_recipients?.email || '—'}</td>
                  <td className={PREMIUM_CELL_CLASS}>{formatDate(r.submitted_at)}</td>
                </tr>
                {expandedId === r.id && detail?.response?.id === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={4} className="bg-slate-50/80 px-6 py-4">
                      <div className="mx-auto max-w-2xl space-y-4">
                        {detail.answers.map((a) => (
                          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-medium uppercase text-slate-400">Question {a.question_id.slice(0, 8)}…</p>
                            <p className="mt-1 text-sm text-slate-800">
                              {a.answer_text || (a.answer_json != null ? JSON.stringify(a.answer_json) : '—')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </Table>
    </div>
  )
}
