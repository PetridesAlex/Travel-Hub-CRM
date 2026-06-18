import { useEffect, useState } from 'react'
import { Copy, Mail, Link2, Loader2, Users } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Table from '../ui/Table'
import { getRecipients, createRecipient, createRecipientsBulk, ensureGenericRecipient, markRecipientSent, parseCsvRecipients } from '../../services/formRecipients'
import { getClients } from '../../services/clients'
import { sendEmailViaResend } from '../../services/emailSend'
import { publicFormUrl } from '../../constants/formFields'
import { formatDate } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'

export default function FormDistributePanel({ form, agencyId }) {
  const { session } = useAuth()
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [genericLink, setGenericLink] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [clients, setClients] = useState([])
  const [selectedClientIds, setSelectedClientIds] = useState([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rows, generic] = await Promise.all([
        getRecipients(form.id),
        ensureGenericRecipient(form.id, agencyId),
      ])
      setRecipients(rows)
      setGenericLink(publicFormUrl(generic.access_token))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (form?.id) load()
    getClients().then(setClients).catch(() => {})
  }, [form?.id, agencyId])

  const copyLink = async (token) => {
    await navigator.clipboard.writeText(publicFormUrl(token))
    setMessage('Link copied to clipboard')
  }

  const addRecipient = async () => {
    const row = await createRecipient(form.id, agencyId, { email, name })
    setRecipients((prev) => [row, ...prev])
    setEmail('')
    setName('')
  }

  const bulkFromCsv = async () => {
    const parsed = parseCsvRecipients(csvText)
    if (!parsed.length) {
      setMessage('No valid rows in CSV')
      return
    }
    const rows = await createRecipientsBulk(form.id, session.user.id, agencyId, parsed)
    setRecipients((prev) => [...rows, ...prev])
    setCsvText('')
    setMessage(`Added ${rows.length} recipients`)
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
    setMessage(`Added ${rows.length} recipients from clients`)
  }

  const sendToRecipient = async (recipient) => {
    if (!recipient.email) {
      setMessage('Recipient has no email address')
      return
    }
    setSending(true)
    try {
      const link = publicFormUrl(recipient.access_token)
      await sendEmailViaResend(session, {
        to: recipient.email,
        subject: `Please complete: ${form.title}`,
        html: `<p>Hi${recipient.name ? ` ${recipient.name}` : ''},</p><p>Please take a moment to complete our form:</p><p><a href="${link}">${form.title}</a></p>`,
      })
      await markRecipientSent(recipient.id)
      await load()
      setMessage(`Email sent to ${recipient.email}`)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSending(false)
    }
  }

  const sendBulk = async () => {
    const pending = recipients.filter((r) => r.email && !r.sent_at)
    if (!pending.length) {
      setMessage('No unsent recipients with email')
      return
    }
    setSending(true)
    try {
      for (const r of pending) {
        await sendToRecipient(r)
      }
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

  return (
    <div className="space-y-6">
      {message && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p>}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Link2 className="h-4 w-4 text-teal-600" /> Generic link
        </h3>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={genericLink} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <Button type="button" variant="secondary" onClick={() => copyLink(genericLink.split('/').pop())}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Add recipient</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="button" onClick={addRecipient} disabled={!email}>Add recipient</Button>
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
        <h3 className="text-sm font-semibold text-slate-800">Recipients ({recipients.length})</h3>
        <Button type="button" onClick={sendBulk} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send all unsent
        </Button>
      </div>

      <Table variant="premium">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Recipient</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Sent</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Opened</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Completed</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-slate-800">{r.name || '—'}</div>
                <div className="text-slate-500">{r.email || 'Open link'}</div>
              </td>
              <td className="px-4 py-3 text-sm capitalize text-slate-600">{r.status}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{r.sent_at ? formatDate(r.sent_at) : '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{r.opened_at ? formatDate(r.opened_at) : '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{r.completed_at ? formatDate(r.completed_at) : '—'}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => copyLink(r.access_token)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {r.email && (
                    <Button type="button" size="sm" onClick={() => sendToRecipient(r)} disabled={sending}>
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
