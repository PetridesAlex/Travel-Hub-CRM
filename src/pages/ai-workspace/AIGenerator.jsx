import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Copy, Check, Loader2, FileText, Upload, X, ImageIcon, Scale } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { getAgents } from '../../services/aiAgents'
import { getTemplates } from '../../services/aiTemplates'
import { getClients } from '../../services/clients'
import { getLeads } from '../../services/leads'
import { generateAiContent } from '../../services/aiGenerate'
import { updateGeneration } from '../../services/aiGenerations'
import Button from '../../components/ui/Button'
import VoiceInputButton from '../../components/VoiceInputButton'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import {
  AGENT_TEMPLATE_MAP,
  getEmptyInputForCategory,
  getFieldsForCategory,
  getScreenshotUploadHint,
} from '../../constants/aiTemplateFields'
import { formatClientName, formatClientOptionLabel } from '../../utils/format'
import { compressImageForApi } from '../../utils/screenshotOcr'
import { mergeTemplateInputData } from '../../utils/mapFlightDataToTemplateFields'
import { extractTemplateFieldsFromImages } from '../../services/aiExtractTemplateFields'
import { compareHotelRatesFromImages } from '../../services/aiCompareHotelRates'
import { extractFieldsFromOcrFallback } from '../../utils/extractFieldsFromOcrFallback'
import HotelRateComparisonPanel from '../../components/ai-workspace/HotelRateComparisonPanel'
import { buildComparisonView, computeHotelQuoteFields } from '../../../shared/hotelRateComparison.js'

const MAX_SCREENSHOTS = 3
const MAX_HOTEL_IMAGES_PER_SIDE = 3

export default function AIGenerator() {
  const { session } = useAuth()
  const [agents, setAgents] = useState([])
  const [templates, setTemplates] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [agentId, setAgentId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [clientId, setClientId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [inputData, setInputData] = useState({})
  const [extraNotes, setExtraNotes] = useState('')
  const [output, setOutput] = useState('')
  const [generationId, setGenerationId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [screenshots, setScreenshots] = useState([])
  const [supplierScreenshots, setSupplierScreenshots] = useState([])
  const [bookingScreenshots, setBookingScreenshots] = useState([])
  const [marginPercent, setMarginPercent] = useState('15')
  const [hotelExtractedRaw, setHotelExtractedRaw] = useState(null)
  const [hotelComparison, setHotelComparison] = useState(null)
  const [showHotelFieldDetails, setShowHotelFieldDetails] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const [fillMessage, setFillMessage] = useState('')
  const [extractStatus, setExtractStatus] = useState('')
  const fileInputRef = useRef(null)
  const supplierFileRef = useRef(null)
  const bookingFileRef = useRef(null)
  const compareDebounceRef = useRef(null)
  const compareRequestRef = useRef(0)

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
      setExtraNotes(transcript)
    }
  }, [transcript, isListening])

  function handleStartVoice() {
    startListening(extraNotes)
  }

  useEffect(() => {
    Promise.all([
      getAgents({ activeOnly: true }),
      getTemplates({ activeOnly: true }),
      getClients(),
      getLeads(),
    ])
      .then(([a, t, c, l]) => {
        setAgents(a)
        setTemplates(t)
        setClients(c)
        setLeads(l)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const selectedAgent = agents.find((a) => a.id === agentId)
  const selectedTemplate = templates.find((t) => t.id === templateId)

  const isHotelCompareMode = selectedTemplate?.category === 'hotel_client_quote'
  const supportsScreenshots = Boolean(selectedTemplate) && !isHotelCompareMode
  const screenshotHint = selectedTemplate
    ? getScreenshotUploadHint(selectedTemplate.category)
    : ''

  const compatibleTemplates = useMemo(() => {
    if (!selectedAgent) return templates
    const allowed = AGENT_TEMPLATE_MAP[selectedAgent.category] || []
    return templates.filter((t) => allowed.includes(t.category) || t.agent_id === agentId)
  }, [templates, selectedAgent, agentId])

  const fieldSchema = useMemo(() => {
    if (!selectedTemplate) return []
    return getFieldsForCategory(selectedTemplate.category)
  }, [selectedTemplate])

  useEffect(() => {
    if (selectedTemplate) {
      setInputData(getEmptyInputForCategory(selectedTemplate.category))
    }
  }, [selectedTemplate?.id, selectedTemplate?.category])

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        setInputData((prev) => ({
          ...prev,
          client_name: formatClientName(client),
        }))
      }
    }
  }, [clientId, clients])

  useEffect(() => {
    if (leadId) {
      const lead = leads.find((l) => l.id === leadId)
      if (lead) {
        setInputData((prev) => ({
          ...prev,
          destination: prev.destination || lead.destination || '',
          travel_dates: prev.travel_dates || lead.travel_dates || '',
          notes: [prev.notes, lead.notes].filter(Boolean).join('\n'),
        }))
      }
    }
  }, [leadId, leads])

  function handleAgentChange(id) {
    setAgentId(id)
    setTemplateId('')
    setOutput('')
    setGenerationId(null)
  }

  function handleTemplateChange(id) {
    setTemplateId(id)
    setOutput('')
    setGenerationId(null)
    setScreenshots([])
    setSupplierScreenshots([])
    setBookingScreenshots([])
    setMarginPercent('15')
    setHotelExtractedRaw(null)
    setHotelComparison(null)
    setShowHotelFieldDetails(false)
    setFillMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (supplierFileRef.current) supplierFileRef.current.value = ''
    if (bookingFileRef.current) bookingFileRef.current.value = ''
  }

  async function addHotelImages(files, side) {
    const imageFiles = Array.from(files || []).filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    const current = side === 'supplier' ? supplierScreenshots : bookingScreenshots
    const slotsLeft = MAX_HOTEL_IMAGES_PER_SIDE - current.length
    if (slotsLeft <= 0) {
      setError(`You can upload up to ${MAX_HOTEL_IMAGES_PER_SIDE} images per side.`)
      return
    }

    const newItems = await Promise.all(
      imageFiles.slice(0, slotsLeft).map(async (file) => ({
        id: crypto.randomUUID(),
        preview: await compressImageForApi(file),
        name: file.name,
      })),
    )

    if (side === 'supplier') {
      setSupplierScreenshots((prev) => [...prev, ...newItems])
    } else {
      setBookingScreenshots((prev) => [...prev, ...newItems])
    }
    setFillMessage('')
    setError('')
    scheduleHotelCompare()
  }

  function scheduleHotelCompare() {
    if (!isHotelCompareMode || !session?.access_token) return
    clearTimeout(compareDebounceRef.current)
    compareDebounceRef.current = setTimeout(() => {
      runHotelCompare()
    }, 700)
  }

  async function handleSupplierUpload(e) {
    await addHotelImages(e.target.files, 'supplier')
    if (supplierFileRef.current) supplierFileRef.current.value = ''
  }

  async function handleBookingUpload(e) {
    await addHotelImages(e.target.files, 'booking')
    if (bookingFileRef.current) bookingFileRef.current.value = ''
  }

  function removeHotelImage(id, side) {
    if (side === 'supplier') {
      setSupplierScreenshots((prev) => prev.filter((s) => s.id !== id))
    } else {
      setBookingScreenshots((prev) => prev.filter((s) => s.id !== id))
    }
    setFillMessage('')
    setHotelExtractedRaw(null)
    setHotelComparison(null)
    scheduleHotelCompare()
  }

  async function runHotelCompare() {
    if (!session?.access_token) {
      setError('Sign in to compare hotel rates with AI.')
      return
    }
    if (!supplierScreenshots.length && !bookingScreenshots.length) {
      setHotelExtractedRaw(null)
      setHotelComparison(null)
      return
    }

    const requestId = ++compareRequestRef.current
    setExtracting(true)
    setExtractProgress(30)
    setExtractStatus('Reading hotel details & comparing rates…')
    setError('')
    setFillMessage('')

    try {
      const result = await compareHotelRatesFromImages({
        supplierImages: supplierScreenshots.map((s) => s.preview),
        bookingImages: bookingScreenshots.map((s) => s.preview),
        marginPercent: Number(marginPercent) || 15,
      }, session)

      if (requestId !== compareRequestRef.current) return

      setExtractProgress(100)
      const { fields, comparison, extracted } = result
      const filledCount = Object.values(fields).filter((v) => v?.trim()).length

      if (filledCount > 0) {
        setHotelExtractedRaw(extracted)
        setHotelComparison(comparison || buildComparisonView(extracted, Number(marginPercent) || 15))
        setInputData((prev) => mergeTemplateInputData(prev, {
          ...fields,
          margin_percent: fields.margin_percent || marginPercent,
          client_name: prev.client_name || '',
        }))
        setFillMessage('Hotel details extracted and prices compared. Review below, then generate the client email.')
      } else {
        setHotelExtractedRaw(null)
        setHotelComparison(null)
        setFillMessage('Could not read details from the screenshots. Try clearer crops or fill fields manually.')
      }
    } catch (err) {
      if (requestId !== compareRequestRef.current) return
      setError(err.message || 'Could not compare hotel rates.')
    } finally {
      if (requestId === compareRequestRef.current) {
        setExtracting(false)
        setExtractProgress(0)
        setExtractStatus('')
      }
    }
  }

  useEffect(() => {
    if (!hotelExtractedRaw || !isHotelCompareMode) return
    const margin = Number(marginPercent) || 15
    const fields = computeHotelQuoteFields(hotelExtractedRaw, margin)
    const comparison = buildComparisonView(hotelExtractedRaw, margin)
    setHotelComparison(comparison)
    setInputData((prev) => mergeTemplateInputData(prev, {
      ...fields,
      margin_percent: String(margin),
      client_name: prev.client_name || '',
    }))
  }, [marginPercent, hotelExtractedRaw, isHotelCompareMode])

  async function handleScreenshotUpload(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length || !supportsScreenshots) return

    const slotsLeft = MAX_SCREENSHOTS - screenshots.length
    if (slotsLeft <= 0) {
      setError(`You can upload up to ${MAX_SCREENSHOTS} screenshots.`)
      return
    }

    setExtracting(true)
    setExtractProgress(0)
    setExtractStatus('Preparing images…')
    setError('')
    setFillMessage('')

    try {
      const toAdd = files.slice(0, slotsLeft)
      const newItems = await Promise.all(
        toAdd.map(async (file) => ({
          id: crypto.randomUUID(),
          preview: await compressImageForApi(file),
          name: file.name,
          file,
        })),
      )

      const nextScreenshots = [...screenshots, ...newItems]
      setScreenshots(nextScreenshots)

      let extracted = {}

      const category = selectedTemplate.category

      if (session?.access_token) {
        setExtractStatus('Analysing screenshots with AI…')
        setExtractProgress(40)
        extracted = await extractTemplateFieldsFromImages(
          category,
          nextScreenshots.map((s) => s.preview),
          session,
        )
        setExtractProgress(100)
      } else {
        setExtractStatus('Reading with OCR (first time may take a minute)…')
        extracted = await extractFieldsFromOcrFallback(
          category,
          nextScreenshots.map((s) => s.file).filter(Boolean),
          (progress, status, index, total) => {
            const overall = ((index + progress / 100) / total) * 100
            setExtractProgress(Math.round(overall))
            if (status) setExtractStatus(status)
          },
        )
      }

      const filledCount = Object.values(extracted).filter((v) => v?.trim()).length

      if (filledCount > 0) {
        setInputData((prev) => mergeTemplateInputData(prev, extracted))
        setFillMessage(`Auto-filled ${filledCount} field${filledCount === 1 ? '' : 's'} from screenshot${nextScreenshots.length > 1 ? 's' : ''}. Review and edit before generating.`)
      } else {
        setFillMessage('Could not read details from the screenshot. Try a clearer crop or fill fields manually.')
      }
    } catch (err) {
      setError(err.message || 'Could not read screenshot.')
    } finally {
      setExtracting(false)
      setExtractProgress(0)
      setExtractStatus('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveScreenshot(id) {
    const next = screenshots.filter((s) => s.id !== id)
    setScreenshots(next)
    setFillMessage('')

    if (!next.length) return

    if (session?.access_token) {
      try {
        setExtracting(true)
        setExtractStatus('Re-analysing screenshots…')
        const extracted = await extractTemplateFieldsFromImages(
          selectedTemplate.category,
          next.map((s) => s.preview),
          session,
        )
        setInputData((prev) => mergeTemplateInputData({
          ...getEmptyInputForCategory(selectedTemplate.category),
          client_name: prev.client_name || '',
        }, extracted))
      } catch {
        // keep existing field values if re-analysis fails
      } finally {
        setExtracting(false)
        setExtractStatus('')
      }
      return
    }

  }

  function updateField(key, value) {
    setInputData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    if (!agentId || !templateId) {
      setError('Please select an agent and template.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await generateAiContent({
        agentId,
        templateId,
        clientId,
        leadId,
        inputData,
        extraNotes,
      }, session)
      setOutput(result.output || '')
      setGenerationId(result.generation_id || null)
    } catch (err) {
      setError(err.message || 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    if (!output || !generationId) return
    setSaving(true)
    setSaveMessage('')
    try {
      await updateGeneration(generationId, { generated_output: output })
      setSaveMessage('Saved to history.')
    } catch (err) {
      setSaveMessage(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const agentOptions = [{ value: '', label: 'Select agent...' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]
  const templateOptions = [{ value: '', label: 'Select template...' }, ...compatibleTemplates.map((t) => ({ value: t.id, label: t.name }))]
  const clientOptions = [{ value: '', label: 'Link client (optional)' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const leadOptions = [{ value: '', label: 'Link lead (optional)' }, ...leads.map((l) => ({ value: l.id, label: l.destination || `Lead ${l.id.slice(0, 8)}` }))]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">AI Generator</h2>
        <p className="text-sm text-slate-500">
          Select an agent and template, upload screenshots or fill fields, then generate professional content
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="AI Agent *" value={agentId} onChange={(e) => handleAgentChange(e.target.value)} options={agentOptions} />
          <Select label="Template *" value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} options={templateOptions} />
          <Select label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={clientOptions} />
          <Select label="Lead" value={leadId} onChange={(e) => setLeadId(e.target.value)} options={leadOptions} />
        </div>

        {selectedAgent && (
          <p className="mt-3 text-xs text-slate-500">{selectedAgent.description}</p>
        )}

        {isHotelCompareMode && (
          <div className="mt-5 space-y-4 border-t border-slate-200/60 pt-5">
            <div>
              <p className="text-sm font-semibold text-slate-800">Hotel rate comparison tool</p>
              <p className="text-xs text-slate-500">
                Upload supplier + booking screenshots — AI extracts hotel name, dates, room, breakfast, per-night and total prices, then compares side by side. Adjust margin % to update your client quote instantly.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Supplier platform (net rate)</p>
                <p className="text-xs text-slate-500">Hotelbeds, WebBeds, TBO, DMC portal, etc.</p>
                {supplierScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-800 shadow-sm transition hover:bg-violet-50">
                    <Upload className="h-4 w-4" />
                    Upload supplier screenshot
                    <input
                      ref={supplierFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleSupplierUpload}
                      disabled={extracting || generating}
                    />
                  </label>
                )}
                {supplierScreenshots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {supplierScreenshots.map((shot, index) => (
                      <div key={shot.id} className="group relative overflow-hidden rounded-lg border border-violet-200 bg-white">
                        <img src={shot.preview} alt={`Supplier ${index + 1}`} className="h-20 w-full object-cover object-top" />
                        <button
                          type="button"
                          onClick={() => removeHotelImage(shot.id, 'supplier')}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-violet-300 px-3 py-4 text-xs text-slate-500">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    Net / wholesale price screenshot
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Booking page (public rate)</p>
                <p className="text-xs text-slate-500">Booking.com, Expedia, hotel website, etc.</p>
                {bookingScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-800 shadow-sm transition hover:bg-sky-50">
                    <Upload className="h-4 w-4" />
                    Upload booking screenshot
                    <input
                      ref={bookingFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleBookingUpload}
                      disabled={extracting || generating}
                    />
                  </label>
                )}
                {bookingScreenshots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {bookingScreenshots.map((shot, index) => (
                      <div key={shot.id} className="group relative overflow-hidden rounded-lg border border-sky-200 bg-white">
                        <img src={shot.preview} alt={`Booking ${index + 1}`} className="h-20 w-full object-cover object-top" />
                        <button
                          type="button"
                          onClick={() => removeHotelImage(shot.id, 'booking')}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-sky-300 px-3 py-4 text-xs text-slate-500">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    Public retail price screenshot
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <Input
                  label="Margin %"
                  type="number"
                  min="0"
                  step="0.5"
                  value={marginPercent}
                  onChange={(e) => {
                    setMarginPercent(e.target.value)
                    updateField('margin_percent', e.target.value)
                  }}
                  placeholder="15"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={runHotelCompare}
                disabled={extracting || generating || (!supplierScreenshots.length && !bookingScreenshots.length)}
              >
                {extracting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {extractStatus || 'Analysing…'}{extractProgress ? ` ${extractProgress}%` : ''}</>
                ) : (
                  <><Scale className="h-4 w-4" /> Re-analyse</>
                )}
              </Button>
            </div>

            {(extracting || hotelComparison) && (
              <HotelRateComparisonPanel comparison={hotelComparison} loading={extracting && !hotelComparison} />
            )}

            {fillMessage && (
              <p className={`text-xs ${fillMessage.includes('Could not') ? 'text-amber-700' : 'text-emerald-700'}`}>
                {fillMessage}
              </p>
            )}
          </div>
        )}

        {supportsScreenshots && (
          <div className="mt-5 space-y-3 border-t border-slate-200/60 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Upload screenshots or photos</p>
                <p className="text-xs text-slate-500">{screenshotHint}</p>
              </div>
              {screenshots.length < MAX_SCREENSHOTS && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700">
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {extracting
                    ? `${extractStatus || 'Reading…'}${extractProgress ? ` ${extractProgress}%` : ''}`
                    : screenshots.length ? 'Add screenshot' : 'Upload screenshot'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleScreenshotUpload}
                    disabled={extracting || generating}
                  />
                </label>
              )}
            </div>

            {fillMessage && (
              <p className={`text-xs ${fillMessage.includes('Could not') ? 'text-amber-700' : 'text-emerald-700'}`}>
                {fillMessage}
              </p>
            )}

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {screenshots.map((shot, index) => (
                  <div key={shot.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <img src={shot.preview} alt={`Screenshot ${index + 1}`} className="h-24 w-full object-cover object-top" />
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(shot.id)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="truncate px-2 py-1 text-[10px] text-slate-500">{shot.name || `Screenshot ${index + 1}`}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                <ImageIcon className="h-5 w-5 shrink-0 text-slate-400" />
                Upload screenshots or photos — template fields fill automatically. Then review and generate.
              </div>
            )}
          </div>
        )}

        {fieldSchema.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-slate-200/60 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {isHotelCompareMode ? 'Quote details for email' : 'Template fields'}
              </p>
              {isHotelCompareMode && (
                <button
                  type="button"
                  onClick={() => setShowHotelFieldDetails((v) => !v)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                >
                  {showHotelFieldDetails ? 'Hide all fields' : 'Edit all extracted fields'}
                </button>
              )}
            </div>

            {isHotelCompareMode && !showHotelFieldDetails && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Client Name"
                  value={inputData.client_name || ''}
                  onChange={(e) => updateField('client_name', e.target.value)}
                />
                <Input
                  label="Client Quote (Total)"
                  value={inputData.client_quote_price || ''}
                  onChange={(e) => updateField('client_quote_price', e.target.value)}
                />
              </div>
            )}

            <div className={`grid gap-3 sm:grid-cols-2 ${isHotelCompareMode && !showHotelFieldDetails ? 'hidden' : ''}`}>
              {fieldSchema.map((field) => (
                field.type === 'textarea' ? (
                  <div key={field.key} className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
                    <textarea
                      className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${field.readOnly ? 'border-slate-100 bg-slate-50 text-slate-600' : 'border-slate-200 focus:border-teal-500'}`}
                      rows={field.rows || 3}
                      placeholder={field.placeholder}
                      value={inputData[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      readOnly={field.readOnly}
                    />
                  </div>
                ) : (
                  <Input
                    key={field.key}
                    label={field.label}
                    value={inputData[field.key] || ''}
                    onChange={(e) => {
                      updateField(field.key, e.target.value)
                      if (field.key === 'margin_percent') setMarginPercent(e.target.value)
                    }}
                    placeholder={field.placeholder}
                    readOnly={field.readOnly}
                  />
                )
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-700">Additional notes</label>
            {speechSupported && (
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
          {selectedAgent?.category === 'email' && (
            <p className="mb-2 text-xs text-slate-500">
              Use voice to describe the email — AI will turn your notes into a professional message.
            </p>
          )}
          <div className="overflow-hidden rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <textarea
              className="w-full resize-none border-0 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-0"
              rows={4}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Type or use voice: e.g. mention budget, dates, tone, or anything the AI should include..."
            />
          </div>
          {speechError && (
            <p className="mt-2 text-sm text-red-600">{speechError}</p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <Button onClick={handleGenerate} disabled={generating || !agentId || !templateId} className="mt-4 w-full" size="lg">
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate</>
          )}
        </Button>
      </div>

      {output && (
        <div className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/50 to-white shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
          <div className="flex items-center justify-between border-b border-teal-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">Generated Output</h3>
                {generationId && (
                  <p className="text-xs text-slate-500">
                    Saved to history · <Link to="/ai-workspace/history" className="text-teal-700 hover:underline">View history</Link>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveMessage && (
                <span className={`text-xs ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-emerald-600'}`}>
                  {saveMessage}
                </span>
              )}
              {generationId && (
                <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="p-5">
            <textarea
              className="w-full rounded-xl border border-teal-200/60 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={18}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
