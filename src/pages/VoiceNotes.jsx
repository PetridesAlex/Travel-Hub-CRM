import { useEffect, useRef, useState } from 'react'
import {
  Save, Trash2, Sparkles, Copy, Check, Loader2, Upload, X,
  Mic, FileText, History, Wand2, User, CalendarDays, Sparkle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { getVoiceNotes, createVoiceNote, deleteVoiceNote } from '../services/voiceNotes'
import { getClients } from '../services/clients'
import { generateTravelProgram, isUsingOpenAi } from '../utils/generateTravelProgram'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import VoiceInputButton from '../components/VoiceInputButton'
import { formatClientName, formatClientOptionLabel, formatDateTime } from '../utils/format'
import { compressImageForApi } from '../utils/screenshotOcr'

const MAX_IMAGES = 5

function getProgramTitle(note) {
  const text = (note.generated_content || note.transcript || '').trim()
  const firstLine = text.split('\n').find((line) => line.trim())?.trim() || 'Travel program'
  const cleaned = firstLine.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '')
  return cleaned.length > 72 ? `${cleaned.slice(0, 72)}…` : cleaned
}

function getProgramPreview(note) {
  const text = (note.generated_content || note.transcript || '').trim()
  return text.length > 320 ? `${text.slice(0, 320)}…` : text
}

const STEPS = [
  { id: 1, label: 'Describe', icon: Mic },
  { id: 2, label: 'Generate', icon: Wand2 },
  { id: 3, label: 'Save', icon: Save },
]

export default function VoiceNotes() {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const fileInputRef = useRef(null)
  const programRef = useRef(null)
  const {
    transcript,
    setTranscript,
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition()
  const [notes, setNotes] = useState([])
  const [clients, setClients] = useState([])
  const [linkedClientId, setLinkedClientId] = useState('')
  const [generatedProgram, setGeneratedProgram] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedNoteId, setCopiedNoteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const currentStep = generatedProgram ? 3 : transcript.trim() || images.length ? 2 : 1

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [notesData, clientsData] = await Promise.all([
        getVoiceNotes(),
        getClients(),
      ])
      setNotes(notesData)
      setClients(clientsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleStartListening() {
    startListening(transcript)
  }

  function getClientName() {
    const client = clients.find((c) => c.id === linkedClientId)
    return client ? formatClientName(client) : ''
  }

  async function handleGenerate() {
    if (!transcript.trim() && images.length === 0) {
      setGenerateError('Please speak, type, or upload at least one image.')
      return
    }

    setGenerating(true)
    setGenerateError('')
    try {
      const program = await generateTravelProgram({
        transcript,
        clientName: getClientName(),
        agencyName: agency?.name || 'Your Travel Agency',
        images,
        clientId: linkedClientId || null,
        session,
      })
      setGeneratedProgram(program)
      requestAnimationFrame(() => {
        programRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      setGenerateError(err.message || 'Could not generate program. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return

    const slotsLeft = MAX_IMAGES - images.length
    if (slotsLeft <= 0) {
      setGenerateError(`You can upload up to ${MAX_IMAGES} images`)
      return
    }

    setUploadingImages(true)
    setGenerateError('')
    try {
      const toAdd = files.slice(0, slotsLeft)
      const newImages = await Promise.all(
        toAdd.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          preview: await compressImageForApi(file),
          file,
        })),
      )
      setImages((prev) => [...prev, ...newImages])
    } catch {
      setGenerateError('Could not load one or more images.')
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleRemoveImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  function handleClearImages() {
    setImages([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleReset() {
    stopListening()
    setTranscript('')
    setGeneratedProgram('')
    setLinkedClientId('')
    setImages([])
    setGenerateError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    if (!transcript.trim()) {
      alert('Please record or type a note first.')
      return
    }
    setSaving(true)
    try {
      await createVoiceNote({
        transcript: transcript.trim(),
        generated_content: generatedProgram.trim() || null,
        linked_client_id: linkedClientId || null,
      }, user.id)
      handleReset()
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!generatedProgram) return
    await navigator.clipboard.writeText(generatedProgram)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyNote(note) {
    const text = note.generated_content || note.transcript
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedNoteId(note.id)
    setTimeout(() => setCopiedNoteId(null), 2000)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this voice note?')) return
    try {
      await deleteVoiceNote(id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [
    { value: '', label: 'Link to client (optional)' },
    ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) })),
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Voice Notes</h2>
        <p className="text-sm text-slate-500">
          Speak your ideas, add reference images, and AI writes a polished travel program.
          {isUsingOpenAi(session) ? ' Powered by secure server-side AI.' : ' Sign in and use the deployed app for full AI quality.'}
        </p>
      </div>

      {!isUsingOpenAi(session) && (
        <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <strong>AI unavailable.</strong> A basic formatted program will be generated.
          Deploy to Vercel or run <code className="rounded bg-amber-100 px-1">npm run dev:api</code> locally for professional AI output.
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const active = currentStep === step.id
          const done = currentStep > step.id
          return (
            <div key={step.id} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/20'
                      : done
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className={`hidden text-sm font-medium sm:inline ${active ? 'text-teal-800' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-px w-6 sm:w-12 ${done ? 'bg-teal-300' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        {/* Voice bar */}
        <div className="flex flex-col items-center gap-3 border-b border-slate-200/60 bg-white/80 px-5 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            {isSupported ? (
              <div className="relative">
                {isListening && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />
                )}
                <VoiceInputButton
                  isListening={isListening}
                  isSupported={isSupported}
                  onStart={handleStartListening}
                  onStop={stopListening}
                  size="md"
                  className="relative shadow-lg shadow-teal-900/20"
                />
              </div>
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Mic className="h-6 w-6" />
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isListening ? 'Listening… speak your program' : 'Tap to dictate your program'}
              </p>
              <p className="text-xs text-slate-500">
                {isSupported
                  ? 'Your words appear in the box below in real time'
                  : 'Speech not supported — type your notes below'}
              </p>
            </div>
          </div>
          <Select
            value={linkedClientId}
            onChange={(e) => setLinkedClientId(e.target.value)}
            options={clientOptions}
            className="w-full sm:w-56"
          />
        </div>

        <div className="p-4 sm:p-5">
          {speechError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {speechError}
            </div>
          )}

          {/* Combined input */}
          <div className="overflow-hidden rounded-xl border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <textarea
              className="w-full resize-none border-0 px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              rows={6}
              placeholder='Example: "Prepare a program for an insurance company — £50 travel insurance, Ryanair flights, Marriott hotel, everything needed for a corporate trip..."'
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5">
              {images.length < MAX_IMAGES && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700">
                  {uploadingImages ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {images.length === 0 ? 'Upload images' : 'Add more'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImages || generating}
                  />
                </label>
              )}

              {images.length > 0 && (
                <>
                  <span className="text-xs text-slate-500">{images.length}/{MAX_IMAGES} images</span>
                  <button
                    type="button"
                    onClick={handleClearImages}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove all
                  </button>
                </>
              )}

              <span className="ml-auto hidden text-xs text-slate-400 sm:inline">
                Brochures, flights, rates, itineraries
              </span>
            </div>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {images.map((img, index) => (
                <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <img
                    src={img.preview}
                    alt={`Reference ${index + 1}`}
                    className="h-20 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="truncate px-2 py-1 text-[10px] text-slate-500">{img.name || `Image ${index + 1}`}</p>
                </div>
              ))}
            </div>
          )}

          {generateError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {generateError}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleGenerate}
              disabled={generating || uploadingImages || (!transcript.trim() && images.length === 0) || isListening}
              className="flex-1"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {images.length
                    ? `Analysing ${images.length} image${images.length > 1 ? 's' : ''} — usually 30–90s…`
                    : 'Writing program…'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Program {isUsingOpenAi(session) ? '' : '(Basic)'}
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={handleReset} disabled={generating || saving}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Generated program */}
      {generatedProgram && (
        <div
          ref={programRef}
          className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/50 to-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">Professional Program</h3>
                <p className="text-xs text-slate-500">Edit freely, then save or copy</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="p-5">
            <textarea
              className="w-full rounded-xl border border-teal-200/60 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={16}
              value={generatedProgram}
              onChange={(e) => setGeneratedProgram(e.target.value)}
            />
            <Button onClick={handleSave} disabled={saving} className="mt-4 w-full" size="lg">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Program'}
            </Button>
          </div>
        </div>
      )}

      {/* Saved programs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal-500/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/25">
                <History className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-white sm:text-lg">Saved Programs</h3>
                <p className="text-xs text-slate-400">Your client-ready travel proposals archive</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-teal-200 backdrop-blur-sm">
              <Sparkle className="h-3.5 w-3.5" />
              {notes.length} saved
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <p className="text-sm font-medium text-slate-500">Loading saved programs…</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-14 text-center">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/40 to-transparent" />
              <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-900/20 ring-1 ring-teal-400/20">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <p className="text-base font-semibold tracking-tight text-slate-800">No saved programs yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Generate a program above, refine it, then save — your proposals will appear here for quick copy and reuse.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const isAiProgram = Boolean(note.generated_content)
                const clientName = note.clients ? formatClientName(note.clients) : ''

                return (
                  <article
                    key={note.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 transition duration-200 hover:border-teal-200/80 hover:shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-600 opacity-80" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />

                    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                              isAiProgram
                                ? 'bg-violet-500/10 text-violet-700 ring-1 ring-violet-200/80'
                                : 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-200/80'
                            }`}>
                              {isAiProgram ? (
                                <>
                                  <Sparkles className="h-3 w-3" />
                                  AI Program
                                </>
                              ) : (
                                'Voice note'
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateTime(note.created_at)}
                            </span>
                          </div>

                          <h4 className="mt-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                            {getProgramTitle(note)}
                          </h4>

                          {clientName && (
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
                              <User className="h-3.5 w-3.5" />
                              {clientName}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyNote(note)}
                            className="rounded-lg border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                            aria-label="Copy program"
                          >
                            {copiedNoteId === note.id ? (
                              <Check className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete program"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-slate-200/70 bg-white/80 px-4 py-3 shadow-inner">
                        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                          {getProgramPreview(note)}
                        </pre>
                      </div>

                      {note.generated_content && note.transcript && (
                        <details className="mt-3 text-xs text-slate-500">
                          <summary className="cursor-pointer font-semibold uppercase tracking-wide text-slate-500 transition hover:text-teal-700">
                            Original voice input
                          </summary>
                          <p className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-600">
                            {note.transcript}
                          </p>
                        </details>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
