import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getAdminAgency, updateAdminAgency, inviteAgencyOwner } from '../../services/adminAgencies'
import AgencyFormFields from '../../components/admin/AgencyFormFields'
import AgencyIntegrationsFields from '../../components/admin/AgencyIntegrationsFields'
import SubscriptionBadge from '../../components/admin/SubscriptionBadge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function AdminAgencyEdit() {
  const { id } = useParams()
  const { session } = useAuth()
  const [form, setForm] = useState(null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { agency } = await getAdminAgency(session, id)
        setForm({ ...agency, resend_api_key: '' })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, session])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { agency } = await updateAdminAgency(session, id, form)
      setForm({ ...agency, resend_api_key: '' })
      setMessage('Agency updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspend() {
    if (!confirm('Suspend this agency?')) return
    try {
      const { agency } = await updateAdminAgency(session, id, { suspend: true })
      setForm({ ...agency, resend_api_key: '' })
      setMessage('Agency suspended.')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReactivate() {
    try {
      const { agency } = await updateAdminAgency(session, id, { reactivate: true })
      setForm({ ...agency, resend_api_key: '' })
      setMessage('Agency reactivated.')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleInvite() {
    if (!ownerEmail.trim()) return
    try {
      await inviteAgencyOwner(session, id, ownerEmail.trim())
      setMessage(`Invitation sent to ${ownerEmail.trim()}`)
      setOwnerEmail('')
      const { agency } = await getAdminAgency(session, id)
      setForm({ ...agency, resend_api_key: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="text-slate-400">Loading agency…</p>
  if (!form) return <p className="text-red-400">{error || 'Agency not found.'}</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/agencies" className="text-sm text-teal-300 hover:text-teal-200">← Back to agencies</Link>
          <h2 className="mt-2 text-2xl font-bold text-white">{form.name}</h2>
          <div className="mt-2 flex items-center gap-2">
            <SubscriptionBadge status={form.subscription_status} />
            {form.is_protected && <span className="text-xs text-amber-300">Protected</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {form.suspended_at ? (
            <Button type="button" variant="secondary" onClick={handleReactivate}>Reactivate</Button>
          ) : (
            <Button type="button" variant="danger" onClick={handleSuspend} disabled={form.is_protected}>Suspend</Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Profile & subscription</h3>
          <AgencyFormFields form={form} onChange={setForm} showSubscription />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Integrations</h3>
          <AgencyIntegrationsFields form={form} onChange={setForm} showResendKey />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Owner</h3>
          <p className="mb-3 text-sm text-slate-600">Current owner: {form.owner_email || 'Not assigned'}</p>
          {!form.owner_user_id && (
            <div className="flex flex-wrap gap-2">
              <Input className="max-w-sm" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@agency.com" />
              <Button type="button" variant="secondary" onClick={handleInvite}>Send invite</Button>
            </div>
          )}
          {form.invitations?.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {form.invitations.map((inv) => (
                <li key={inv.id}>{inv.email} — {inv.status}</li>
              ))}
            </ul>
          )}
        </Card>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </form>
    </div>
  )
}
