import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Eye, Loader2, Save, Send } from 'lucide-react'
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
      <div className="flex items-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading form…
      </div>
    )
  }

  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const branding = getFormBranding(meta, agency)
  const tabs = ['import', 'build', 'branding', 'security', 'preview', 'distribute']

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/forms" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'New form' : meta.title || 'Edit form'}</h1>
            <p className="text-sm text-slate-500">Feedback & surveys</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button type="button" onClick={handlePublish} disabled={saving}>
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-200'
            }`}
          >
            {t === 'build' ? 'Builder' : t === 'import' ? 'AI Import' : t}
          </button>
        ))}
      </div>

      {tab === 'import' && <FormAiImportPanel onImport={handleImport} />}

      {tab === 'build' && (
        <div className="space-y-4">
          <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:grid-cols-2">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                placeholder="Your opinion matters! Please take a few minutes to share your feedback…"
              />
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
            <div className="rounded-xl bg-white px-6 py-4 text-center shadow-sm">
              <Button type="button" variant="secondary" disabled>
                <Eye className="h-4 w-4" /> Preview only
              </Button>
            </div>
          </FormShell>
        </div>
      )}

      {tab === 'distribute' && formRecord && (
        <FormDistributePanel form={formRecord} agencyId={formRecord.agency_id} />
      )}
    </div>
  )
}
