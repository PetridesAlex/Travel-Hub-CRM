import { useEffect, useState } from 'react'
import { Copy, Mail, Link2, Loader2, Users, CheckCircle2, AlertTriangle, Send } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import {
  getRecipients,
  createRecipient,
  createRecipientsBulk,
  ensureGenericRecipient,
  markRecipientSent,
  parseCsvRecipients,
  SHARED_LINK_NAME,
} from '../../services/formRecipients'
import { getClients } from '../../services/clients'
import { sendEmailViaResend } from '../../services/emailSend'
import { publicFormUrl } from '../../constants/formFields'
import { formatDate } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'

function buildTravelerEmailHtml({ formTitle, recipientName, link }) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <p style="font-size:16px;">Hi${recipientName ? ` ${recipientName}` : ''},</p>
      <p style="font-size:15px;line-height:1.6;">We hope you enjoyed your trip! Please take a few minutes to complete our feedback form — your responses help us improve future travel experiences.</p>
      <p style="margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#b71c1c;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Complete feedback form</a>
      </p>
      <p style="font-size:13px;color:#64748b;">Or copy this link: <a href="${link}" style="color:#0d9488;">${link}</a></p>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">Thank you,<br/>Your travel team</p>
    </div>
  `
}

export default function FormDistributePanel({ form, agencyId }) {
  const { session } = useAuth()
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [sharedLink, setSharedLink] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sendOnAdd, setSendOnAdd] = useState(true)
  const [csvText, setCsvText] = useState('')
  const [clients, setClients] = useState([])
  const [selectedClientIds, setSelectedClientIds] = useState([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isPublished = form?.status === 'published'
  const notificationEmails = form?.settings?.notification_emails || []

  const load = async () => {
    setLoading(true)
    try {
      const [rows, shared] = await Promise.all([
        getRecipients(form.id),
        ensureGenericRecipient(form.id, agencyId),
      ])
      setRecipients(rows.filter((r) => r.name !== SHARED_LINK_NAME || r.email))
      setSharedLink(publicFormUrl(shared.access_token))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (form?.id) load()
    getClients().then(setClients).catch(() => {})
  }, [form?.id, agencyId])

  const copyToClipboard = async (text, label = 'Link copied') => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage(label)
      setError('')
    } catch {
      setError('Could not copy — select the link and copy manually.')
    }
  }

  const sendToRecipient = async (recipient) => {
    if (!recipient.email) {
      setError('This recipient has no email — copy their personal link instead.')
      return
    }
    if (!isPublished) {
      setError('Publish the form first (click Publish in the toolbar).')
      return
    }
    setSending(true)
    setError('')
    try {
      const link = publicFormUrl(recipient.access_token)
      await sendEmailViaResend(session, {
        to: recipient.email,
        subject: `Feedback request: ${form.title}`,
        html: buildTravelerEmailHtml({
          formTitle: form.title,
          recipientName: recipient.name,
          link,
        }),
      })
      await markRecipientSent(recipient.id)
      await load()
      setMessage(`Invitation sent to ${recipient.email}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const addRecipient = async () => {
    if (!email.trim()) return
    setError('')
    try {
      const row = await createRecipient(form.id, agencyId, { email: email.trim(), name: name.trim() || null })
      setRecipients((prev) => [row, ...prev])
      setEmail('')
      setName('')
      if (sendOnAdd && isPublished) {
        await sendToRecipient(row)
      } else {
        setMessage(`Recipient added. ${sendOnAdd && !isPublished ? 'Publish the form to send emails.' : 'Copy their personal link from the table.'}`)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const bulkFromCsv = async () => {
    const parsed = parseCsvRecipients(csvText)
    if (!parsed.length) {
      setError('No valid rows in CSV — use format: email,name')
      return
    }
    const rows = await createRecipientsBulk(form.id, session.user.id, agencyId, parsed)
    setRecipients((prev) => [...rows, ...prev])
    setCsvText('')
    setMessage(`Added ${rows.length} travelers — use "Send all unsent" to email them.`)
  }

  const bulkFromClients = async () => {
    const selected = clients.filter((c) => selectedClientIds.includes(c.id))
    if (!selected.length) return
    const rows = await createRecipientsBulk(
      form.id,
      session.user.id,
      agencyId,
      selected.map((c) => ({ email: c.email, name: c.full_name || c.company_name, client_id: c.id })),
    )
    setRecipients((prev) => [...rows, ...prev])
    setSelectedClientIds([])
    setMessage(`Added ${rows.length} travelers from clients.`)
  }

  const sendBulk = async () => {
    if (!isPublished) {
      setError('Publish the form first.')
      return
    }
    const pending = recipients.filter((r) => r.email && !r.sent_at)
    if (!pending.length) {
      setMessage('All travelers with email have already been sent a link.')
      return
    }
    setSending(true)
    setError('')
    try {
      for (const r of pending) {
        const link = publicFormUrl(r.access_token)
        await sendEmailViaResend(session, {
          to: r.email,
          subject: `Feedback request: ${form.title}`,
          html: buildTravelerEmailHtml({ formTitle: form.title, recipientName: r.name, link }),
        })
        await markRecipientSent(r.id)
      }
      await load()
      setMessage(`Sent ${pending.length} invitation email${pending.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading distribution…
      </div>
    )
  }

  const steps = [
    { done: isPublished, label: 'Publish form', hint: isPublished ? 'Live for travelers' : 'Click Publish in the toolbar' },
    { done: notificationEmails.length > 0 || true, label: 'Notification email', hint: notificationEmails.length ? notificationEmails.join(', ') : 'Uses agency owner email (set in Security tab to override)' },
    { done: recipients.some((r) => r.sent_at), label: 'Send to travelers', hint: 'Add travelers and send personal links' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Ready to send checklist</h3>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <div>
                <p className="font-medium text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-500">{step.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {!isPublished && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Travelers cannot open the form until you <strong>Publish</strong>. Save your changes, then click Publish in the top bar.</p>
        </div>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p>}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Link2 className="h-4 w-4 text-teal-600" /> Shared link (all travelers)
        </h3>
        <p className="mb-3 text-xs text-slate-500">One link for everyone — each submission is recorded separately. Best for WhatsApp groups or posting in trip chats.</p>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={sharedLink} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <Button type="button" variant="secondary" onClick={() => copyToClipboard(sharedLink)}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Send personal link to a traveler</h3>
        <p className="text-xs text-slate-500">Each traveler gets a unique link — recommended for email invitations and tracking who responded.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={sendOnAdd} onChange={(e) => setSendOnAdd(e.target.checked)} className="rounded text-teal-600" />
          Send invitation email immediately
        </label>
        <Button type="button" onClick={addRecipient} disabled={!email.trim() || sending}>
          <Send className="h-4 w-4" /> Add &amp; send
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4" /> Bulk from clients
        </h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {clients.filter((c) => c.email).slice(0, 50).map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedClientIds.includes(c.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedClientIds((prev) => [...prev, c.id])
                  else setSelectedClientIds((prev) => prev.filter((id) => id !== c.id))
                }}
              />
              {c.full_name || c.company_name} — {c.email}
            </label>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={bulkFromClients} disabled={!selectedClientIds.length}>
          Add selected clients
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Bulk CSV (email, name)</h3>
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={4}
          placeholder="email,name&#10;jane@example.com,Jane Doe"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={bulkFromCsv}>Import CSV</Button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Travelers ({recipients.length})</h3>
        <Button type="button" onClick={sendBulk} disabled={sending || !isPublished}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send all unsent
        </Button>
      </div>

      {recipients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          No travelers yet — add emails above or use the shared link.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Traveler</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Completed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.name || '—'}</div>
                    <div className="text-slate-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{r.status}</td>
                  <td className="px-4 py-3 text-slate-600">{r.sent_at ? formatDate(r.sent_at) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.completed_at ? formatDate(r.completed_at) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => copyToClipboard(publicFormUrl(r.access_token), 'Personal link copied')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" onClick={() => sendToRecipient(r)} disabled={sending}>
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-medium text-slate-700">When a traveler submits:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Response is saved in <strong>Forms → Responses</strong></li>
          <li>Your team gets an email summary via Resend (configure in Security tab or uses owner email)</li>
          <li>Personal links are one-time per traveler; shared link accepts unlimited responses</li>
        </ul>
      </div>
    </div>
  )
}
