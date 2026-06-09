import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
]

const SUBSCRIPTION_LABELS = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
}

const SUBSCRIPTION_COLORS = {
  trial: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  past_due: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-600',
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const { agency, updateAgencyProfile } = useAgency()
  const [currency, setCurrency] = useState(() => localStorage.getItem('default_currency') || 'EUR')
  const [agencyName, setAgencyName] = useState('')
  const [savingAgency, setSavingAgency] = useState(false)
  const [agencyMessage, setAgencyMessage] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)
  const displayName = agency?.name || ''
  const nameValue = agencyName || displayName

  function handleCurrencyChange(value) {
    setCurrency(value)
    localStorage.setItem('default_currency', value)
  }

  async function handleAgencySave(e) {
    e.preventDefault()
    if (!nameValue.trim()) return

    setSavingAgency(true)
    setAgencyMessage('')
    try {
      await updateAgencyProfile({ name: nameValue.trim() })
      setAgencyName('')
      setAgencyMessage('Agency profile updated.')
    } catch (err) {
      setAgencyMessage(err.message || 'Failed to update agency profile.')
    } finally {
      setSavingAgency(false)
    }
  }

  async function copyApiKey() {
    if (!agency?.api_key) return
    await navigator.clipboard.writeText(agency.api_key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const subscriptionStatus = agency?.subscription_status || 'trial'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Manage your agency, account, and preferences</p>
      </div>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Agency Profile</h3>
            <p className="mt-1 text-sm text-slate-500">
              Your agency name appears in the header across your dashboard.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${SUBSCRIPTION_COLORS[subscriptionStatus] || SUBSCRIPTION_COLORS.trial}`}>
            {SUBSCRIPTION_LABELS[subscriptionStatus] || 'Trial'}
          </span>
        </div>

        <form onSubmit={handleAgencySave} className="space-y-4">
          <Input
            label="Agency Name"
            value={nameValue}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="e.g. Mediterranean Voyages"
            required
          />

          <div>
            <p className="mb-1 block text-sm font-medium text-slate-700">API Key</p>
            <p className="mb-2 text-xs text-slate-500">
              Each travel agency gets a unique key for integrations, webhooks, and n8n automations.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={agency?.api_key || 'Loading...'}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
              />
              <Button type="button" variant="secondary" onClick={copyApiKey} disabled={!agency?.api_key}>
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedKey ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Subscription plan</p>
              <p className="font-medium capitalize text-slate-900">{agency?.subscription_plan || 'starter'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Agency ID</p>
              <p className="truncate font-mono text-xs text-slate-700">{agency?.id || '—'}</p>
            </div>
          </div>

          {agencyMessage && (
            <p className={`text-sm ${agencyMessage.includes('Failed') ? 'text-red-600' : 'text-emerald-600'}`}>
              {agencyMessage}
            </p>
          )}

          <Button type="submit" disabled={savingAgency || !nameValue.trim()}>
            {savingAgency ? 'Saving...' : 'Save Agency Profile'}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold text-slate-900">AI Workspace</h3>
        <p className="mb-3 text-sm text-slate-500">
          AI generation is powered securely on the server. Set <code className="rounded bg-slate-100 px-1">OPENAI_API_KEY</code> in your Vercel project environment variables — it is never stored in the browser.
        </p>
        <Link to="/ai-workspace/generator" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
          Open AI Generator →
        </Link>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-slate-900">Account</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{user?.email}</p>
          </div>
          <Button variant="danger" onClick={signOut}>Sign Out</Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-slate-900">Preferences</h3>
        <Select
          label="Default Currency"
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          options={CURRENCIES}
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-slate-900">n8n Automation</h3>
        <div className="space-y-3 text-sm text-slate-600">
          <p>This CRM is ready for n8n automations via Supabase Database Webhooks.</p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>New Lead</strong> — auto-create follow-up task and email draft</li>
            <li><strong>Quotation Sent</strong> — send email via Outlook</li>
            <li><strong>Payment Reminder</strong> — daily check for overdue balances</li>
            <li><strong>Voice Note</strong> — AI writes professional travel programs from voice</li>
            <li><strong>Marketing Campaign</strong> — send audience to Brevo</li>
          </ul>
          <p className="text-slate-500">
            Use your agency API key to authenticate webhook calls. See{' '}
            <code className="rounded bg-slate-100 px-1">docs/n8n-automations.md</code> for setup instructions.
          </p>
        </div>
      </Card>
    </div>
  )
}
