import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Save, Upload, Loader2, RotateCcw, RefreshCw, ImageIcon, PenLine, X, Sparkles, Mic,
  Plane, Ship, Building2, Send, CreditCard, User, Check, ChevronRight, FileText, Lock,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { getClients } from '../services/clients'
import { createEmailDraft } from '../services/emailDrafts'
import { extractTextFromImage, readImageFile } from '../utils/screenshotOcr'
import { parseFlightScreenshot, mergeParsedFlightScreenshots, buildRouteLabel } from '../utils/parseFlightScreenshot'
import { buildEmailFromInput, regenerateEmail } from '../utils/generateFromInstructions'
import { formatClientOptionLabel } from '../utils/format'
import FlightQuotationPreview from '../components/FlightQuotationPreview'
import FlightQuickEdit from '../components/FlightQuickEdit'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { EMAIL_TEMPLATES } from '../constants/emailAssistantPrompt'
import { canUseAiEmail } from '../utils/generateEmailWithAI'

const MODES = [
  { id: 'write', label: 'Write', icon: PenLine },
  { id: 'screenshot', label: 'Screenshot', icon: ImageIcon },
  { id: 'both', label: 'Both', icon: Upload },
]

const MAX_SCREENSHOTS = 5

const TEMPLATE_UI = {
  flight_offer: {
    icon: Plane,
    accent: 'teal',
    briefHint: 'Outline route, travel dates, fare conditions, and any requirements for the client.',
  },
  cruise_offer: {
    icon: Ship,
    accent: 'blue',
    briefHint: 'Describe ship, itinerary, cabin type, dates, and key selling points.',
  },
  hotel_offer: {
    icon: Building2,
    accent: 'violet',
    briefHint: 'Specify property, room type, dates, board basis, and rate details.',
  },
  supplier_request: {
    icon: Send,
    accent: 'indigo',
    briefHint: 'State what you need from the supplier — dates, rooms, guests, and terms.',
  },
  payment_reminder: {
    icon: CreditCard,
    accent: 'amber',
    briefHint: 'Note amount due, deadline, and booking reference if applicable.',
  },
}

const ACCENT = {
  teal: {
    selected: 'border-teal-500/80 bg-gradient-to-br from-teal-50 to-white ring-2 ring-teal-500/25 shadow-sm',
    icon: 'bg-teal-600 text-white shadow-teal-600/25',
    iconMuted: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100',
    chip: 'bg-teal-50 text-teal-800 ring-teal-200/80',
    bar: 'via-teal-500/40',
    focus: 'focus-within:ring-teal-500/20 focus-within:border-teal-400',
    recordBg: 'bg-teal-50/70',
    recordText: 'text-teal-800',
    dictateHover: 'hover:bg-teal-50 hover:text-teal-800 hover:ring-teal-200',
    uploadHover: 'hover:border-teal-400 hover:bg-teal-50/30',
    uploadBtn: 'bg-teal-700 hover:bg-teal-800',
    progress: 'text-teal-800',
    sideAccent: 'bg-teal-500/20',
  },
  blue: {
    selected: 'border-blue-500/80 bg-gradient-to-br from-blue-50 to-white ring-2 ring-blue-500/25 shadow-sm',
    icon: 'bg-blue-600 text-white shadow-blue-600/25',
    iconMuted: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    chip: 'bg-blue-50 text-blue-800 ring-blue-200/80',
    bar: 'via-blue-500/40',
    focus: 'focus-within:ring-blue-500/20 focus-within:border-blue-400',
    recordBg: 'bg-blue-50/70',
    recordText: 'text-blue-800',
    dictateHover: 'hover:bg-blue-50 hover:text-blue-800 hover:ring-blue-200',
    uploadHover: 'hover:border-blue-400 hover:bg-blue-50/30',
    uploadBtn: 'bg-blue-700 hover:bg-blue-800',
    progress: 'text-blue-800',
    sideAccent: 'bg-blue-500/20',
  },
  violet: {
    selected: 'border-violet-500/80 bg-gradient-to-br from-violet-50 to-white ring-2 ring-violet-500/25 shadow-sm',
    icon: 'bg-violet-600 text-white shadow-violet-600/25',
    iconMuted: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    chip: 'bg-violet-50 text-violet-800 ring-violet-200/80',
    bar: 'via-violet-500/40',
    focus: 'focus-within:ring-violet-500/20 focus-within:border-violet-400',
    recordBg: 'bg-violet-50/70',
    recordText: 'text-violet-800',
    dictateHover: 'hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200',
    uploadHover: 'hover:border-violet-400 hover:bg-violet-50/30',
    uploadBtn: 'bg-violet-700 hover:bg-violet-800',
    progress: 'text-violet-800',
    sideAccent: 'bg-violet-500/20',
  },
  indigo: {
    selected: 'border-indigo-500/80 bg-gradient-to-br from-indigo-50 to-white ring-2 ring-indigo-500/25 shadow-sm',
    icon: 'bg-indigo-600 text-white shadow-indigo-600/25',
    iconMuted: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
    bar: 'via-indigo-500/40',
    focus: 'focus-within:ring-indigo-500/20 focus-within:border-indigo-400',
    recordBg: 'bg-indigo-50/70',
    recordText: 'text-indigo-800',
    dictateHover: 'hover:bg-indigo-50 hover:text-indigo-800 hover:ring-indigo-200',
    uploadHover: 'hover:border-indigo-400 hover:bg-indigo-50/30',
    uploadBtn: 'bg-indigo-700 hover:bg-indigo-800',
    progress: 'text-indigo-800',
    sideAccent: 'bg-indigo-500/20',
  },
  amber: {
    selected: 'border-amber-500/80 bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-500/25 shadow-sm',
    icon: 'bg-amber-600 text-white shadow-amber-600/25',
    iconMuted: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
    chip: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    bar: 'via-amber-500/40',
    focus: 'focus-within:ring-amber-500/20 focus-within:border-amber-400',
    recordBg: 'bg-amber-50/70',
    recordText: 'text-amber-900',
    dictateHover: 'hover:bg-amber-50 hover:text-amber-900 hover:ring-amber-200',
    uploadHover: 'hover:border-amber-400 hover:bg-amber-50/30',
    uploadBtn: 'bg-amber-700 hover:bg-amber-800',
    progress: 'text-amber-900',
    sideAccent: 'bg-amber-500/20',
  },
}

function ComposerStep({ number, title, subtitle, accent = 'teal', children }) {
  const styles = ACCENT[accent] || ACCENT.teal
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${styles.icon}`}>
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  )
}

function ReadinessChip({ label, ready, accent = 'teal' }) {
  const styles = ACCENT[accent] || ACCENT.teal
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 transition-all ${
        ready ? styles.chip : 'bg-slate-100 text-slate-400 ring-slate-200/60'
      }`}
    >
      {ready ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />}
      {label}
    </span>
  )
}

export default function AIEmailAssistant() {
  const { user, session } = useAuth()
  const fileInputRef = useRef(null)
  const emailEditorRef = useRef(null)
  const [mode, setMode] = useState('both')
  const [clients, setClients] = useState([])
  const [emailType, setEmailType] = useState('flight_offer')
  const [recipientName, setRecipientName] = useState('')
  const [clientId, setClientId] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [extraNotes, setExtraNotes] = useState('')
  const [regenInstruction, setRegenInstruction] = useState('')
  const [flightData, setFlightData] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [generating, setGenerating] = useState(false)

  const {
    transcript,
    isListening,
    isSupported: speechSupported,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition()

  useEffect(() => {
    if (isListening) {
      setUserPrompt(transcript)
    }
  }, [transcript, isListening])

  function handleStartVoice() {
    startListening(userPrompt)
  }

  useEffect(() => {
    getClients().then(setClients).catch(console.error)
  }, [])

  useEffect(() => {
    const client = clients.find((c) => c.id === clientId)
    if (client) setRecipientName(client.full_name)
  }, [clientId, clients])

  function getClientName() {
    return recipientName.trim() || clients.find((c) => c.id === clientId)?.full_name || 'Valued Client'
  }

  function getSource() {
    return {
      emailType,
      clientName: getClientName(),
      userPrompt,
      flightData,
      price,
      currency,
      destination: flightData ? buildRouteLabel(flightData) : '',
      extraNotes,
    }
  }

  const selectedTemplate = EMAIL_TEMPLATES.find((t) => t.id === emailType) || EMAIL_TEMPLATES[0]
  const templateUi = TEMPLATE_UI[emailType] || TEMPLATE_UI.flight_offer
  const accent = templateUi.accent
  const accentStyles = ACCENT[accent] || ACCENT.teal
  const TemplateIcon = templateUi.icon

  function hasContentToGenerate() {
    const hasPrompt = Boolean(userPrompt.trim())
    const hasFlight = Boolean(flightData?.legs?.length)
    const hasNotes = Boolean(extraNotes.trim())
    const hasPrice = Boolean(price.trim())

    if (emailType === 'payment_reminder') {
      return hasPrompt || hasNotes || hasPrice
    }
    if (emailType === 'supplier_request') {
      return hasPrompt || hasNotes
    }
    if (emailType === 'flight_offer') {
      if (mode === 'write') return hasPrompt || hasFlight || hasNotes
      if (mode === 'screenshot') return hasFlight || screenshots.length > 0
      return hasPrompt || hasFlight || hasNotes || screenshots.length > 0
    }

    if (mode === 'write') return hasPrompt || hasNotes || hasPrice
    if (mode === 'screenshot') return hasFlight || screenshots.length > 0
    return hasPrompt || hasNotes || hasPrice || hasFlight || screenshots.length > 0
  }

  function getPromptPlaceholder() {
    const placeholders = {
      flight_offer: 'Prepare a formal quotation for Mr Alex — return flight Paphos to Athens, 19–25 June. Note fares are subject to availability and passport copies are required to proceed.',
      cruise_offer: 'Formal cruise offer — 7-night Western Mediterranean, MSC Seaside, balcony cabin, departing Barcelona 12 July. Include drinks package and availability disclaimer.',
      hotel_offer: 'Hotel quotation — 5 nights Hilton Athens, deluxe room, bed & breakfast, check-in 15 June. Request sea view if available.',
      supplier_request: 'Request availability and net rates — 2 adults, double room, Santorini, 20–23 August. Include cancellation policy.',
      payment_reminder: 'Polite payment reminder — €500 balance due by 15 June to confirm the booking.',
    }
    return placeholders[emailType] || placeholders.flight_offer
  }

  function applyMergedFlightData(items) {
    const merged = mergeParsedFlightScreenshots(items.map((item) => item.parsed).filter(Boolean))
    setFlightData(merged)
    if (merged?.totalPrice) setPrice(merged.totalPrice)
    if (merged?.currency) setCurrency(merged.currency)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith('image/'))
    if (!files.length) {
      alert('Please upload image files (PNG or JPG)')
      return
    }

    const slotsLeft = MAX_SCREENSHOTS - screenshots.length
    if (slotsLeft <= 0) {
      alert(`You can upload up to ${MAX_SCREENSHOTS} screenshots`)
      return
    }

    const filesToAdd = files.slice(0, slotsLeft)
    if (files.length > slotsLeft) {
      alert(`Only ${slotsLeft} more screenshot${slotsLeft === 1 ? '' : 's'} can be added (max ${MAX_SCREENSHOTS})`)
    }

    setExtracting(true)
    setExtractProgress(0)

    const newItems = []

    try {
      for (let i = 0; i < filesToAdd.length; i++) {
        const file = filesToAdd[i]
        const preview = await readImageFile(file)
        const rawText = await extractTextFromImage(file, (progress) => {
          const overall = ((i + progress / 100) / filesToAdd.length) * 100
          setExtractProgress(Math.round(overall))
        })
        newItems.push({
          id: crypto.randomUUID(),
          preview,
          name: file.name,
          parsed: parseFlightScreenshot(rawText),
        })
      }

      const nextScreenshots = [...screenshots, ...newItems]
      setScreenshots(nextScreenshots)
      applyMergedFlightData(nextScreenshots)
    } catch (err) {
      alert(`Could not read screenshot: ${err.message}`)
    } finally {
      setExtracting(false)
      setExtractProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleRemoveScreenshot(id) {
    const nextScreenshots = screenshots.filter((item) => item.id !== id)
    setScreenshots(nextScreenshots)

    if (!nextScreenshots.length) {
      setFlightData(null)
      setPrice('')
      setCurrency('EUR')
      return
    }

    applyMergedFlightData(nextScreenshots)
  }

  function handleClearScreenshots() {
    setScreenshots([])
    setFlightData(null)
    setPrice('')
    setCurrency('EUR')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleStopVoiceAndGenerate() {
    stopListening()
    setTimeout(() => {
      handleGenerate()
    }, 300)
  }

  function handleReset() {
    stopListening()
    setFlightData(null)
    setScreenshots([])
    setHasGenerated(false)
    setEditSubject('')
    setEditBody('')
    setShowEdit(false)
    setUserPrompt('')
    setRegenInstruction('')
    setRecipientName('')
    setClientId('')
    setPrice('')
    setExtraNotes('')
    setGenerateError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGenerate() {
    setGenerateError('')

    if (!hasContentToGenerate()) {
      const message = emailType === 'flight_offer'
        ? (mode === 'write'
          ? 'Write what you want in the email, or switch to Screenshot / Both mode and upload a flight screenshot.'
          : mode === 'screenshot'
            ? 'Upload a flight screenshot first.'
            : 'Write instructions and/or upload a flight screenshot.')
        : 'Add instructions describing what the email should include.'
      setGenerateError(message)
      return
    }

    setGenerating(true)
    try {
      const email = await buildEmailFromInput({ ...getSource(), session })
      setEditSubject(email.subject || selectedTemplate.subjectPrefix)
      setEditBody(email.body || '')
      setHasGenerated(true)
      setRegenInstruction('')

      requestAnimationFrame(() => {
        emailEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      setGenerateError(err.message || 'Could not generate email. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRegenerate() {
    setGenerateError('')

    if (!regenInstruction.trim()) {
      setGenerateError('Describe what you want to change before regenerating.')
      return
    }

    setGenerating(true)
    try {
      const email = await regenerateEmail(getSource(), regenInstruction, {
        subject: editSubject,
        body: editBody,
      }, session)
      setEditSubject(email.subject || editSubject)
      setEditBody(email.body || editBody)
      setRegenInstruction('')

      requestAnimationFrame(() => {
        emailEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      setGenerateError(err.message || 'Could not regenerate email. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!editSubject || !editBody) return
    setSaving(true)
    try {
      await createEmailDraft({
        client_id: clientId || null,
        email_type: emailType,
        subject: editSubject,
        body: editBody,
      }, user.id)
      alert('Email draft saved!')
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!editBody) return
    await navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clientOptions = [{ value: '', label: 'Select from clients...' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const showUpload = mode === 'screenshot' || mode === 'both'
  const showPrompt = mode === 'write' || mode === 'both'
  const showClientFields = emailType !== 'supplier_request'
  const showFlightUpload = showUpload && emailType === 'flight_offer'

  const readiness = useMemo(() => {
    const hasPrompt = Boolean(userPrompt.trim())
    const hasFlight = Boolean(flightData?.legs?.length)
    const hasNotes = Boolean(extraNotes.trim())
    const hasPrice = Boolean(price.trim())
    let ready = false

    if (emailType === 'payment_reminder') ready = hasPrompt || hasNotes || hasPrice
    else if (emailType === 'supplier_request') ready = hasPrompt || hasNotes
    else if (emailType === 'flight_offer') {
      if (mode === 'write') ready = hasPrompt || hasFlight || hasNotes
      else if (mode === 'screenshot') ready = hasFlight || screenshots.length > 0
      else ready = hasPrompt || hasFlight || hasNotes || screenshots.length > 0
    } else if (mode === 'write') ready = hasPrompt || hasNotes || hasPrice
    else if (mode === 'screenshot') ready = hasFlight || screenshots.length > 0
    else ready = hasPrompt || hasNotes || hasPrice || hasFlight || screenshots.length > 0

    return {
      recipient: showClientFields ? Boolean(recipientName.trim() || clientId) : true,
      brief: hasPrompt,
      screenshots: screenshots.length > 0,
      flightData: hasFlight,
      ready,
    }
  }, [emailType, recipientName, clientId, userPrompt, screenshots.length, flightData, mode, extraNotes, price, showClientFields])

  const briefCharCount = userPrompt.trim().length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-500/20 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 ring-1 ring-teal-400/30">
            <Sparkles className="h-5 w-5 text-teal-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">AI Email Assistant</h2>
            <p className="mt-1 text-sm text-slate-300">
              Compose professional client emails from voice notes, written briefs, or flight screenshots.
              {canUseAiEmail(session) ? '' : ' Sign in to enable AI generation.'}{' '}
              <Link to="/ai-workspace/generator" className="text-teal-300 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-200">
                AI Workspace
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 shadow-sm">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              mode === id
                ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent ${accentStyles.bar} to-transparent transition-all duration-500`} />

        {/* Dynamic composer header */}
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all duration-300 ${accentStyles.icon}`}>
                <TemplateIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Compose</p>
                <h3 className="text-base font-semibold tracking-tight text-slate-900 transition-all duration-300">
                  {selectedTemplate.label}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{selectedTemplate.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {showClientFields && <ReadinessChip label="Recipient" ready={readiness.recipient} accent={accent} />}
              {showPrompt && <ReadinessChip label="Brief" ready={readiness.brief} accent={accent} />}
              {showFlightUpload && <ReadinessChip label="Screenshots" ready={readiness.screenshots} accent={accent} />}
              {readiness.flightData && <ReadinessChip label="Flight data" ready accent={accent} />}
            </div>
          </div>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-6">
          <ComposerStep number={1} title="Choose template" subtitle="Select the type of correspondence" accent={accent}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EMAIL_TEMPLATES.map((template) => {
                const ui = TEMPLATE_UI[template.id] || TEMPLATE_UI.flight_offer
                const Icon = ui.icon
                const styles = ACCENT[ui.accent] || ACCENT.teal
                const isSelected = emailType === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setEmailType(template.id)}
                    className={`group relative flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
                      isSelected
                        ? styles.selected
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                      isSelected ? styles.icon + ' shadow-sm' : styles.iconMuted
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                          {template.label}
                        </p>
                        {isSelected && <Check className="h-3.5 w-3.5 text-slate-500" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{template.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </ComposerStep>

          <ComposerStep
            number={2}
            title={showClientFields ? 'Recipient details' : 'Supplier correspondence'}
            subtitle={showClientFields ? 'Personalise the greeting and link to your CRM' : 'Formal request addressed to the supplier'}
            accent={accent}
          >
            {showClientFields ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40">
                <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-slate-200/80">
                  <div className="border-b border-slate-200/80 p-4 sm:border-b-0">
                    <Select
                      label="Link to client"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      options={clientOptions}
                      className="[&_select]:border-slate-200/80 [&_select]:bg-white"
                    />
                  </div>
                  <div className="p-4">
                    <Input
                      label="Recipient name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Mr Alex Petrides"
                      className="[&_input]:border-slate-200/80 [&_input]:bg-white"
                    />
                  </div>
                </div>
                {recipientName.trim() && (
                  <div className="flex items-center gap-2 border-t border-slate-200/80 bg-white/60 px-4 py-2.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs text-slate-600">
                      Email will open with <span className="font-semibold text-slate-800">Dear {recipientName.trim()},</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-200/60 bg-indigo-50/40 px-4 py-3">
                <Send className="h-4 w-4 text-indigo-600" />
                <p className="text-sm text-indigo-900">Opens with a formal <span className="font-semibold">Dear Supplier,</span> greeting.</p>
              </div>
            )}
          </ComposerStep>

          {(showPrompt || showFlightUpload) && (
            <ComposerStep
              number={3}
              title="Build your brief"
              subtitle={templateUi.briefHint}
              accent={accent}
            >
            <div className="space-y-3">
              {showPrompt && (
                <div
                  key={emailType}
                  className={`group/brief relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 ring-0 ${accentStyles.focus} focus-within:ring-2 focus-within:shadow-[0_1px_3px_rgba(15,23,42,0.08),0_12px_32px_rgba(15,23,42,0.06)]`}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent ${accentStyles.bar} to-transparent`} />

                  {/* Premium header */}
                  <div className="relative border-b border-slate-200/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3.5 sm:px-5">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_55%)]" />
                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg ${accentStyles.icon}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold tracking-tight text-white">Email brief</p>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 ring-1 ring-white/10">
                              <Lock className="h-2.5 w-2.5" />
                              Internal
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">Guidance for the AI — not included in the sent email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {briefCharCount > 0 && (
                          <span className="hidden rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-300 ring-1 ring-white/10 sm:inline">
                            {briefCharCount} characters
                          </span>
                        )}
                        {speechSupported && (
                          <button
                            type="button"
                            onClick={isListening ? stopListening : handleStartVoice}
                            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                              isListening
                                ? 'bg-red-500 text-white ring-2 ring-red-400/50 hover:bg-red-600'
                                : `text-white ring-1 ring-white/20 hover:shadow-md ${accentStyles.uploadBtn}`
                            }`}
                          >
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isListening ? 'bg-white/20' : 'bg-white/15'}`}>
                              <Mic className={`h-3 w-3 ${isListening ? 'animate-pulse' : ''}`} />
                            </span>
                            {isListening ? 'Stop dictation' : 'Dictate brief'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Writing surface */}
                  <div className="relative">
                    <div className={`pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full ${accentStyles.sideAccent}`} />
                    <textarea
                      className="min-h-[11rem] w-full resize-none border-0 bg-gradient-to-b from-slate-50/40 to-white px-5 py-5 text-[0.9375rem] leading-[1.7] text-slate-800 placeholder:text-slate-400/80 focus:outline-none focus:ring-0"
                      rows={6}
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder={getPromptPlaceholder()}
                    />
                  </div>

                  {/* Status footer */}
                  <div className={`flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-5 ${
                    isListening ? accentStyles.recordBg : 'bg-slate-50/50'
                  }`}>
                    {isListening ? (
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                        <p className={`text-xs font-medium ${accentStyles.recordText}`}>
                          Listening — speak clearly. Your brief updates in real time above.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {briefCharCount > 0 ? 'Brief ready' : 'Awaiting input'}
                        </p>
                        {briefCharCount > 0 && (
                          <span className="text-[11px] tabular-nums text-slate-400 sm:hidden">{briefCharCount} chars</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {showFlightUpload && (
                <div className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 ${accentStyles.focus} focus-within:ring-2`}>
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accentStyles.bar} to-transparent`} />

                  <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/5">
                      <ImageIcon className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Flight screenshots</p>
                      <p className="text-xs text-slate-500">Outbound, return, and fare pages — merged automatically</p>
                    </div>
                  </div>

                  {screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                      {screenshots.map((item, index) => (
                        <div
                          key={item.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 shadow-sm"
                        >
                          <img
                            src={item.preview}
                            alt={`Screenshot ${index + 1}`}
                            className="h-28 w-full object-cover object-top"
                          />
                          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-2.5 py-1.5">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              {index === 0 ? 'Outbound' : index === 1 ? 'Return' : `Image ${index + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(item.id)}
                              disabled={extracting}
                              className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remove screenshot ${index + 1}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {screenshots.length < MAX_SCREENSHOTS && (
                        <label className={`flex h-full min-h-[8.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-4 text-center transition ${accentStyles.uploadHover}`}>
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600">Add image</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleUpload}
                            disabled={extracting}
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 text-center transition hover:bg-slate-50/50">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentStyles.iconMuted}`}>
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Upload flight screenshots</p>
                        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                          PNG or JPG — up to {MAX_SCREENSHOTS} images. We extract routes, times, and pricing for your quotation.
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${accentStyles.uploadBtn}`}>
                        <ImageIcon className="h-3.5 w-3.5" />
                        Choose files
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                        disabled={extracting}
                      />
                    </label>
                  )}

                  {(extracting || screenshots.length > 0) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
                      {extracting ? (
                        <span className={`inline-flex items-center gap-2 text-xs font-medium ${accentStyles.progress}`}>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Analysing screenshot… {extractProgress}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {screenshots.length} of {MAX_SCREENSHOTS} images attached
                        </span>
                      )}
                      {screenshots.length > 0 && !extracting && (
                        <button
                          type="button"
                          onClick={handleClearScreenshots}
                          className="text-xs font-medium text-slate-500 transition hover:text-red-600"
                        >
                          Remove all
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {speechError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{speechError}</p>
              )}
            </div>
            </ComposerStep>
          )}

          {flightData && (
            <ComposerStep
              number={showPrompt || showFlightUpload ? 4 : 3}
              title="Flight quotation preview"
              subtitle="Review extracted routes, times, and pricing before generating"
              accent={accent}
            >
              <FlightQuotationPreview flightData={flightData} price={price} onEdit={() => setShowEdit(!showEdit)} />
              {showEdit && (
                <div className="mt-3">
                  <FlightQuickEdit
                    flightData={flightData}
                    price={price}
                    currency={currency}
                    onChange={setFlightData}
                    onPriceChange={setPrice}
                    onCurrencyChange={setCurrency}
                  />
                </div>
              )}
            </ComposerStep>
          )}

          {(emailType === 'payment_reminder' || emailType !== 'flight_offer') && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={emailType === 'payment_reminder' ? 'Amount due' : 'Price (optional)'}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 268"
              />
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'USD', label: 'USD ($)' },
                ]}
              />
            </div>
          )}

          <ComposerStep
            number={flightData ? (showPrompt || showFlightUpload ? 5 : 4) : (showPrompt || showFlightUpload ? 4 : 3)}
            title="Review & generate"
            subtitle="Add any final notes, then compose your formal client email"
            accent={accent}
          >
            <Input
              label="Additional notes"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Optional — e.g. taxes included, payment terms"
              className="[&_input]:border-slate-200/80"
            />

            <div className={`relative mt-4 overflow-hidden rounded-2xl border shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-300 ${
              readiness.ready
                ? 'border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
                : 'border-dashed border-slate-300 bg-slate-50/40'
            }`}>
              {readiness.ready && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
              )}

              <div className={`p-4 sm:p-5 ${readiness.ready ? '' : 'sm:p-4'}`}>
                {readiness.ready && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300 ring-1 ring-white/10">
                      <Sparkles className="h-3 w-3 text-teal-300" />
                      Ready to compose
                    </span>
                    <span className="text-xs text-slate-400">{selectedTemplate.label} · formal business English</span>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={extracting || isListening || generating}
                    className={`inline-flex flex-1 items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      readiness.ready
                        ? 'bg-white text-slate-900 hover:bg-slate-50 focus:ring-white/50 focus:ring-offset-slate-800'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Composing professional email…
                      </>
                    ) : extracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analysing screenshot…
                      </>
                    ) : (
                      <>
                        <Sparkles className={`h-4 w-4 ${readiness.ready ? 'text-teal-600' : ''}`} />
                        Generate {selectedTemplate.label}
                        <ChevronRight className="h-4 w-4 opacity-60" />
                      </>
                    )}
                  </button>
                  {speechSupported && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleStopVoiceAndGenerate}
                      disabled={extracting || !isListening}
                      className="sm:min-w-[180px]"
                    >
                      Stop & Generate
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleReset} title="Reset form" className={readiness.ready ? 'text-slate-400 hover:bg-white/10 hover:text-white' : ''}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!readiness.ready && !generating && !extracting && (
                <p className="border-t border-slate-200/60 px-4 py-2.5 text-xs text-slate-500">
                  Add a brief, upload screenshots, or link a client to enable generation.
                </p>
              )}
              {generateError && (
                <p className="border-t border-red-200/60 bg-red-50 px-4 py-2.5 text-sm text-red-700">{generateError}</p>
              )}
            </div>
          </ComposerStep>
        </div>
      </div>

      {/* Editable email output */}
      {hasGenerated && (
        <Card ref={emailEditorRef}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-teal-700">Edit your email — change anything, then copy or regenerate</p>
              <h3 className="font-semibold text-slate-900">Email Editor</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email body — edit freely</label>
              <textarea
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                rows={18}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Regenerate with changes
              </label>
              <textarea
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                rows={2}
                value={regenInstruction}
                onChange={(e) => setRegenInstruction(e.target.value)}
                placeholder='e.g. "Make it shorter", "Add that payment is due in 7 days", "Remove the inbound section"'
              />
              <Button variant="secondary" onClick={handleRegenerate} disabled={!regenInstruction.trim() || generating}>
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} /> Regenerate Email
              </Button>
              {generateError && (
                <p className="mt-2 text-sm text-red-600">{generateError}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Describe your change and it will be applied to the email above. Examples: &quot;Add payment is due in 7 days&quot;, &quot;Make it shorter&quot;, &quot;Remove inbound section&quot;, &quot;Change price to €320&quot;.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
