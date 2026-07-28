import { useState, useEffect } from 'react'
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Plug,
  Shield,
  Sparkles,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { useSuperAdmin } from '../hooks/useSuperAdmin'
import { testSlackConnection } from '../services/slackNotify'
import { saveAgencyResendKey } from '../services/agencyIntegrations'
import { sendEmailViaResend } from '../services/emailSend'
import { inviteTeamMember, listTeamMembers, removeTeamMember } from '../services/agencyTeam'
import { canManageAgencySettings } from '../services/agencies'
import { getOutlookPrefs, openOutlookCompose, openOutlookInbox, OUTLOOK_PROVIDERS, saveOutlookPrefs } from '../utils/outlookCompose'
import AgencyLogo from '../components/layout/AgencyLogo'
import { resolveAgencyLogoUrl } from '../utils/resolveAgencyLogo'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const TABS = [
  { id: 'company', label: 'Company', icon: Building2, description: 'Profile & branding' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Invoices & emails' },
  { id: 'integrations', label: 'Integrations', icon: Plug, description: 'Outlook, Slack, Resend & API' },
  { id: 'team', label: 'Team', icon: Users, description: 'Employees & access' },
  { id: 'subscription', label: 'Subscription', icon: CreditCard, description: 'Plan & billing' },
  { id: 'account', label: 'Account', icon: UserCircle, description: 'Sign-in & preferences' },
]

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
]

const SUBSCRIPTION_LABELS = { trial: 'Trial', active: 'Active', past_due: 'Past due', cancelled: 'Cancelled' }
const SUBSCRIPTION_COLORS = {
  trial: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  past_due: 'bg-red-50 text-red-800 ring-red-200/80',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200/80',
}

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', agent: 'Agent' }
const ROLE_COLORS = {
  owner: 'bg-teal-50 text-teal-800 ring-teal-200/80',
  admin: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
  agent: 'bg-slate-100 text-slate-700 ring-slate-200/80',
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_COLORS[role] || ROLE_COLORS.agent}`}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function MemberAvatar({ email, name }) {
  const initial = (name || email || '?').charAt(0).toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-700 ring-2 ring-white">
      {initial}
    </div>
  )
}

function CopyField({ value, onCopy, copied }) {
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 font-mono text-xs text-slate-700 shadow-inner"
      />
      <Button type="button" variant="secondary" onClick={onCopy} className="shrink-0">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  )
}

function StatTile({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 font-semibold text-slate-900 ${mono ? 'truncate font-mono text-xs' : 'capitalize'}`}>{value}</p>
    </div>
  )
}

export default function Settings() {
  const { user, signOut, session, updateDisplayName } = useAuth()
  const { agency, memberRole, updateAgencyProfile } = useAgency()
  const { isSuperAdmin } = useSuperAdmin()
  const canManage = canManageAgencySettings(memberRole)
  const [tab, setTab] = useState('company')
  const [currency, setCurrency] = useState(() => localStorage.getItem('default_currency') || 'EUR')
  const [form, setForm] = useState({})
  const [resendApiKey, setResendApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [slackTesting, setSlackTesting] = useState(false)
  const [slackMessage, setSlackMessage] = useState('')
  const [testEmail, setTestEmail] = useState(user?.email || '')
  const [sendingTest, setSendingTest] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamInvites, setTeamInvites] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [inviting, setInviting] = useState(false)
  const [displayName, setDisplayName] = useState(() => user?.user_metadata?.full_name || '')
  const [savingName, setSavingName] = useState(false)
  const [outlookProvider, setOutlookProvider] = useState(() => getOutlookPrefs().provider)
  const [outlookEmail, setOutlookEmail] = useState(() => getOutlookPrefs().email || user?.email || '')

  const subscriptionStatus = agency?.subscription_status || 'trial'
  const resolvedLogoUrl = resolveAgencyLogoUrl(agency)
  const previewLogoUrl = (form.logo_url ?? agency?.logo_url) || resolvedLogoUrl
  const previewName = form.name ?? agency?.name ?? ''
  const activeTab = TABS.find((t) => t.id === tab)
  const showSaveBar = tab !== 'account' && tab !== 'subscription' && tab !== 'team' && canManage

  function field(key) {
    if (Object.prototype.hasOwnProperty.call(form, key)) return form[key]
    if (agency && agency[key] !== undefined && agency[key] !== null) return agency[key]
    return ''
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleCurrencyChange(value) {
    setCurrency(value)
    localStorage.setItem('default_currency', value)
  }

  function handleOutlookProviderChange(value) {
    setOutlookProvider(value)
    saveOutlookPrefs({ provider: value, email: outlookEmail })
  }

  function handleOutlookEmailChange(value) {
    setOutlookEmail(value)
    saveOutlookPrefs({ provider: outlookProvider, email: value })
  }

  function handleOpenOutlookInbox() {
    openOutlookInbox(outlookProvider)
  }

  function handleOpenOutlookCompose() {
    openOutlookCompose({ provider: outlookProvider })
  }

  async function loadTeam() {
    if (!session) return
    setTeamLoading(true)
    try {
      const data = await listTeamMembers(session)
      setTeamMembers(data.members || [])
      setTeamInvites(data.invitations || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'team') loadTeam()
  }, [tab, session])

  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name || '')
  }, [user?.id, user?.user_metadata?.full_name])

  async function handleInviteMember(e) {
    e.preventDefault()
    setInviting(true)
    setMessage('')
    try {
      await inviteTeamMember(session, {
        email: inviteEmail,
        role: inviteRole,
        full_name: inviteName.trim() || undefined,
      })
      setInviteEmail('')
      setInviteName('')
      setMessage('Invitation sent successfully.')
      await loadTeam()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleSaveDisplayName(e) {
    e.preventDefault()
    setSavingName(true)
    setMessage('')
    try {
      await updateDisplayName(displayName)
      setMessage('Display name updated.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSavingName(false)
    }
  }

  async function handleRemoveMember(memberId) {
    if (!window.confirm('Remove this team member? They will lose access to this agency.')) return
    setMessage('')
    try {
      await removeTeamMember(session, memberId)
      setMessage('Team member removed.')
      await loadTeam()
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function handleSaveProfile(extra = {}) {
    setSaving(true)
    setMessage('')
    try {
      const updates = {
        name: (field('name') || agency?.name || '').trim(),
        logo_url: field('logo_url')?.trim() || null,
        address: field('address')?.trim() || null,
        phone: field('phone')?.trim() || null,
        email: field('email')?.trim() || null,
        website: field('website')?.trim() || null,
        invoice_footer: field('invoice_footer')?.trim() || null,
        email_signature: field('email_signature')?.trim() || null,
        slack_webhook_url: field('slack_webhook_url')?.trim() || null,
        slack_channel_name: field('slack_channel_name')?.trim() || null,
        slack_notifications_enabled: field('slack_notifications_enabled') !== false && field('slack_notifications_enabled') !== 'false',
        resend_domain: field('resend_domain')?.trim() || null,
        resend_from_email: field('resend_from_email')?.trim() || null,
        resend_reply_to: field('resend_reply_to')?.trim() || null,
        ...extra,
      }
      await updateAgencyProfile(updates)
      if (resendApiKey.trim()) {
        await saveAgencyResendKey(session, resendApiKey.trim())
        setResendApiKey('')
      }
      setForm({})
      setMessage('Settings saved successfully.')
    } catch (err) {
      setMessage(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function copyApiKey() {
    if (!agency?.api_key) return
    await navigator.clipboard.writeText(agency.api_key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const inboundWebhookUrl = `${window.location.origin}/api/leads/inbound`

  async function copyInboundWebhook() {
    await navigator.clipboard.writeText(inboundWebhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  async function handleSlackTest() {
    setSlackTesting(true)
    setSlackMessage('')
    try {
      await testSlackConnection(session)
      setSlackMessage('Slack connected. Check your channel for the test message.')
    } catch (err) {
      setSlackMessage(err.message || 'Failed to send test message to Slack.')
    } finally {
      setSlackTesting(false)
    }
  }

  async function handleResendTest() {
    setSendingTest(true)
    setMessage('')
    try {
      await sendEmailViaResend(session, {
        to: testEmail,
        subject: 'Travel Hub CRM — Resend test',
        text: 'Your agency Resend integration is working.',
      })
      setMessage('Test email sent via Resend.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSendingTest(false)
    }
  }

  const isErrorMessage = message && (
    message.includes('Failed')
    || message.includes('not configured')
    || message.includes('Not found')
    || message.includes('not found')
    || message.toLowerCase().includes('error')
    || message.includes('required')
  )

  return (
    <div className="mx-auto max-w-5xl pb-24">
      {/* Page header */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-teal-50/40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <AgencyLogo name={previewName} logoUrl={previewLogoUrl || undefined} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-700/80">Workspace settings</p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{agency?.name || 'Your agency'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={memberRole || 'owner'} />
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${SUBSCRIPTION_COLORS[subscriptionStatus] || SUBSCRIPTION_COLORS.trial}`}>
                  {SUBSCRIPTION_LABELS[subscriptionStatus] || 'Trial'}
                </span>
              </div>
            </div>
          </div>
          {isSuperAdmin && (
            <Link
              to="/admin/agencies"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-teal-800 shadow-sm backdrop-blur transition hover:bg-white hover:shadow"
            >
              <Shield className="h-4 w-4" />
              Super Admin
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${isErrorMessage ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Sidebar navigation */}
        <aside className="lg:sticky lg:top-6 lg:w-60 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 lg:flex-col lg:overflow-visible">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setMessage('') }}
                  className={`flex min-w-[8.5rem] shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:min-w-0 lg:w-full ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="hidden text-xs text-slate-500 lg:block">{t.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 space-y-6">
          {activeTab && (
            <div className="mb-2 lg:hidden">
              <h2 className="text-lg font-semibold text-slate-900">{activeTab.label}</h2>
              <p className="text-sm text-slate-500">{activeTab.description}</p>
            </div>
          )}

          {tab === 'company' && (
            <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
              <SectionHeader
                title="Agency profile"
                description="Your public-facing identity across invoices, emails, and the CRM sidebar."
                action={
                  memberRole === 'agent' ? (
                    <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">View only</span>
                  ) : null
                }
              />
              <div className="mb-6 flex items-center gap-5 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
                <AgencyLogo name={previewName} logoUrl={previewLogoUrl || undefined} size="lg" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Brand preview</p>
                  <p className="mt-0.5 text-xs text-slate-500">Shown in the sidebar and on client documents</p>
                </div>
              </div>
              <div className="space-y-5">
                <Input label="Agency name" value={field('name')} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Honeywell Travel" disabled={!canManage} />
                <Input label="Logo URL" value={field('logo_url')} onChange={(e) => setField('logo_url', e.target.value)} placeholder="/logos/honeywell-travel.png" disabled={!canManage} />
                <Input label="Address" value={field('address')} onChange={(e) => setField('address', e.target.value)} disabled={!canManage} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Phone" value={field('phone')} onChange={(e) => setField('phone', e.target.value)} disabled={!canManage} />
                  <Input label="Agency email" value={field('email')} onChange={(e) => setField('email', e.target.value)} type="email" disabled={!canManage} />
                </div>
                <Input label="Website" value={field('website')} onChange={(e) => setField('website', e.target.value)} placeholder="https://..." disabled={!canManage} />
                <div>
                  <p className="mb-1.5 block text-sm font-medium text-slate-700">API key</p>
                  <p className="mb-2 text-xs text-slate-500">Used for website lead capture and automations</p>
                  <CopyField value={agency?.api_key || 'Loading…'} onCopy={copyApiKey} copied={copiedKey} />
                </div>
              </div>
            </Card>
          )}

          {tab === 'documents' && (
            <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
              <SectionHeader
                title="Documents & branding"
                description="Default content appended to invoices and outbound emails."
              />
              <div className="space-y-5">
                <TextArea
                  label="Invoice footer"
                  value={field('invoice_footer')}
                  onChange={(e) => setField('invoice_footer', e.target.value)}
                  placeholder="Bank details, VAT number, payment terms…"
                />
                <TextArea
                  label="Email signature"
                  value={field('email_signature')}
                  onChange={(e) => setField('email_signature', e.target.value)}
                  placeholder="Best regards,&#10;Honeywell Travel Team"
                />
              </div>
            </Card>
          )}

          {tab === 'integrations' && (
            <div className="space-y-6">
              {!canManage && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                  You are signed in as an agent. Integrations can only be managed by owners and admins.
                </div>
              )}

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader
                  title="Slack notifications"
                  description="Route CRM alerts to your team channel. Leave blank to use the platform default."
                />
                <div className="space-y-5">
                  <Input label="Webhook URL" value={field('slack_webhook_url')} onChange={(e) => setField('slack_webhook_url', e.target.value)} placeholder="https://hooks.slack.com/services/…" disabled={!canManage} />
                  <Input label="Channel" value={field('slack_channel_name')} onChange={(e) => setField('slack_channel_name', e.target.value)} placeholder="#crm-alerts" disabled={!canManage} />
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      checked={field('slack_notifications_enabled') !== false}
                      onChange={(e) => setField('slack_notifications_enabled', e.target.checked)}
                      disabled={!canManage}
                    />
                    <span className="text-sm font-medium text-slate-700">Enable Slack notifications</span>
                  </label>
                  <Button type="button" variant="secondary" onClick={handleSlackTest} disabled={slackTesting || !canManage}>
                    {slackTesting ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</> : <><MessageSquare className="h-4 w-4" /> Send test message</>}
                  </Button>
                  {slackMessage && (
                    <p className={`text-sm ${slackMessage.includes('Failed') || slackMessage.includes('not configured') ? 'text-red-600' : 'text-emerald-600'}`}>
                      {slackMessage}
                    </p>
                  )}
                </div>
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader
                  title="Microsoft Outlook"
                  description="Open your Outlook inbox or compose emails from the CRM using your Microsoft account."
                />
                <div className="space-y-5">
                  <Select
                    label="Outlook account type"
                    value={outlookProvider}
                    onChange={(e) => handleOutlookProviderChange(e.target.value)}
                    options={Object.entries(OUTLOOK_PROVIDERS).map(([value, config]) => ({
                      value,
                      label: config.label,
                    }))}
                  />
                  <Input
                    label="Your Outlook email"
                    type="email"
                    value={outlookEmail}
                    onChange={(e) => handleOutlookEmailChange(e.target.value)}
                    placeholder="you@honeywelltravel.com"
                  />
                  <p className="text-sm leading-relaxed text-slate-500">
                    Use <strong className="font-medium text-slate-700">Open in Outlook</strong> in the AI Email Assistant to pre-fill the client, subject, and body in Outlook Web. You send from your own mailbox — no extra API setup required.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={handleOpenOutlookInbox}>
                      <ExternalLink className="h-4 w-4" /> Open Outlook inbox
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleOpenOutlookCompose}>
                      <ExternalLink className="h-4 w-4" /> New email in Outlook
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader title="Resend email" description="Automated API email for test sends and future transactional delivery (optional)." />
                <div className="space-y-5">
                  <Input label="Domain" value={field('resend_domain')} onChange={(e) => setField('resend_domain', e.target.value)} disabled={!canManage} />
                  <Input label="From address" value={field('resend_from_email')} onChange={(e) => setField('resend_from_email', e.target.value)} placeholder="hello@mail.youragency.com" disabled={!canManage} />
                  <Input label="Reply-to" value={field('resend_reply_to')} onChange={(e) => setField('resend_reply_to', e.target.value)} type="email" disabled={!canManage} />
                  <Input label="API key" type="password" value={resendApiKey} onChange={(e) => setResendApiKey(e.target.value)} placeholder="re_… (leave blank to keep existing)" disabled={!canManage} />
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <Input className="min-w-[200px] flex-1" label="Test recipient" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} type="email" />
                    <Button type="button" variant="secondary" onClick={handleResendTest} disabled={sendingTest || !canManage}>
                      {sendingTest ? 'Sending…' : 'Send test email'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader title="Inbound leads" description="POST website form submissions to this endpoint with your API key." />
                <CopyField value={inboundWebhookUrl} onCopy={copyInboundWebhook} copied={copiedWebhook} />
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">AI workspace</h3>
                    <p className="mt-1 text-sm text-slate-500">Generate offers, emails, and itineraries with agency templates.</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-teal-500/60" />
                </div>
                <Link to="/ai-workspace/generator" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                  Open AI generator →
                </Link>
              </Card>
            </div>
          )}

          {tab === 'team' && (
            <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
              <SectionHeader
                title="Team members"
                description="Invite employees to your agency. They share the same CRM data — no separate workspace."
              />

              {canManage && (
                <form onSubmit={handleInviteMember} className="mb-8 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white p-5">
                  <p className="mb-4 text-sm font-medium text-slate-900">Invite a colleague</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <Input
                      label="Email address"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="min-w-[220px] flex-1"
                    />
                    <Input
                      label="Display name"
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Optional"
                      className="min-w-[160px] flex-1"
                    />
                    <Select
                      label="Role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      options={[
                        { value: 'agent', label: 'Agent — CRM access' },
                        { value: 'admin', label: 'Admin — settings & invites' },
                      ]}
                    />
                    <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                      {inviting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><UserPlus className="h-4 w-4" /> Send invite</>}
                    </Button>
                  </div>
                </form>
              )}

              {!canManage && (
                <p className="mb-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Only owners and admins can invite team members.</p>
              )}

              {teamLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading team…
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Active members</h4>
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                      {teamMembers.length === 0 ? (
                        <li className="px-5 py-8 text-center text-sm text-slate-500">No team members yet.</li>
                      ) : teamMembers.map((member) => (
                        <li key={member.id} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                          <div className="flex min-w-0 items-center gap-3">
                            <MemberAvatar email={member.email} name={member.full_name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {member.full_name || member.email || member.user_id}
                              </p>
                              {member.full_name && member.email ? (
                                <p className="truncate text-sm text-slate-500">{member.email}</p>
                              ) : null}
                              <div className="mt-1">
                                <RoleBadge role={member.role} />
                              </div>
                            </div>
                          </div>
                          {canManage && member.role !== 'owner' && (
                            <Button type="button" variant="secondary" onClick={() => handleRemoveMember(member.id)} className="shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {teamInvites.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pending invitations</h4>
                      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/30">
                        {teamInvites.map((invite) => (
                          <li key={invite.id} className="flex items-center justify-between gap-4 px-5 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{invite.email}</p>
                              <p className="mt-1 text-xs text-slate-500 capitalize">{invite.role} · awaiting acceptance</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Pending</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {tab === 'subscription' && (
            <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
              <SectionHeader title="Subscription" description="Your current plan and billing details on Travel Hub." />
              <div className="grid gap-4 sm:grid-cols-2">
                <StatTile label="Status" value={SUBSCRIPTION_LABELS[subscriptionStatus]} />
                <StatTile label="Plan" value={agency?.subscription_plan || 'starter'} />
                <StatTile label="Monthly price" value={agency?.monthly_price != null ? `€${agency.monthly_price}` : '—'} />
                <StatTile label="Agency ID" value={agency?.id || '—'} mono />
              </div>
            </Card>
          )}

          {tab === 'account' && (
            <div className="space-y-6">
              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader title="Your account" description="Signed-in user for this workspace." />
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                    <p className="mt-1 font-medium text-slate-900">{user?.email}</p>
                  </div>
                  <RoleBadge role={memberRole || 'owner'} />
                </div>

                <form onSubmit={handleSaveDisplayName} className="mt-6 space-y-4">
                  <Input
                    label="Display name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How your name appears in the header"
                  />
                  <Button type="submit" disabled={savingName}>
                    {savingName ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save display name'}
                  </Button>
                </form>

                <Button variant="danger" onClick={signOut} className="mt-6">Sign out</Button>
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader title="Preferences" description="Personal settings for this browser." />
                <Select label="Default currency" value={currency} onChange={(e) => handleCurrencyChange(e.target.value)} options={CURRENCIES} />
              </Card>

              <Card className="border-slate-200/80 p-6 shadow-sm sm:p-8">
                <SectionHeader title="Automation" description="Connect n8n or other tools via your agency API key." />
                <p className="text-sm leading-relaxed text-slate-600">
                  Use your API key with Supabase webhooks. See{' '}
                  <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">docs/n8n-automations.md</code>.
                </p>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Sticky save bar */}
      {showSaveBar && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="hidden text-sm text-slate-500 sm:block">Unsaved changes apply to your agency workspace.</p>
            <Button onClick={() => handleSaveProfile()} disabled={saving} className="ml-auto min-w-[140px]">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
