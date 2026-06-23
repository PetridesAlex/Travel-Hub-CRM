import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot, Building2, Loader2, MapPin, Send, Sparkles, User, Wand2,
  Mail, Phone, Wallet, Calendar, CheckCircle2, AlertCircle, Target, FileText,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
import { extractCrmCapture, findMatchingClient, saveCrmCapture } from '../../services/crmCapture'
import { formatClientName, labelFor } from '../../utils/format'
import { TRAVEL_TYPES, CLIENT_TYPES } from '../../constants/enums'
import { CAPTURE_PROFILES, getCaptureProfile } from '../../constants/crmCaptureTemplates'

const PROFILE_ICONS = { user: User, building: Building2, target: Target }

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
            {matchedClient.email ? ` (${matchedClient.email})` : ''}.
            {mode === 'lead' ? ' The new lead will link to this record.' : ' This client already exists.'}
          </p>
        </div>
      )}

      <div className="grid gap-0 divide-y divide-slate-100 px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {client && (
          <div className="py-2 sm:pr-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">
              <User className="h-3.5 w-3.5" /> Client
            </p>
            <PreviewRow icon={client.client_type === 'business' ? Building2 : User} label="Type" value={labelFor(CLIENT_TYPES, client.client_type)} />
            <PreviewRow icon={User} label={client.client_type === 'business' ? 'Contact person' : 'Full name'} value={client.full_name} />
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

export default function CrmQuickCaptureModal({
  isOpen,
  onClose,
  mode = 'lead',
  initialProfile = 'individual',
  onSaved,
}) {
  const { user, session } = useAuth()
  const { agency } = useAgency()

  const profiles = useMemo(
    () => (mode === 'lead' ? [CAPTURE_PROFILES.enquiry] : [CAPTURE_PROFILES.individual, CAPTURE_PROFILES.business]),
    [mode],
  )

  const [profileId, setProfileId] = useState(initialProfile)
  const profile = getCaptureProfile(mode, profileId)
  const ProfileIcon = PROFILE_ICONS[profile.icon] || Bot

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [capture, setCapture] = useState(null)
  const [matchedClient, setMatchedClient] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const clientType = mode === 'client' ? profile.clientType : null

  useEffect(() => {
    if (!isOpen) return
    const nextProfile = mode === 'lead' ? 'enquiry' : initialProfile
    setProfileId(nextProfile)
    const p = getCaptureProfile(mode, nextProfile)
    setMessages([{ id: 'welcome', role: 'assistant', content: p.welcome }])
    setInput('')
    setError('')
    setCapture(null)
    setMatchedClient(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, mode, initialProfile])

  useEffect(() => {
    if (!isOpen || mode === 'lead') return
    const p = getCaptureProfile(mode, profileId)
    setMessages([{ id: 'welcome', role: 'assistant', content: p.welcome }])
    setCapture(null)
    setMatchedClient(null)
    setError('')
  }, [profileId, isOpen, mode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, capture, extracting])

  async function runExtract(text, useAi) {
    const result = await extractCrmCapture(text, session, { mode, useAi, clientType })
    setCapture(result)

    if (result.client?.email || result.client?.phone) {
      const match = await findMatchingClient({
        email: result.client.email,
        phone: result.client.phone,
      })
      setMatchedClient(match)
    } else {
      setMatchedClient(null)
    }

    return result
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || extracting) return

    setInput('')
    setError('')
    setCapture(null)
    setMatchedClient(null)
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
    setExtracting(true)

    try {
      const result = await runExtract(text, true)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: result.summary }])
    } catch (err) {
      setError(err.message || 'Could not extract details. Try rephrasing or use quick parse.')
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: err.message || 'Something went wrong.', isError: true },
      ])
    } finally {
      setExtracting(false)
    }
  }

  async function handleQuickParse() {
    const text = input.trim() || [...messages].reverse().find((m) => m.role === 'user')?.content
    if (!text) {
      setError('Type your message first.')
      return
    }

    setError('')
    setExtracting(true)
    try {
      const result = await runExtract(text, false)
      if (!messages.some((m) => m.role === 'user' && m.content === text)) {
        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
      }
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: result.summary }])
      setInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave({ withLead = true } = {}) {
    if (!capture) return
    if (matchedClient && mode === 'client') {
      setError('This client already exists. Edit them from the client list.')
      return
    }
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="AI assistant"
      subtitle={mode === 'client' ? 'Add individual or corporate clients in plain language' : 'Capture travel enquiries from any message'}
    >
      <div className="flex min-h-[32rem] flex-col">
        {/* Profile tabs (client mode) */}
        {mode === 'client' && profiles.length > 1 && (
          <div className="mb-4 flex gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1">
            {profiles.map((p) => {
              const Icon = PROFILE_ICONS[p.icon] || User
              const active = profileId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? (p.id === 'business' ? 'text-violet-600' : 'text-teal-600') : ''}`} />
                  {p.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
          {/* Template sidebar */}
          <div className="hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-900 to-slate-800 p-4 text-white shadow-lg lg:block">
            <div className="mb-3 flex items-center gap-2">
              <ProfileIcon className="h-4 w-4 text-teal-300" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Template</p>
            </div>
            <p className="text-sm font-semibold text-white">{profile.label}</p>
            <ul className="mt-3 space-y-2">
              {profile.fields.map((field) => (
                <li key={field} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-1 w-1 rounded-full bg-teal-400" />
                  {field}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setInput(profile.template)
                inputRef.current?.focus()
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <FileText className="h-3.5 w-3.5" />
              Use blank template
            </button>
            <button
              type="button"
              onClick={() => {
                setInput(profile.example)
                inputRef.current?.focus()
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-500/20 px-3 py-2 text-xs font-medium text-teal-100 transition hover:bg-teal-500/30"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load example
            </button>
          </div>

          <div className="flex min-h-0 flex-col">
            {/* Chat */}
            <div
              ref={scrollRef}
              className="mb-3 max-h-[16rem] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-4"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-violet-700 text-white shadow-md">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-slate-900 text-white'
                        : msg.isError
                          ? 'rounded-tl-md border border-rose-200 bg-rose-50 text-rose-800'
                          : 'rounded-tl-md border border-slate-200/80 bg-white text-slate-700'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.isError && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Assistant</p>
                    )}
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              {extracting && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-violet-700 text-white">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
                    <p className="text-xs text-slate-500">Understanding your message…</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hints */}
            {!capture && !extracting && (
              <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
                <button type="button" onClick={() => setInput(profile.example)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                  Load example
                </button>
                <button type="button" onClick={() => setInput(profile.template)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                  Blank template
                </button>
              </div>
            )}

            {capture && (
              <div className="mb-3">
                <CapturePreview capture={capture} matchedClient={matchedClient} mode={mode} />
              </div>
            )}

            {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

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
                placeholder={profile.placeholder}
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
                  {extracting ? 'Working…' : 'Send to AI'}
                </Button>
              </div>
            </div>
          </div>
        </div>

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
                disabled={saving || Boolean(matchedClient)}
              >
                {saving ? 'Saving…' : matchedClient ? 'Already in CRM' : `Save ${profile.label.toLowerCase()}`}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
