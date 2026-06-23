import { useEffect, useRef, useState } from 'react'
import {
  Bot, Building2, Loader2, MapPin, Send, Sparkles, User, Wand2,
  Mail, Phone, Wallet, Calendar, CheckCircle2, AlertCircle,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
import { extractCrmCapture, findMatchingClient, saveCrmCapture } from '../../services/crmCapture'
import { formatClientName, labelFor } from '../../utils/format'
import { TRAVEL_TYPES, CLIENT_TYPES } from '../../constants/enums'

const WELCOME = {
  client: {
    title: 'Quick capture',
    body: 'Describe your new client in plain language — name, email, phone, and any notes. I’ll structure it for you.',
    hints: [
      'John Kennedy — john@email.com, +357 99 123456. Prefers email.',
      'Corporate: Acme Travel Ltd, contact Sarah Miller, sarah@acme.com',
    ],
  },
  lead: {
    title: 'Quick capture',
    body: 'Paste an enquiry, email snippet, or WhatsApp message. I’ll extract the client and trip details.',
    hints: [
      'Maria Papadopou — wants Santorini 10–17 Aug, 2 adults, budget €4500, honeymoon',
      'New lead: James Lee, james@company.com, Cyprus incentive trip in September, ~€6k',
    ],
  },
}

function PreviewRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function CapturePreview({ capture, matchedClient, mode }) {
  const client = capture?.client
  const lead = capture?.lead

  return (
    <div className="overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/50 via-white to-violet-50/30 shadow-sm">
      <div className="border-b border-teal-100/80 bg-white/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-600" />
          <p className="text-sm font-semibold text-slate-800">{capture.summary}</p>
        </div>
        {capture._fallbackNote && (
          <p className="mt-1 text-xs text-amber-700">{capture._fallbackNote}</p>
        )}
      </div>

      {matchedClient && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Matching client found: <strong>{formatClientName(matchedClient)}</strong>
            {matchedClient.email ? ` (${matchedClient.email})` : ''}. The lead will link to this record.
          </p>
        </div>
      )}

      <div className="grid gap-0 divide-y divide-slate-100 px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {client && (
          <div className="py-2 sm:pr-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">
              <User className="h-3.5 w-3.5" /> Client
            </p>
            <PreviewRow
              icon={client.client_type === 'business' ? Building2 : User}
              label="Type"
              value={labelFor(CLIENT_TYPES, client.client_type)}
            />
            <PreviewRow icon={User} label="Name" value={client.full_name} />
            <PreviewRow icon={Building2} label="Company" value={client.company_name} />
            <PreviewRow icon={Mail} label="Email" value={client.email} />
            <PreviewRow icon={Phone} label="Phone" value={client.phone} />
            {client.notes && <PreviewRow icon={Sparkles} label="Notes" value={client.notes} />}
          </div>
        )}

        {lead && mode === 'lead' && (
          <div className="py-2 sm:pl-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
              <MapPin className="h-3.5 w-3.5" /> Lead
            </p>
            <PreviewRow icon={MapPin} label="Destination" value={lead.destination} />
            <PreviewRow icon={Sparkles} label="Travel type" value={labelFor(TRAVEL_TYPES, lead.travel_type)} />
            <PreviewRow icon={Wallet} label="Budget" value={lead.budget ? `€${Number(lead.budget).toLocaleString()}` : null} />
            <PreviewRow
              icon={User}
              label="Travellers"
              value={`${lead.number_of_adults} adult${lead.number_of_adults === 1 ? '' : 's'}${lead.number_of_children ? `, ${lead.number_of_children} child${lead.number_of_children === 1 ? '' : 'ren'}` : ''}`}
            />
            <PreviewRow icon={Calendar} label="Dates" value={lead.travel_dates} />
            {lead.notes && <PreviewRow icon={Sparkles} label="Notes" value={lead.notes} />}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CrmQuickCaptureModal({ isOpen, onClose, mode = 'lead', onSaved }) {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const welcome = WELCOME[mode] || WELCOME.lead

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [capture, setCapture] = useState(null)
  const [matchedClient, setMatchedClient] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcome.body,
      },
    ])
    setInput('')
    setError('')
    setCapture(null)
    setMatchedClient(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, mode, welcome.body])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, capture, extracting])

  async function handleSend() {
    const text = input.trim()
    if (!text || extracting) return

    setInput('')
    setError('')
    setCapture(null)
    setMatchedClient(null)

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setExtracting(true)

    try {
      const result = await extractCrmCapture(text, session, { mode, useAi: true })
      setCapture(result)

      if (result.client?.email || result.client?.phone) {
        const match = await findMatchingClient({
          email: result.client.email,
          phone: result.client.phone,
        })
        setMatchedClient(match)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: result.summary,
          capture: result,
        },
      ])
    } catch (err) {
      setError(err.message || 'Could not extract details. Try rephrasing or use quick parse.')
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setExtracting(false)
    }
  }

  async function handleQuickParse() {
    const text = input.trim() || messages.find((m) => m.role === 'user')?.content
    if (!text) {
      setError('Type your message first.')
      return
    }

    setError('')
    setExtracting(true)
    try {
      const result = await extractCrmCapture(text, session, { mode, useAi: false })
      setCapture(result)
      if (result.client?.email || result.client?.phone) {
        const match = await findMatchingClient({
          email: result.client.email,
          phone: result.client.phone,
        })
        setMatchedClient(match)
      }
      if (!messages.some((m) => m.role === 'user' && m.content === text)) {
        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: result.summary, capture: result },
      ])
      setInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave({ withLead = true } = {}) {
    if (!capture) return
    setSaving(true)
    setError('')
    try {
      const result = await saveCrmCapture({
        capture,
        existingClientId: matchedClient?.id || null,
        userId: user.id,
        agencyId: agency?.id,
        session,
        createLeadRecord: withLead && mode === 'lead',
      })
      onSaved?.(result)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleHint(hint) {
    setInput(hint)
    inputRef.current?.focus()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={welcome.title}
      subtitle={mode === 'client' ? 'Add clients by describing them naturally' : 'Capture enquiries from email, chat, or phone notes'}
    >
      <div className="flex min-h-[28rem] flex-col">
        {/* Chat area */}
        <div
          ref={scrollRef}
          className="mb-4 max-h-[22rem] flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-4"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-violet-700 text-white shadow-md shadow-teal-900/20">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-slate-900 text-white'
                    : msg.isError
                      ? 'rounded-tl-md border border-rose-200 bg-rose-50 text-rose-800'
                      : 'rounded-tl-md border border-slate-200/80 bg-white text-slate-700'
                }`}
              >
                {msg.role === 'assistant' && !msg.isError && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Assistant</p>
                )}
                <p>{msg.content}</p>
              </div>
            </div>
          ))}

          {extracting && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-violet-700 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <div className="space-y-2">
                  <div className="h-2 w-48 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-2 w-64 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hints */}
        {!capture && !extracting && (
          <div className="mb-4 flex flex-wrap gap-2">
            {welcome.hints.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => handleHint(hint)}
                className="rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-left text-xs text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
              >
                {hint.length > 72 ? `${hint.slice(0, 72)}…` : hint}
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {capture && (
          <div className="mb-4">
            <CapturePreview capture={capture} matchedClient={matchedClient} mode={mode} />
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        {/* Input */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={3}
            placeholder={
              mode === 'client'
                ? 'e.g. John Kennedy, john@email.com, +357 99 123456…'
                : 'e.g. New enquiry — name, contact, destination, dates, budget…'
            }
            className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleQuickParse}
              disabled={extracting || (!input.trim() && !messages.some((m) => m.role === 'user'))}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Quick parse
            </button>
            <Button type="button" size="sm" onClick={handleSend} disabled={extracting || !input.trim()}>
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {extracting ? 'Extracting…' : 'Extract with AI'}
            </Button>
          </div>
        </div>

        {/* Save actions */}
        {capture && (
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {mode === 'lead' && capture.lead ? (
              <Button type="button" onClick={() => handleSave({ withLead: true })} disabled={saving}>
                {saving ? 'Saving…' : matchedClient ? 'Create lead' : 'Create client & lead'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSave({ withLead: false })}
                disabled={saving || (matchedClient && !capture.lead)}
              >
                {saving ? 'Saving…' : matchedClient ? 'Client already exists' : 'Save client'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
