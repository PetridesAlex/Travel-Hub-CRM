import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Save, Upload, Loader2, RotateCcw, RefreshCw, ImageIcon, PenLine, X } from 'lucide-react'
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
import VoiceInputButton from '../components/VoiceInputButton'
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

export default function AIEmailAssistant() {
  const { user } = useAuth()
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
      flight_offer: 'Example: Offer Alex a return flight Paphos to Athens, 19–25 June, €268 TIME SAVER fare with priority boarding. Mention fares can change until ticketed.',
      cruise_offer: 'Example: 7-night Western Mediterranean cruise on MSC Seaside, balcony cabin, depart Barcelona 12 July, includes drinks package.',
      hotel_offer: 'Example: 5 nights at Hilton Athens, deluxe room, bed & breakfast, check-in 15 June, sea view if available.',
      supplier_request: 'Example: Request availability for 2 adults, double room, 3 nights in Santorini, 20–23 August. Need rates and cancellation policy.',
      payment_reminder: 'Example: Remind Alex that €500 balance is due by 15 June to confirm the booking.',
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
      const email = await buildEmailFromInput(getSource())
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
      })
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-white px-4 py-3 text-sm text-teal-900">
        <strong>New:</strong> Use the secure{' '}
        <Link to="/ai-workspace/generator" className="font-semibold underline hover:text-teal-700">
          AI Workspace Generator
        </Link>
        {' '}for specialized agents (Flight, Cruise, Hotel, Payment Reminder) with server-side OpenAI.
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">AI Email Assistant</h2>
        <p className="text-sm text-slate-500">
          Legacy email tool with screenshot OCR and voice. For professional agent-based emails, use AI Workspace.
          {canUseAiEmail() ? ' Local OpenAI key detected for fallback generation.' : ' Uses built-in templates when no local key is set.'}
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Setup */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email template</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EMAIL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setEmailType(template.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    emailType === template.id
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-sm font-medium ${emailType === template.id ? 'text-teal-800' : 'text-slate-900'}`}>
                    {template.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          {showClientFields ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Link to client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={clientOptions} />
              <Input label="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Alex (optional — defaults to Valued Client)" />
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              This template addresses the supplier directly as &quot;Dear Supplier,&quot;.
            </p>
          )}

          {(showPrompt || showFlightUpload) && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  {showPrompt ? 'What should the email say?' : 'Flight screenshots'}
                </label>
                {showPrompt && speechSupported && (
                  <div className="flex items-center gap-2">
                    <VoiceInputButton
                      size="sm"
                      isListening={isListening}
                      isSupported={speechSupported}
                      onStart={handleStartVoice}
                      onStop={stopListening}
                    />
                    <span className="text-xs text-slate-500">
                      {isListening ? 'Listening…' : 'Voice'}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                {showPrompt && (
                  <textarea
                    className="w-full resize-none border-0 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-0"
                    rows={5}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder={getPromptPlaceholder()}
                  />
                )}

                {showFlightUpload && (
                  <div className={`flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 ${showPrompt ? 'border-t border-slate-200' : 'min-h-[72px]'}`}>
                    {screenshots.length < MAX_SCREENSHOTS && (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700">
                        <Upload className="h-4 w-4" />
                        {screenshots.length === 0
                          ? `Upload screenshot${MAX_SCREENSHOTS > 1 ? 's' : ''}`
                          : 'Add more'}
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

                    {extracting && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-teal-700">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Reading… {extractProgress}%
                      </span>
                    )}

                    {screenshots.length > 0 && (
                      <>
                        <span className="text-xs text-slate-500">
                          {screenshots.length}/{MAX_SCREENSHOTS} uploaded
                        </span>
                        <button
                          type="button"
                          onClick={handleClearScreenshots}
                          disabled={extracting}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove all
                        </button>
                      </>
                    )}

                    {!showPrompt && screenshots.length === 0 && !extracting && (
                      <span className="text-xs text-slate-400">
                        Up to {MAX_SCREENSHOTS} flight screenshots
                      </span>
                    )}
                  </div>
                )}
              </div>

              {showFlightUpload && screenshots.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {screenshots.map((item, index) => (
                    <div key={item.id} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <img
                        src={item.preview}
                        alt={`Screenshot ${index + 1}`}
                        className="h-24 w-full rounded-md object-contain"
                      />
                      <p className="mt-1 truncate text-xs text-slate-500">Image {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveScreenshot(item.id)}
                        disabled={extracting}
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 shadow-sm hover:text-red-600"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {speechError && (
                <p className="mt-2 text-sm text-red-600">{speechError}</p>
              )}

              <p className="mt-1 text-xs text-slate-400">
                {showPrompt && showFlightUpload
                  ? 'Type your instructions or upload flight screenshots — outbound, return, and fare images are merged automatically.'
                  : showPrompt
                    ? 'Type freely, or click the mic and speak — your words appear here in real time.'
                    : 'Upload separate screenshots for outbound, return, and fare/inclusions — they will be merged automatically.'}
              </p>
            </div>
          )}

          {flightData && (
            <>
              <FlightQuotationPreview flightData={flightData} price={price} onEdit={() => setShowEdit(!showEdit)} />
              {showEdit && (
                <FlightQuickEdit
                  flightData={flightData}
                  price={price}
                  currency={currency}
                  onChange={setFlightData}
                  onPriceChange={setPrice}
                  onCurrencyChange={setCurrency}
                />
              )}
            </>
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

          <Input label="Extra notes (optional)" value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} placeholder="e.g. price includes taxes" />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleGenerate} className="flex-1" size="lg" disabled={extracting || isListening || generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : extracting ? (
                'Reading screenshot…'
              ) : (
                `Generate ${selectedTemplate.label}`
              )}
            </Button>
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
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          {generateError && (
            <p className="text-sm text-red-600">{generateError}</p>
          )}
        </div>
      </Card>

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
