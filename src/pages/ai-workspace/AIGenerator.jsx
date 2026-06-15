import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Loader2, Upload, X, ImageIcon, Scale, AlertCircle, Terminal } from 'lucide-react'
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
import Input from '../../components/ui/Input'
import {
  AGENT_TEMPLATE_MAP,
  getEmptyInputForCategory,
  getFieldsForCategory,
} from '../../constants/aiTemplateFields'
import { formatClientName } from '../../utils/format'
import { compressImageForApi } from '../../utils/screenshotOcr'
import { mergeTemplateInputData } from '../../utils/mapFlightDataToTemplateFields'
import { extractTemplateFieldsFromImages } from '../../services/aiExtractTemplateFields'
import { compareHotelRatesFromImages } from '../../services/aiCompareHotelRates'
import { extractFieldsFromOcrFallback } from '../../utils/extractFieldsFromOcrFallback'
import HotelRateComparisonPanel from '../../components/ai-workspace/HotelRateComparisonPanel'
import PackageCostingPanel from '../../components/ai-workspace/PackageCostingPanel'
import CostingServicesEditor from '../../components/ai-workspace/CostingServicesEditor'
import AIGeneratorHero from '../../components/ai-workspace/AIGeneratorHero'
import AIGeneratorSetupPanel from '../../components/ai-workspace/AIGeneratorSetupPanel'
import AIGeneratorChatPanel from '../../components/ai-workspace/AIGeneratorChatPanel'
import { buildComparisonView, computeHotelQuoteFields } from '../../../shared/hotelRateComparison.js'
import { buildPackageCostingView, computePackageCostingFields } from '../../../shared/packageCosting.js'

function mapHotelExtractToCostingSide(extracted, side) {
  const prefix = side === 'supplier' ? 'hotel_a' : 'hotel_b'
  const total = extracted.supplier_net_rate || extracted.supplier_net_amount || extracted.booking_public_rate || ''
  const travelDates = extracted.check_in && extracted.check_out
    ? `${extracted.check_in} – ${extracted.check_out}`
    : extracted.travel_dates || ''

  return {
    [`${prefix}_name`]: extracted.hotel_name || '',
    [`${prefix}_room`]: extracted.room_type || extracted.room_details || '',
    [`${prefix}_meal_plan`]: extracted.meal_plan || '',
    [`${prefix}_total`]: total,
    nights: extracted.nights || '',
    travel_dates: travelDates,
    passengers: extracted.guest_details || '',
  }
}

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
  const [costingServices, setCostingServices] = useState([])
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
    canUseVoice,
    isRequestingPermission,
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
  const isCostingMode = selectedTemplate?.category === 'costing'
  const supportsScreenshots = Boolean(selectedTemplate) && !isHotelCompareMode && !isCostingMode

  const compatibleTemplates = useMemo(() => {
    if (!selectedAgent) return templates
    const allowed = AGENT_TEMPLATE_MAP[selectedAgent.category] || []
    return templates.filter((t) => allowed.includes(t.category) || t.agent_id === agentId)
  }, [templates, selectedAgent, agentId])

  const fieldSchema = useMemo(() => {
    if (!selectedTemplate) return []
    return getFieldsForCategory(selectedTemplate.category)
  }, [selectedTemplate])

  const editableFieldSchema = useMemo(() => {
    if (!isCostingMode) return fieldSchema
    return fieldSchema.filter((f) => !f.readOnly && f.section !== 'result')
  }, [fieldSchema, isCostingMode])

  const packageCostingView = useMemo(() => {
    if (!isCostingMode) return null
    const computed = computePackageCostingFields({
      ...inputData,
      extra_services: costingServices,
      markup_percent: inputData.markup_percent || marginPercent,
    })
    return buildPackageCostingView(computed)
  }, [isCostingMode, inputData, marginPercent, costingServices])

  useEffect(() => {
    if (!agentId || templateId) return
    if (compatibleTemplates.length === 1) {
      setTemplateId(compatibleTemplates[0].id)
    }
  }, [agentId, templateId, compatibleTemplates])

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
    setCostingServices([])
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
    if (isCostingMode) {
      scheduleCostingExtract(side)
    } else {
      scheduleHotelCompare()
    }
  }

  function scheduleCostingExtract(side) {
    if (!isCostingMode || !session?.access_token) return
    clearTimeout(compareDebounceRef.current)
    compareDebounceRef.current = setTimeout(() => {
      runCostingSideExtract(side)
    }, 700)
  }

  async function runCostingSideExtract(side) {
    const shots = side === 'supplier' ? supplierScreenshots : bookingScreenshots
    if (!shots.length || !session?.access_token) return

    const requestId = ++compareRequestRef.current
    setExtracting(true)
    setExtractProgress(40)
    setExtractStatus(`Reading Hotel ${side === 'supplier' ? 'A' : 'B'} quote…`)
    setError('')
    setFillMessage('')

    try {
      const extracted = await extractTemplateFieldsFromImages(
        'hotel_client_quote',
        shots.map((s) => s.preview),
        session,
      )
      if (requestId !== compareRequestRef.current) return

      const mapped = mapHotelExtractToCostingSide(extracted, side)
      const filledCount = Object.values(mapped).filter((v) => v?.trim()).length

      if (filledCount > 0) {
        setInputData((prev) => mergeTemplateInputData(prev, {
          ...mapped,
          markup_percent: prev.markup_percent || marginPercent,
        }))
        setFillMessage(`Hotel ${side === 'supplier' ? 'A' : 'B'} extracted — comparison updated.`)
      } else {
        setFillMessage('Could not read hotel details. Try a clearer screenshot or enter rates manually.')
      }
    } catch (err) {
      if (requestId !== compareRequestRef.current) return
      setError(err.message || 'Could not read hotel quote.')
    } finally {
      if (requestId === compareRequestRef.current) {
        setExtracting(false)
        setExtractProgress(0)
        setExtractStatus('')
      }
    }
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
    if (isCostingMode) {
      scheduleCostingExtract(side)
    } else {
      scheduleHotelCompare()
    }
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
    if (key === 'markup_percent') setMarginPercent(value)
  }

  function handleSelectCostingHotel(option) {
    updateField('selected_hotel', option)
  }

  async function handleGenerate() {
    if (!agentId || !templateId) {
      setError('Please select an agent and template.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const effectiveInput = isCostingMode
        ? computePackageCostingFields({
          ...inputData,
          extra_services: costingServices,
          markup_percent: inputData.markup_percent || marginPercent,
        })
        : inputData

      const result = await generateAiContent({
        agentId,
        templateId,
        clientId,
        leadId,
        inputData: effectiveInput,
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[90rem] space-y-5">
      <AIGeneratorHero />

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr] xl:grid-cols-[minmax(280px,320px)_1fr]">
        <AIGeneratorSetupPanel
          agents={agents}
          compatibleTemplates={compatibleTemplates}
          clients={clients}
          leads={leads}
          agentId={agentId}
          templateId={templateId}
          clientId={clientId}
          leadId={leadId}
          selectedAgent={selectedAgent}
          selectedTemplate={selectedTemplate}
          onAgentChange={handleAgentChange}
          onTemplateChange={handleTemplateChange}
          onClientChange={setClientId}
          onLeadChange={setLeadId}
        />

        <div className="ai-gen-workspace flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white shadow-xl">
          <AIGeneratorChatPanel
            output={output}
            generating={generating}
            generationId={generationId}
            selectedAgent={selectedAgent}
            selectedTemplate={selectedTemplate}
            copied={copied}
            saving={saving}
            saveMessage={saveMessage}
            onCopy={handleCopy}
            onSave={handleSave}
            onOutputChange={setOutput}
            onRegenerate={handleGenerate}
          />

          {/* Context panel — uploads & fields (above composer) */}
          {selectedTemplate && (
            <div className="shrink-0 border-t border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-5">
              {isCostingMode && (
                <div className="mb-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Group package costing — compare two hotels</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Input label="Package" value={inputData.package_name || ''} onChange={(e) => updateField('package_name', e.target.value)} placeholder="School trip 2026" />
                    <Input label="Passengers" value={inputData.passengers || ''} onChange={(e) => updateField('passengers', e.target.value)} placeholder="24" />
                    <Input label="Rooms" value={inputData.rooms || ''} onChange={(e) => updateField('rooms', e.target.value)} placeholder="12" />
                    <Input label="Nights" value={inputData.nights || ''} onChange={(e) => updateField('nights', e.target.value)} placeholder="7" />
                  </div>
                  <Input label="Travel dates" value={inputData.travel_dates || ''} onChange={(e) => updateField('travel_dates', e.target.value)} placeholder="14–21 June 2026" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold text-amber-800">Hotel A — net quote</p>
                      {supplierScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                        <label className="ai-gen-upload-btn mb-2">
                          <Upload className="h-3.5 w-3.5" /> Upload quote
                          <input ref={supplierFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSupplierUpload} disabled={extracting || generating} />
                        </label>
                      )}
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        <input className="ai-gen-field w-full" placeholder="Hotel name" value={inputData.hotel_a_name || ''} onChange={(e) => updateField('hotel_a_name', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Room type" value={inputData.hotel_a_room || ''} onChange={(e) => updateField('hotel_a_room', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Board basis" value={inputData.hotel_a_meal_plan || ''} onChange={(e) => updateField('hotel_a_meal_plan', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Total net €" value={inputData.hotel_a_total || ''} onChange={(e) => updateField('hotel_a_total', e.target.value)} />
                      </div>
                      {supplierScreenshots.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {supplierScreenshots.map((shot, i) => (
                            <div key={shot.id} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-amber-200">
                              <img src={shot.preview} alt={`A${i + 1}`} className="h-full w-full object-cover" />
                              <button type="button" onClick={() => removeHotelImage(shot.id, 'supplier')} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-orange-200/60 bg-orange-50/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold text-orange-800">Hotel B — net quote</p>
                      {bookingScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                        <label className="ai-gen-upload-btn mb-2">
                          <Upload className="h-3.5 w-3.5" /> Upload quote
                          <input ref={bookingFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBookingUpload} disabled={extracting || generating} />
                        </label>
                      )}
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        <input className="ai-gen-field w-full" placeholder="Hotel name" value={inputData.hotel_b_name || ''} onChange={(e) => updateField('hotel_b_name', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Room type" value={inputData.hotel_b_room || ''} onChange={(e) => updateField('hotel_b_room', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Board basis" value={inputData.hotel_b_meal_plan || ''} onChange={(e) => updateField('hotel_b_meal_plan', e.target.value)} />
                        <input className="ai-gen-field w-full" placeholder="Total net €" value={inputData.hotel_b_total || ''} onChange={(e) => updateField('hotel_b_total', e.target.value)} />
                      </div>
                      {bookingScreenshots.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {bookingScreenshots.map((shot, i) => (
                            <div key={shot.id} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-orange-200">
                              <img src={shot.preview} alt={`B${i + 1}`} className="h-full w-full object-cover" />
                              <button type="button" onClick={() => removeHotelImage(shot.id, 'booking')} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input label="Markup %" type="number" min="0" step="0.5" value={inputData.markup_percent || marginPercent} onChange={(e) => updateField('markup_percent', e.target.value)} className="w-28" />
                  </div>

                  <CostingServicesEditor
                    services={costingServices}
                    onChange={setCostingServices}
                    passengers={Number(inputData.passengers) || 1}
                  />

                  {(extracting || packageCostingView) && (
                    <PackageCostingPanel view={packageCostingView} onSelectHotel={handleSelectCostingHotel} />
                  )}
                  {fillMessage && <p className={`text-xs ${fillMessage.includes('Could not') ? 'text-amber-700' : 'text-emerald-700'}`}>{fillMessage}</p>}
                </div>
              )}

              {isHotelCompareMode && (
                <div className="mb-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Hotel rate comparison</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-violet-200/60 bg-violet-50/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold text-violet-800">Supplier (net)</p>
                      {supplierScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                        <label className="ai-gen-upload-btn mb-2">
                          <Upload className="h-3.5 w-3.5" /> Upload
                          <input ref={supplierFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSupplierUpload} disabled={extracting || generating} />
                        </label>
                      )}
                      {supplierScreenshots.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {supplierScreenshots.map((shot, i) => (
                            <div key={shot.id} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-violet-200">
                              <img src={shot.preview} alt={`S${i + 1}`} className="h-full w-full object-cover" />
                              <button type="button" onClick={() => removeHotelImage(shot.id, 'supplier')} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-sky-200/60 bg-sky-50/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold text-sky-800">Booking (public)</p>
                      {bookingScreenshots.length < MAX_HOTEL_IMAGES_PER_SIDE && (
                        <label className="ai-gen-upload-btn mb-2">
                          <Upload className="h-3.5 w-3.5" /> Upload
                          <input ref={bookingFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBookingUpload} disabled={extracting || generating} />
                        </label>
                      )}
                      {bookingScreenshots.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {bookingScreenshots.map((shot, i) => (
                            <div key={shot.id} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-sky-200">
                              <img src={shot.preview} alt={`B${i + 1}`} className="h-full w-full object-cover" />
                              <button type="button" onClick={() => removeHotelImage(shot.id, 'booking')} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input label="Margin %" type="number" min="0" step="0.5" value={marginPercent} onChange={(e) => { setMarginPercent(e.target.value); updateField('margin_percent', e.target.value) }} className="w-24" />
                    <Button type="button" variant="secondary" size="sm" onClick={runHotelCompare} disabled={extracting || generating || (!supplierScreenshots.length && !bookingScreenshots.length)}>
                      {extracting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…</> : <><Scale className="h-3.5 w-3.5" /> Compare</>}
                    </Button>
                  </div>
                  {(extracting || hotelComparison) && <HotelRateComparisonPanel comparison={hotelComparison} loading={extracting && !hotelComparison} />}
                  {fillMessage && <p className={`text-xs ${fillMessage.includes('Could not') ? 'text-amber-700' : 'text-emerald-700'}`}>{fillMessage}</p>}
                </div>
              )}

              {supportsScreenshots && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {screenshots.length < MAX_SCREENSHOTS && (
                    <label className="ai-gen-upload-btn">
                      {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {extracting ? `${extractProgress}%` : screenshots.length ? 'Add screenshot' : 'Attach screenshot'}
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} disabled={extracting || generating} />
                    </label>
                  )}
                  {screenshots.map((shot, i) => (
                    <div key={shot.id} className="group relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200">
                      <img src={shot.preview} alt={`${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => handleRemoveScreenshot(shot.id)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3 text-white" /></button>
                    </div>
                  ))}
                  {fillMessage && supportsScreenshots && !isHotelCompareMode && (
                    <span className={`text-xs ${fillMessage.includes('Could not') ? 'text-amber-700' : 'text-emerald-700'}`}>{fillMessage}</span>
                  )}
                </div>
              )}

              {editableFieldSchema.length > 0 && !isCostingMode && (
                <details className="group/details mb-2" open={!output}>
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900">
                    {isHotelCompareMode ? 'Quote details' : 'Template fields'} ({editableFieldSchema.length})
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {editableFieldSchema.slice(0, isHotelCompareMode && !showHotelFieldDetails ? 2 : editableFieldSchema.length).map((field) => (
                      field.type === 'textarea' ? (
                        <div key={field.key} className="sm:col-span-2">
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">{field.label}</label>
                          <textarea className="ai-gen-field w-full" rows={field.rows || 2} placeholder={field.placeholder} value={inputData[field.key] || ''} onChange={(e) => updateField(field.key, e.target.value)} readOnly={field.readOnly} />
                        </div>
                      ) : (
                        <div key={field.key}>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">{field.label}</label>
                          <input className="ai-gen-field w-full" value={inputData[field.key] || ''} onChange={(e) => { updateField(field.key, e.target.value); if (field.key === 'margin_percent') setMarginPercent(e.target.value) }} placeholder={field.placeholder} readOnly={field.readOnly} />
                        </div>
                      )
                    ))}
                  </div>
                  {isHotelCompareMode && (
                    <button type="button" onClick={() => setShowHotelFieldDetails((v) => !v)} className="mt-1 text-[11px] font-medium text-teal-700 hover:underline">
                      {showHotelFieldDetails ? 'Show fewer fields' : 'Show all fields'}
                    </button>
                  )}
                </details>
              )}
            </div>
          )}

          {/* Command composer */}
          <div className="ai-gen-composer shrink-0 border-t border-slate-200/80 p-4 sm:p-5">
            {error && (
              <div className="ai-gen-error-banner mb-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-900">{error.includes('502') ? 'AI API unavailable' : 'Something went wrong'}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-700/90">{error}</p>
                  {error.includes('502') && (
                    <p className="ai-gen-error-hint mt-2 flex items-center gap-1.5 text-[11px] font-medium text-red-800/80">
                      <Terminal className="h-3 w-3 shrink-0" />
                      Local dev: run <code className="rounded bg-red-100/80 px-1 py-0.5 font-mono text-[10px]">npm run dev:api</code> in a second terminal
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your brief</p>
              {selectedTemplate && (
                <span className="ai-gen-composer-status">
                  {selectedAgent?.name} · {selectedTemplate.name}
                </span>
              )}
            </div>

            <div className="ai-gen-composer-box overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg ring-1 ring-slate-900/5 focus-within:border-violet-400/50 focus-within:ring-violet-500/20">
              <textarea
                className="ai-gen-composer-input w-full resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                rows={3}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder={selectedTemplate
                  ? isCostingMode
                    ? 'Optional notes — transfers, guide costs, group discount terms…'
                    : 'Describe tone, details, or special instructions. e.g. "Formal email for Mr Andreas, include 50% deposit terms…"'
                  : 'Select a specialist and template to begin…'}
                disabled={!selectedTemplate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && agentId && templateId) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
              />
              <div className="ai-gen-composer-toolbar flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  {selectedTemplate && supportsScreenshots && screenshots.length < MAX_SCREENSHOTS && (
                    <label className="ai-gen-composer-tool cursor-pointer" title="Attach screenshot">
                      <ImageIcon className="h-4 w-4" />
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} disabled={extracting || generating} />
                    </label>
                  )}
                  {canUseVoice && selectedTemplate && (
                    <VoiceInputButton size="sm" isListening={isListening} isSupported={canUseVoice} isRequestingPermission={isRequestingPermission} onStart={handleStartVoice} onStop={stopListening} />
                  )}
                  <span className="ai-gen-kbd-hint hidden sm:inline">
                    {isListening ? 'Listening…' : '⌘ Enter'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !agentId || !templateId}
                  className="ai-gen-send-btn group/send relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
                >
                  <span className="ai-gen-send-shimmer pointer-events-none absolute inset-0" aria-hidden />
                  {generating ? <Loader2 className="relative h-4 w-4 animate-spin" /> : <Sparkles className="relative h-4 w-4" />}
                  <span className="relative">{generating ? 'Generating…' : 'Generate'}</span>
                </button>
              </div>
            </div>
            {speechError && <p className="mt-2 text-xs text-red-600">{speechError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
