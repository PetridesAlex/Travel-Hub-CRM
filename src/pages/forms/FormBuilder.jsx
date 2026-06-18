import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Eye, Loader2, Save, Send, Sparkles, LayoutList, Palette,
  Shield, Share2, Bot, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
import {
  getFormWithStructure,
  createForm,
  updateForm,
  createSection,
  updateSection,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  publishForm,
  reorderItems,
} from '../../services/forms'
import { applyImportedForm } from '../../services/formAiImport'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import FormBuilderCanvas from '../../components/forms/FormBuilderCanvas'
import FormSecuritySettings from '../../components/forms/FormSecuritySettings'
import FormDistributePanel from '../../components/forms/FormDistributePanel'
import FormAiImportPanel from '../../components/forms/FormAiImportPanel'
import FormBrandingEditor from '../../components/forms/FormBrandingEditor'
import QuestionRenderer from '../../components/forms/QuestionRenderer'
import FormShell, { FormTitleCard, FormQuestionCard, getFormBranding } from '../../components/forms/FormShell'
import { FORM_CATEGORIES } from '../../constants/formFields'

const emptyMeta = {
  title: '',
  description: '',
  category: 'custom',
  security_mode: 'link_only',
  gate_config: {},
  settings: { brand_color: '#b71c1c', use_agency_logo: true },
}

const BUILDER_TABS = [
  { id: 'import', label: 'AI Import', icon: Bot, accent: 'violet' },
  { id: 'build', label: 'Builder', icon: LayoutList, accent: 'teal' },
  { id: 'branding', label: 'Branding', icon: Palette, accent: 'rose' },
  { id: 'security', label: 'Security', icon: Shield, accent: 'amber' },
  { id: 'preview', label: 'Preview', icon: Eye, accent: 'sky' },
  { id: 'distribute', label: 'Distribute', icon: Share2, accent: 'emerald' },
]

const TAB_ACTIVE = {
  violet: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 text-violet-900 shadow-md ring-1 ring-violet-500/15',
  teal: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-cyan-50/40 text-teal-900 shadow-md ring-1 ring-teal-500/15',
  rose: 'border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-red-50/30 text-rose-900 shadow-md ring-1 ring-rose-500/15',
  amber: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 text-amber-900 shadow-md ring-1 ring-amber-500/15',
  sky: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-blue-50/30 text-sky-900 shadow-md ring-1 ring-sky-500/15',
  emerald: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-900 shadow-md ring-1 ring-emerald-500/15',
}

const TAB_ICON_ACTIVE = {
  violet: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md',
  teal: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md',
  rose: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md',
  sky: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md',
}

const fieldClass =
  'w-full rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export default function FormBuilder() {
  const { formId } = useParams()
  const isNew = !formId || formId === 'new'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { agency } = useAgency()

  const [meta, setMeta] = useState(emptyMeta)
  const [sections, setSections] = useState([])
  const [questions, setQuestions] = useState([])
  const [formRecord, setFormRecord] = useState(null)
  const [tab, setTab] = useState(isNew ? 'import' : 'build')
  const [previewAnswers, setPreviewAnswers] = useState({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    getFormWithStructure(formId)
      .then(({ form, sections: s, questions: q }) => {
        setFormRecord(form)
        setMeta({
          title: form.title,
          description: form.description || '',
          category: form.category,
          security_mode: form.security_mode,
          gate_config: form.gate_config || {},
          settings: { ...emptyMeta.settings, ...(form.settings || {}) },
        })
        setSections(s)
        setQuestions(q)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [formId, isNew])

  const persistStructure = async (fid, agencyId) => {
    const sectionIdMap = new Map()

    for (const s of sections) {
      if (String(s.id).startsWith('temp-')) {
        const created = await createSection(fid, agencyId, { title: s.title, description: s.description }, s.sort_order)
        sectionIdMap.set(s.id, created.id)
      } else {
        sectionIdMap.set(s.id, s.id)
        await updateSection(s.id, { title: s.title, description: s.description, sort_order: s.sort_order })
      }
    }

    const orderedSections = sections.map((s, index) => ({
      id: sectionIdMap.get(s.id),
      sort_order: index,
    }))
    if (orderedSections.length) {
      await Promise.all(orderedSections.map((s) => updateSection(s.id, { sort_order: s.sort_order })))
    }

    for (const q of questions) {
      const resolvedSectionId = q.section_id ? sectionIdMap.get(q.section_id) || null : null
      const payload = {
        section_id: resolvedSectionId,
        question_type: q.question_type,
        question_text: q.question_text,
        help_text: q.help_text,
        options: q.options || [],
        config: q.config || {},
        required: q.required,
        sort_order: q.sort_order,
      }
      if (String(q.id).startsWith('temp-')) {
        await createQuestion(fid, agencyId, payload, q.sort_order)
      } else {
        await updateQuestion(q.id, payload)
      }
    }

    const existingIds = new Set(questions.filter((q) => !String(q.id).startsWith('temp-')).map((q) => q.id))
    const { questions: fresh } = await getFormWithStructure(fid)
    for (const q of fresh) {
      if (!existingIds.has(q.id)) await deleteQuestion(q.id)
    }

    if (questions.length) {
      const withIds = await getFormWithStructure(fid)
      await reorderItems('form_questions', withIds.questions)
    }
  }

  const handleSave = async () => {
    if (!meta.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError('')
    setSaveOk(false)
    try {
      let fid = formRecord?.id
      let agencyId = formRecord?.agency_id || agency?.id

      if (isNew && !fid) {
        const created = await createForm(meta, user.id, agency?.id)
        fid = created.id
        agencyId = created.agency_id
        setFormRecord(created)
        navigate(`/forms/${fid}/edit`, { replace: true })
      } else {
        const updated = await updateForm(fid, meta)
        setFormRecord(updated)
      }

      await persistStructure(fid, agencyId)
      const refreshed = await getFormWithStructure(fid)
      setSections(refreshed.sections)
      setQuestions(refreshed.questions)
      setFormRecord(refreshed.form)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    setError('')
    try {
      if (!meta.title.trim()) {
        setError('Title is required')
        return
      }
      let fid = formRecord?.id
      if (!fid) {
        const created = await createForm(meta, user.id, agency?.id)
        fid = created.id
        setFormRecord(created)
        navigate(`/forms/${fid}/edit`, { replace: true })
        await persistStructure(fid, created.agency_id)
      } else {
        await updateForm(fid, meta)
        await persistStructure(fid, formRecord.agency_id)
      }
      await publishForm(fid)
      const refreshed = await getFormWithStructure(fid)
      setFormRecord(refreshed.form)
      setTab('distribute')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImport = (imported) => {
    const result = applyImportedForm(imported, { setMeta, setQuestions })
    setTab('build')
    return result
  }

  const addSection = () => {
    const tempId = `temp-${crypto.randomUUID()}`
    setSections((prev) => [
      ...prev,
      { id: tempId, tempId, title: 'New section', description: '', sort_order: prev.length },
    ])
  }

  const addQuestion = (sectionId, type = 'short_text') => {
    const id = `temp-${crypto.randomUUID()}`
    setQuestions((prev) => [
      ...prev,
      {
        id,
        section_id: sectionId,
        question_type: type,
        question_text: 'New question',
        help_text: '',
        options: [],
        config: {},
        required: false,
        sort_order: prev.length,
      },
    ])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-24 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        <span className="text-sm font-medium text-slate-500">Loading form…</span>
      </div>
    )
  }

  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const branding = getFormBranding(meta, agency)
  const status = formRecord?.status || 'draft'
  const questionCount = questions.length

  return (
    <div className="min-w-0 space-y-5">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-5 shadow-xl shadow-slate-900/10 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/forms"
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-100">
                  <Sparkles className="h-3 w-3" />
                  Form studio
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30'
                }`}>
                  {status}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {isNew ? 'Create feedback form' : meta.title || 'Edit form'}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {questionCount} question{questionCount === 1 ? '' : 's'} · Build, brand, and send to travelers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveOk && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={saving}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save draft
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="shadow-lg shadow-teal-900/30"
            >
              <Send className="h-4 w-4" /> Publish
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 pt-0.5">
          {BUILDER_TABS.map(({ id, label, icon: Icon, accent }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? TAB_ACTIVE[accent]
                    : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  active ? TAB_ICON_ACTIVE[accent] : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-w-0">
        {tab === 'import' && <FormAiImportPanel onImport={handleImport} />}

        {tab === 'build' && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-sky-50/50 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-800">Form details</h3>
                <p className="text-xs text-slate-500">Title and intro shown to travelers at the top of the survey</p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Input label="Title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                <Select
                  label="Category"
                  value={meta.category}
                  onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                  options={FORM_CATEGORIES}
                />
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                    placeholder="Your opinion matters! Please take a few minutes to share your feedback…"
                  />
                </div>
              </div>
            </div>
            <FormBuilderCanvas
              sections={sections}
              questions={questions}
              onSectionsChange={setSections}
              onQuestionsChange={setQuestions}
              onAddSection={addSection}
              onAddQuestion={addQuestion}
            />
          </div>
        )}

        {tab === 'branding' && (
          <FormBrandingEditor form={meta} agency={agency} onChange={(patch) => setMeta({ ...meta, ...patch })} />
        )}

        {tab === 'security' && (
          <FormSecuritySettings form={meta} onChange={(patch) => setMeta({ ...meta, ...patch })} />
        )}

        {tab === 'preview' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-center text-xs text-slate-500">
              Live preview — this is how travelers will see your form
            </div>
            <div style={{ '--form-brand': branding.brandColor }}>
              <FormShell form={meta} agency={agency}>
                <FormTitleCard title={meta.title || 'Untitled form'} description={meta.description} branding={branding} />
                {sortedQuestions.map((q) => (
                  <FormQuestionCard key={q.id} question={q} branding={branding}>
                    <QuestionRenderer
                      question={q}
                      variant="card"
                      value={previewAnswers[q.id]}
                      onChange={(val) => setPreviewAnswers({ ...previewAnswers, [q.id]: val })}
                    />
                  </FormQuestionCard>
                ))}
              </FormShell>
            </div>
          </div>
        )}

        {tab === 'distribute' && formRecord ? (
          <FormDistributePanel form={{ ...formRecord, settings: meta.settings }} agencyId={formRecord.agency_id} />
        ) : tab === 'distribute' && (
          <div className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 px-6 py-12 text-center">
            <p className="text-sm font-medium text-amber-900">Save your form first</p>
            <p className="mt-1 text-xs text-amber-700">Click Save draft, then Publish to unlock distribution.</p>
          </div>
        )}
      </div>
    </div>
  )
}
