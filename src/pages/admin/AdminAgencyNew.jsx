import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { createAdminAgency, inviteAgencyOwner } from '../../services/adminAgencies'
import AgencyFormFields from '../../components/admin/AgencyFormFields'
import AgencyIntegrationsFields from '../../components/admin/AgencyIntegrationsFields'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

const emptyForm = {
  name: '', logo_url: '', subscription_status: 'trial', subscription_plan: 'starter', monthly_price: null,
  address: '', phone: '', email: '', website: '', invoice_footer: '', email_signature: '',
  slack_webhook_url: '', slack_channel_name: '', slack_notifications_enabled: true,
  resend_domain: '', resend_from_email: '', resend_reply_to: '', resend_api_key: '',
}

export default function AdminAgencyNew() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { agency } = await createAdminAgency(session, form)
      if (ownerEmail.trim()) {
        await inviteAgencyOwner(session, agency.id, ownerEmail.trim())
      }
      navigate(`/admin/agencies/${agency.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/agencies" className="text-sm text-teal-300 hover:text-teal-200">← Back to agencies</Link>
        <h2 className="mt-2 text-2xl font-bold text-white">Create agency</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Company profile</h3>
          <AgencyFormFields form={form} onChange={setForm} showSubscription />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Integrations</h3>
          <AgencyIntegrationsFields form={form} onChange={setForm} showResendKey />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Agency owner</h3>
          <Input label="Owner email (invitation)" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@agency.com" />
          <p className="mt-2 text-xs text-slate-500">Optional. Sends a Supabase invite email to become agency owner.</p>
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={saving || !form.name?.trim()}>{saving ? 'Creating…' : 'Create agency'}</Button>
      </form>
    </div>
  )
}
