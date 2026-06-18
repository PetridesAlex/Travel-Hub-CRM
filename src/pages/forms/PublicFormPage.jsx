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
import FormShell, { FormTitleCard, FormQuestionCard, getFormBranding } from '../../components/forms/FormShell'
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
        answers: Object.entries(answers)
          .filter(([k]) => !k.startsWith('_'))
          .map(([question_id, value]) => ({ question_id, value })),
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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f0ebe3' }}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (error && !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ backgroundColor: '#f0ebe3' }}>
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Form unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ backgroundColor: '#f0ebe3' }}>
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Thank you!</h1>
          <p className="mt-2 text-slate-600">{thankYou}</p>
        </div>
      </div>
    )
  }

  const { form, questions = [] } = formData || {}
  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const gateConfig = form?.gate_config || {}
  const branding = getFormBranding(form)

  if (!gatePassed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ backgroundColor: '#f0ebe3' }}>
        <form onSubmit={handleVerifyGate} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex items-center gap-2 text-slate-800">
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

  return (
    <div style={{ '--form-brand': branding.brandColor }}>
      <FormShell form={form}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormTitleCard title={form?.title} description={form?.description} branding={branding} />

          {sortedQuestions.map((q) => (
            <FormQuestionCard key={q.id} question={q} branding={branding}>
              <QuestionRenderer
                question={q}
                variant="card"
                value={answers[q.id]}
                onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                onFileSelect={(file) => uploadFormFile(token, { questionId: q.id, file })}
              />
            </FormQuestionCard>
          ))}

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="rounded-xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(60,64,67,0.15)]">
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </div>
        </form>
      </FormShell>
    </div>
  )
}
