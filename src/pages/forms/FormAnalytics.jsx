import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getForm } from '../../services/forms'
import { getFormAnalytics } from '../../services/formResponses'
import FormAnalyticsCharts from '../../components/forms/FormAnalyticsCharts'

export default function FormAnalytics() {
  const { formId } = useParams()
  const [form, setForm] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getForm(formId), getFormAnalytics(formId)])
      .then(([f, a]) => {
        setForm(f)
        setAnalytics(a)
      })
      .finally(() => setLoading(false))
  }, [formId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/forms" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{form?.title}</h1>
          <p className="text-sm text-slate-500">Analytics dashboard</p>
        </div>
      </div>
      <FormAnalyticsCharts analytics={analytics} />
    </div>
  )
}
