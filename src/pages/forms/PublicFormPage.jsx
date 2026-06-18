import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Lock, ShieldAlert } from 'lucide-react'
import {
  fetchPublicForm,
  openPublicForm,
  verifyFormGate,
  submitPublicForm,
  uploadFormFile,
} from '../../services/formsPublicApi'
import QuestionRenderer from '../../components/forms/QuestionRenderer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function PublicFormPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(null)
  const [gatePassed, setGatePassed] = useState(false)
  const [gateForm, setGateForm] = useState({ email: '', booking_ref: '', access_code: '' })
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thankYou, setThankYou] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchPublicForm(token)
      .then(async (data) => {
        setFormData(data)
        if (data.form.security_mode !== 'gate') {
          setGatePassed(true)
          await openPublicForm(token).catch(() => {})
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleVerifyGate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await verifyFormGate(token, gateForm)
      setGatePassed(true)
      await openPublicForm(token)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        answers: Object.entries(answers).map(([question_id, value]) => ({ question_id, value })),
        respondent_name: answers._name || formData?.recipient?.name,
        respondent_email: answers._email || formData?.recipient?.email,
        gate: gateForm,
      }
      const result = await submitPublicForm(token, payload)
      setThankYou(result.thank_you)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error && !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-rose-50/30 p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Form unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 p-6">
        <div className="max-w-md rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Thank you!</h1>
          <p className="mt-2 text-slate-600">{thankYou}</p>
        </div>
      </div>
    )
  }

  const { form, questions = [], sections = [] } = formData || {}
  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const gateConfig = form?.gate_config || {}

  if (!gatePassed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 p-6">
        <form onSubmit={handleVerifyGate} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex items-center gap-2 text-teal-700">
            <Lock className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Verify access</h1>
          </div>
          <p className="text-sm text-slate-600">{form?.title}</p>
          {gateConfig.require_email && (
            <Input label="Email" type="email" value={gateForm.email} onChange={(e) => setGateForm({ ...gateForm, email: e.target.value })} required />
          )}
          {gateConfig.require_booking_ref && (
            <Input label="Booking reference" value={gateForm.booking_ref} onChange={(e) => setGateForm({ ...gateForm, booking_ref: e.target.value })} required />
          )}
          {gateConfig.require_access_code && (
            <Input label="Access code" type="password" value={gateForm.access_code} onChange={(e) => setGateForm({ ...gateForm, access_code: e.target.value })} required />
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      </div>
    )
  }

  const questionsBySection = (sectionId) =>
    sortedQuestions.filter((q) => q.section_id === sectionId)

  const unsectioned = sortedQuestions.filter((q) => !q.section_id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20 py-10 px-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{form?.title}</h1>
          {form?.description && <p className="mt-2 text-slate-600">{form.description}</p>}
        </div>

        {sections.map((section) => {
          const sectionQs = questionsBySection(section.id)
          if (!sectionQs.length) return null
          return (
            <div key={section.id} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{section.title}</h2>
                {section.description && <p className="text-sm text-slate-500">{section.description}</p>}
              </div>
              {sectionQs.map((q) => (
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                  onFileSelect={(file) => uploadFormFile(token, { questionId: q.id, file })}
                />
              ))}
            </div>
          )
        })}

        {unsectioned.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
            onFileSelect={(file) => uploadFormFile(token, { questionId: q.id, file })}
          />
        ))}

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit
        </Button>
      </form>
    </div>
  )
}
