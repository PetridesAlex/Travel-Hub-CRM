import { useEffect, useRef, useState } from 'react'
import { Save, Trash2, Sparkles, Copy, Check, Loader2, Upload, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { getVoiceNotes, createVoiceNote, deleteVoiceNote } from '../services/voiceNotes'
import { getClients } from '../services/clients'
import { generateTravelProgram, isUsingOpenAi } from '../utils/generateTravelProgram'
import { hasOpenAiApiKey } from '../lib/openaiConfig'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import VoiceInputButton from '../components/VoiceInputButton'
import { formatClientName, formatDateTime } from '../utils/format'
import { readImageFile } from '../utils/screenshotOcr'

const MAX_IMAGES = 5

export default function VoiceNotes() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const fileInputRef = useRef(null)
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
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)

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
      })
      setGeneratedProgram(program)
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
          preview: await readImageFile(file),
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
      setTranscript('')
      setGeneratedProgram('')
      setLinkedClientId('')
      setImages([])
      if (fileInputRef.current) fileInputRef.current.value = ''
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

  async function handleDelete(id) {
    if (!confirm('Delete this voice note?')) return
    try {
      await deleteVoiceNote(id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'Link to client (optional)' }, ...clients.map((c) => ({ value: c.id, label: c.full_name }))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Voice Notes</h2>
        <p className="text-sm text-slate-500">
          Speak your ideas, upload hotel or flight images, then AI writes a professional travel program.
        </p>
      </div>

      {!hasOpenAiApiKey() && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>OpenAI key not set.</strong> A basic formatted program will be generated.
          For full ChatGPT-quality writing, add your API key in <strong>Settings → OpenAI Integration</strong>.
        </div>
      )}

      <Card>
        <div className="flex flex-col items-center gap-4">
          {!isSupported ? (
            <p className="text-sm text-amber-700">
              Speech recognition is not supported in this browser. Use Chrome, Edge, or Safari, or type your notes below.
            </p>
          ) : (
            <>
              <VoiceInputButton
                isListening={isListening}
                isSupported={isSupported}
                onStart={handleStartListening}
                onStop={stopListening}
              />
              <p className="text-sm text-slate-500">
                {isListening ? 'Listening… describe the full program, then click again to stop' : 'Click the microphone and describe the travel program'}
              </p>
            </>
          )}

          {speechError && (
            <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{speechError}</div>
          )}

          <div className="w-full space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Your voice note (raw)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                rows={5}
                placeholder='Example: "Prepare a program for an insurance company, £50 travel insurance, Ryanair flights, Marriott hotel, include everything needed for a corporate trip..."'
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Reference images (optional)</label>
                <span className="text-xs text-slate-400">{images.length}/{MAX_IMAGES}</span>
              </div>
              <p className="text-xs text-slate-500">
                Upload hotel brochures, flight screenshots, rate sheets, or itineraries — AI reads them with your voice note.
              </p>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img, index) => (
                    <div key={img.id} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <img
                        src={img.preview}
                        alt={`Reference ${index + 1}`}
                        className="h-24 w-full rounded-md object-cover"
                      />
                      <p className="mt-1 truncate text-xs text-slate-500">{img.name || `Image ${index + 1}`}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 shadow-sm hover:text-red-600"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < MAX_IMAGES && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 transition-colors hover:border-teal-400 hover:bg-teal-50/30">
                  {uploadingImages ? (
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {images.length === 0 ? 'Upload images (hotel, flights, rates…)' : 'Add more images'}
                  </span>
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
                <button
                  type="button"
                  onClick={handleClearImages}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove all images
                </button>
              )}
            </div>

            <Select
              label="Link to Client"
              value={linkedClientId}
              onChange={(e) => setLinkedClientId(e.target.value)}
              options={clientOptions}
            />

            <Button
              onClick={handleGenerate}
              disabled={generating || uploadingImages || (!transcript.trim() && images.length === 0) || isListening}
              className="w-full"
              variant="secondary"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {images.length ? 'Analysing images & writing…' : 'Writing professional program…'}</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Professional Program {isUsingOpenAi() ? '(AI)' : '(Basic)'}</>
              )}
            </Button>

            {generateError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{generateError}</div>
            )}

            {generatedProgram && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-700">Professional program — edit before saving</label>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <textarea
                  className="w-full rounded-xl border border-teal-200 bg-teal-50/30 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  rows={16}
                  value={generatedProgram}
                  onChange={(e) => setGeneratedProgram(e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || (!transcript.trim() && !generatedProgram.trim())} className="w-full">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Program'}
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 font-semibold text-slate-900">Saved Programs</h3>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : notes.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No saved programs yet.</p></Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {note.generated_content ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                        {note.generated_content}
                      </pre>
                    ) : (
                      <p className="text-sm text-slate-800">{note.transcript}</p>
                    )}

                    {note.generated_content && note.transcript && (
                      <details className="text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-700">View original voice note</summary>
                        <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{note.transcript}</p>
                      </details>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{formatDateTime(note.created_at)}</span>
                      {note.clients?.full_name && <span>· {note.clients.full_name}</span>}
                      <Badge
                        status={note.processing_status === 'completed' ? 'completed' : 'pending'}
                        label={note.generated_content ? 'AI Program' : note.processing_status}
                      />
                    </div>
                  </div>
                  <button onClick={() => handleDelete(note.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
