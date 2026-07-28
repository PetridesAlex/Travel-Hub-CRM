import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  ExternalLink,
  Globe,
  Hotel,
  ImageIcon,
  ListChecks,
  Loader2,
  PencilLine,
  Plane,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import {
  deleteCmsPackage,
  fetchCmsPackageById,
  getNextLegacyId,
  HONEYWELL_PACKAGE_SITE,
  isUsableImageSrc,
  resolvePackageCoverImage,
  saveCmsPackage,
} from '../../services/cmsPackages'
import {
  PACKAGE_CATEGORY_OPTIONS,
  getPackageCategoryIcon,
  getPackageCategoryMeta,
  packagesCategoryPath,
} from '../../constants/packageCategories'

function emptyHotelRow() {
  return {
    name: '',
    stars: 3,
    roomType: 'Standard Room',
    image: '',
    location: '',
    boardBasis: 'Bed & Breakfast',
    prices: { double: 0, single: 0, triple: 0, child1: 0, child2: 0 },
    packagePrice: 0,
    departureDate: '',
    nights: 3,
  }
}

function emptyFlightRow(direction = 'outbound') {
  return {
    direction,
    airline: '',
    flightNumber: '',
    from: '',
    fromCode: '',
    to: '',
    toCode: '',
    date: '',
    departureTime: '',
    arrivalTime: '',
    notes: '',
  }
}

function normalizeFlights(details = {}) {
  if (Array.isArray(details.flights)) {
    return details.flights.map((flight) => ({
      ...emptyFlightRow(flight?.direction === 'return' ? 'return' : 'outbound'),
      ...flight,
      direction: flight?.direction === 'return' ? 'return' : 'outbound',
    }))
  }

  // Legacy single-string flight notes → one editable row
  if (typeof details.flight === 'string' && details.flight.trim()) {
    return [{ ...emptyFlightRow('outbound'), notes: details.flight.trim() }]
  }
  if (typeof details.flightsText === 'string' && details.flightsText.trim()) {
    return [{ ...emptyFlightRow('outbound'), notes: details.flightsText.trim() }]
  }

  return []
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null))
}

function listToText(list) {
  return Array.isArray(list) ? list.filter(Boolean).join('\n') : ''
}

function textToList(text) {
  return String(text || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function getProgramDayEntries(program) {
  if (!program || typeof program !== 'object') return []
  return Object.keys(program)
    .filter((key) => /^day\d+$/i.test(key))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))
    .map((key) => ({ key, text: program[key] || '' }))
}

function createBlankPackage(legacyId) {
  return {
    id: null,
    legacy_id: legacyId,
    title: '',
    destination: '',
    category: '',
    price: '',
    duration: '',
    description: '',
    long_description: '',
    image: '',
    featured: false,
    package_type: 'individual',
    hidden: false,
    published: false,
    details: {
      hotels: [],
      flights: [],
      departureDates: [],
      gallery: [],
      included: [],
      notIncluded: [],
      program: { introduction: '' },
      coverImage: '',
      thumbnailImage: '',
      note: '',
      cancellationPolicy: '',
    },
    updated_at: null,
  }
}

const fieldClass =
  'w-full rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 px-3.5 py-3 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-teal-300/80 hover:to-white focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10'
const labelClass =
  'mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500'
const fieldShell =
  'rounded-2xl border border-slate-100/90 bg-gradient-to-br from-slate-50/70 via-white to-white p-3.5 shadow-sm'

const EDITOR_SECTIONS = [
  { id: 'status', label: 'Status', icon: Globe, tone: 'emerald' },
  { id: 'basics', label: 'Basics', icon: PencilLine, tone: 'teal' },
  { id: 'departures', label: 'Departures', icon: CalendarDays, tone: 'sky' },
  { id: 'flights', label: 'Flights', icon: Plane, tone: 'sky' },
  { id: 'media', label: 'Media', icon: ImageIcon, tone: 'violet' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, tone: 'amber' },
  { id: 'program', label: 'Program', icon: ListChecks, tone: 'rose' },
]

const NAV_TONES = {
  emerald: {
    active: 'border-emerald-300/80 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/25',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  teal: {
    active: 'border-teal-300/80 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-900/25',
    icon: 'bg-teal-100 text-teal-700',
  },
  sky: {
    active: 'border-sky-300/80 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-900/25',
    icon: 'bg-sky-100 text-sky-700',
  },
  violet: {
    active: 'border-violet-300/80 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-900/25',
    icon: 'bg-violet-100 text-violet-700',
  },
  amber: {
    active: 'border-amber-300/80 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-900/25',
    icon: 'bg-amber-100 text-amber-700',
  },
  rose: {
    active: 'border-rose-300/80 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-900/25',
    icon: 'bg-rose-100 text-rose-700',
  },
}

const STATUS_OPTIONS = [
  {
    id: 'live',
    label: 'Published',
    hint: 'Visible on the live site',
    Icon: Globe,
    active:
      'border-emerald-400/60 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/25 ring-2 ring-emerald-400/30',
    iconIdle: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'draft',
    label: 'Draft',
    hint: 'Saved but not live yet',
    Icon: PencilLine,
    active:
      'border-amber-400/60 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-900/25 ring-2 ring-amber-400/30',
    iconIdle: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'hidden',
    label: 'Hidden',
    hint: 'Hidden from the catalog',
    Icon: EyeOff,
    active:
      'border-slate-400/60 bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg shadow-slate-900/30 ring-2 ring-slate-400/20',
    iconIdle: 'bg-slate-200 text-slate-600',
  },
]

function scrollToSection(sectionId) {
  const el = document.getElementById(`pkg-section-${sectionId}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function FormSection({ id, icon: Icon, title, description, accent = 'teal', action, children }) {
  const accents = {
    teal: 'from-teal-500 to-teal-700 shadow-teal-900/20',
    violet: 'from-violet-500 to-fuchsia-600 shadow-violet-900/20',
    sky: 'from-sky-500 to-blue-600 shadow-sky-900/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-900/20',
    rose: 'from-rose-500 to-pink-600 shadow-rose-900/20',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-900/20',
  }

  return (
    <section
      id={id ? `pkg-section-${id}` : undefined}
      className="relative scroll-mt-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.02] sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/35 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-slate-100/80 blur-3xl" />
      <div className="relative mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${accents[accent] || accents.teal}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}

export default function PackageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new' || !id
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [datesText, setDatesText] = useState('')
  const [galleryText, setGalleryText] = useState('')
  const [includedText, setIncludedText] = useState('')
  const [notIncludedText, setNotIncludedText] = useState('')
  const [activeSection, setActiveSection] = useState('status')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    if (isNew) {
      const { legacyId, error: nextError } = await getNextLegacyId()
      if (nextError?.schemaMissing) {
        setError(nextError.message)
        setRow(null)
        setLoading(false)
        return
      }
      setRow(createBlankPackage(legacyId))
      setDatesText('')
      setGalleryText('')
      setIncludedText('')
      setNotIncludedText('')
      setLoading(false)
      return
    }

    const { data, error: queryError } = await fetchCmsPackageById(id)
    if (queryError || !data) {
      setError(queryError?.message || 'Package not found.')
      setRow(null)
      setLoading(false)
      return
    }

    const details = cloneJson(data.details || {})
    if (!Array.isArray(details.hotels)) details.hotels = []
    details.flights = normalizeFlights(details)
    if (!Array.isArray(details.departureDates)) details.departureDates = []
    if (!Array.isArray(details.gallery)) details.gallery = []
    setRow({ ...data, details })
    setDatesText((details.departureDates || []).join(', '))
    setGalleryText((details.gallery || []).join('\n'))
    setIncludedText(listToText(details.included))
    setNotIncludedText(listToText(details.notIncluded))
    setLoading(false)
  }, [id, isNew])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!row) return undefined

    const observers = []
    const ratios = {}

    EDITOR_SECTIONS.forEach(({ id: sectionId }) => {
      const el = document.getElementById(`pkg-section-${sectionId}`)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          ratios[sectionId] = entry.isIntersecting ? entry.intersectionRatio : 0
          const best = EDITOR_SECTIONS
            .map((s) => ({ id: s.id, ratio: ratios[s.id] || 0 }))
            .sort((a, b) => b.ratio - a.ratio)[0]
          if (best?.ratio > 0) setActiveSection(best.id)
        },
        { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.15, 0.35, 0.55] },
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((observer) => observer.disconnect())
  }, [row])

  const hotels = useMemo(() => row?.details?.hotels || [], [row])
  const flights = useMemo(() => row?.details?.flights || [], [row])
  const programDays = useMemo(() => getProgramDayEntries(row?.details?.program), [row])
  const coverPreview = useMemo(() => resolvePackageCoverImage(row), [row])
  const currentStatus = row?.hidden ? 'hidden' : row?.published ? 'live' : 'draft'

  const setStatus = (status) => {
    setRow((prev) => {
      if (!prev) return prev
      if (status === 'live') return { ...prev, published: true, hidden: false }
      if (status === 'draft') return { ...prev, published: false, hidden: false }
      return { ...prev, published: false, hidden: true }
    })
  }

  const updateField = (key, value) => {
    setRow((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateDetails = (patch) => {
    setRow((prev) =>
      prev
        ? {
            ...prev,
            details: { ...prev.details, ...patch },
          }
        : prev,
    )
  }

  const updateProgram = (patch) => {
    setRow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        details: {
          ...prev.details,
          program: { ...(prev.details?.program || {}), ...patch },
        },
      }
    })
  }

  const updateHotel = (index, patch) => {
    setRow((prev) => {
      if (!prev) return prev
      const nextHotels = [...(prev.details?.hotels || [])]
      const current = nextHotels[index] || emptyHotelRow()
      const next = { ...current, ...patch }
      if (patch.prices) next.prices = { ...(current.prices || {}), ...patch.prices }
      if (patch.priceField) {
        const { key, value } = patch.priceField
        const n = Number(value)
        const safe = Number.isFinite(n) ? n : 0
        next.prices = { ...(next.prices || current.prices || {}), [key]: safe }
        if (key === 'double') next.packagePrice = safe > 0 ? safe * 2 : 0
        delete next.priceField
      }
      nextHotels[index] = next
      const doubles = nextHotels
        .map((h) => Number(h?.prices?.double))
        .filter((v) => Number.isFinite(v) && v > 0)
      const cheapest = doubles.length ? Math.min(...doubles) : null
      return {
        ...prev,
        price: cheapest != null ? cheapest : prev.price,
        details: { ...prev.details, hotels: nextHotels },
      }
    })
  }

  const addHotelRow = () => {
    setRow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        details: { ...prev.details, hotels: [...(prev.details?.hotels || []), emptyHotelRow()] },
      }
    })
  }

  const removeHotelRow = (index) => {
    setRow((prev) => {
      if (!prev) return prev
      const nextHotels = [...(prev.details?.hotels || [])]
      nextHotels.splice(index, 1)
      return { ...prev, details: { ...prev.details, hotels: nextHotels } }
    })
  }

  const updateFlight = (index, patch) => {
    setRow((prev) => {
      if (!prev) return prev
      const nextFlights = [...(prev.details?.flights || [])]
      nextFlights[index] = { ...(nextFlights[index] || emptyFlightRow()), ...patch }
      return { ...prev, details: { ...prev.details, flights: nextFlights } }
    })
  }

  const addFlightRow = (direction = 'outbound') => {
    setRow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        details: {
          ...prev.details,
          flights: [...(prev.details?.flights || []), emptyFlightRow(direction)],
        },
      }
    })
  }

  const addRoundTripFlights = () => {
    setRow((prev) => {
      if (!prev) return prev
      const existing = prev.details?.flights || []
      return {
        ...prev,
        details: {
          ...prev.details,
          flights: [...existing, emptyFlightRow('outbound'), emptyFlightRow('return')],
        },
      }
    })
  }

  const removeFlightRow = (index) => {
    setRow((prev) => {
      if (!prev) return prev
      const nextFlights = [...(prev.details?.flights || [])]
      nextFlights.splice(index, 1)
      return { ...prev, details: { ...prev.details, flights: nextFlights } }
    })
  }

  const addProgramDay = () => {
    setRow((prev) => {
      if (!prev) return prev
      const program = { ...(prev.details?.program || {}) }
      const existing = getProgramDayEntries(program)
      const nextNum = existing.length
        ? Math.max(...existing.map((d) => Number(d.key.replace(/\D/g, '')) || 0)) + 1
        : 1
      program[`day${nextNum}`] = ''
      return { ...prev, details: { ...prev.details, program } }
    })
  }

  const removeProgramDay = (key) => {
    setRow((prev) => {
      if (!prev) return prev
      const program = { ...(prev.details?.program || {}) }
      delete program[key]
      return { ...prev, details: { ...prev.details, program } }
    })
  }

  const handleSave = async () => {
    if (!row) return
    const title = (row.title || '').trim()
    const legacyId = Number(row.legacy_id)
    if (!title) {
      setError('Add a package title before saving.')
      return
    }
    if (!Number.isFinite(legacyId) || legacyId <= 0) {
      setError('Website ID must be a positive number.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    const departureDates = datesText
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
    const gallery = galleryText
      .split(/\n+/)
      .map((part) => String(part || '').trim())
      .filter(Boolean)
    const coverImage = String(row.details?.coverImage || '').trim()
    const thumbnailImage = String(row.details?.thumbnailImage || '').trim()

    const payload = {
      ...row,
      title,
      legacy_id: legacyId,
      image: coverImage || thumbnailImage || row.image || null,
      details: {
        ...row.details,
        coverImage,
        thumbnailImage,
        hotels: Array.isArray(row.details?.hotels) ? row.details.hotels : [],
        flights: Array.isArray(row.details?.flights) ? row.details.flights : [],
        departureDates,
        departureDate: departureDates[0] || row.details?.departureDate || '',
        gallery,
        included: textToList(includedText),
        notIncluded: textToList(notIncludedText),
      },
    }

    const wasNew = !row.id
    const { data, error: saveError } = await saveCmsPackage(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    const details = {
      ...(data.details || {}),
      hotels: Array.isArray(data.details?.hotels) ? data.details.hotels : [],
      flights: normalizeFlights(data.details || {}),
      gallery: Array.isArray(data.details?.gallery) ? data.details.gallery : [],
      departureDates: Array.isArray(data.details?.departureDates) ? data.details.departureDates : [],
      included: Array.isArray(data.details?.included) ? data.details.included : [],
      notIncluded: Array.isArray(data.details?.notIncluded) ? data.details.notIncluded : [],
    }
    setRow({ ...data, details })
    setDatesText((details.departureDates || []).join(', '))
    setGalleryText((details.gallery || []).join('\n'))
    setIncludedText(listToText(details.included))
    setNotIncludedText(listToText(details.notIncluded))
    setNotice(wasNew ? 'Package created.' : 'Package saved. Live site updates within a few seconds.')
    if (wasNew && data?.id) navigate(`/packages/${data.id}`, { replace: true })
  }

  const handleDelete = async () => {
    if (!row?.id) return
    if (!window.confirm('Remove this package from the CMS? The static website copy is not deleted.')) return
    setDeleting(true)
    const { error: deleteError } = await deleteCmsPackage(row.id)
    setDeleting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    navigate('/packages')
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        Loading package…
      </div>
    )
  }

  if (!row) {
    return (
      <div className="space-y-4">
        <Link to="/packages" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" />
          Back to packages
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error || 'Package not found.'}
        </div>
      </div>
    )
  }

  const categoryOptions =
    row.category && !PACKAGE_CATEGORY_OPTIONS.includes(row.category)
      ? [row.category, ...PACKAGE_CATEGORY_OPTIONS]
      : PACKAGE_CATEGORY_OPTIONS

  const coverSrc = coverPreview
    ? coverPreview.startsWith('/')
      ? `${HONEYWELL_PACKAGE_SITE}${coverPreview}`
      : coverPreview
    : ''

  const catMeta = getPackageCategoryMeta(row.category)
  const CatIcon = getPackageCategoryIcon(catMeta.icon)
  const backToCategory = packagesCategoryPath(row.category)

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-teal-950 to-violet-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative">
          <Link
            to={backToCategory}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {row.category ? catMeta.label : 'All packages'}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100">
                <Sparkles className="h-3.5 w-3.5" />
                {isNew ? 'New package' : 'Edit package'}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isNew ? 'Create package' : row.title || 'Untitled package'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="font-mono text-xs text-slate-400">Website ID {row.legacy_id}</span>
                {row.category ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                    <CatIcon className="h-3 w-3" />
                    {catMeta.label}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {!isNew ? (
                <a
                  href={`${HONEYWELL_PACKAGE_SITE}/packages/${row.legacy_id}/details`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary" className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20">
                    <ExternalLink className="h-4 w-4" />
                    View site
                  </Button>
                </a>
              ) : null}
              {!isNew ? (
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              ) : null}
              <Button onClick={handleSave} disabled={saving} className="shadow-lg shadow-teal-900/30">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white px-4 py-3.5 text-sm text-red-800 shadow-sm">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
            <X className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">Couldn’t save</p>
            <p className="mt-0.5 text-red-700/90">{error}</p>
          </div>
        </div>
      ) : null}
      {notice ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 px-4 py-3.5 shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
          <div className="flex items-start gap-3 pl-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-950">{notice}</p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Your changes are synced to the Honeywell catalog.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="rounded-lg p-1.5 text-emerald-700/60 transition hover:bg-emerald-100 hover:text-emerald-900"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Jump to section */}
      <div className="sticky top-2 z-30 overflow-hidden rounded-2xl border border-slate-800/10 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.55)] ring-1 ring-white/10 sm:p-3.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-400/20 text-teal-200 ring-1 ring-teal-300/30">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/90">Editor navigation</p>
              <p className="text-[11px] text-slate-400">Jump to any section — stays visible while you scroll</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-100">
            {EDITOR_SECTIONS.find((s) => s.id === activeSection)?.label || 'Status'}
          </span>
        </div>
        <div className="relative flex gap-2 overflow-x-auto pb-0.5">
          {EDITOR_SECTIONS.map(({ id: sectionId, label, icon: Icon, tone }) => {
            const active = activeSection === sectionId
            const tones = NAV_TONES[tone] || NAV_TONES.teal
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => {
                  setActiveSection(sectionId)
                  scrollToSection(sectionId)
                }}
                className={`group flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold tracking-tight transition duration-200 ${
                  active
                    ? tones.active
                    : 'border-white/10 bg-white/[0.06] text-slate-200 hover:border-teal-300/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    active
                      ? 'bg-white/20 text-white'
                      : `${tones.icon} ring-1 ring-black/5 group-hover:scale-105`
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <FormSection
        id="status"
        icon={Globe}
        title="Publishing status"
        description="Control visibility on the live Honeywell catalog"
        accent="emerald"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {STATUS_OPTIONS.map(({ id: statusId, label, hint, Icon, active, iconIdle }) => {
            const selected = currentStatus === statusId
            return (
              <button
                key={statusId}
                type="button"
                onClick={() => setStatus(statusId)}
                className={`relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 ${
                  selected
                    ? active
                    : 'border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 text-slate-700 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {selected ? (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <span
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    selected ? 'bg-white/20 text-white' : iconIdle
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className={`text-sm font-bold tracking-tight ${selected ? 'text-white' : 'text-slate-900'}`}>
                  {label}
                </p>
                <p className={`mt-1 text-[11px] leading-relaxed ${selected ? 'text-white/80' : 'text-slate-500'}`}>
                  {hint}
                </p>
              </button>
            )
          })}
        </div>
      </FormSection>

      <FormSection id="basics" icon={PencilLine} title="Basics" description="Title, pricing, destination, and category" accent="teal">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Title
            </label>
            <input
              className={fieldClass}
              value={row.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Package title as shown on the website"
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Website ID
            </label>
            <input
              className={fieldClass}
              type="number"
              value={row.legacy_id ?? ''}
              onChange={(e) => updateField('legacy_id', e.target.value)}
              disabled={!isNew}
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              From price (€)
            </label>
            <input
              className={fieldClass}
              type="number"
              value={row.price ?? ''}
              onChange={(e) => updateField('price', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Destination
            </label>
            <input
              className={fieldClass}
              value={row.destination || ''}
              onChange={(e) => updateField('destination', e.target.value)}
              placeholder="e.g. Dubai, Rhodes, Paris"
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Duration
            </label>
            <input
              className={fieldClass}
              value={row.duration || ''}
              onChange={(e) => updateField('duration', e.target.value)}
              placeholder="6 days / 5 nights"
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Category
            </label>
            <select
              className={fieldClass}
              value={row.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
            >
              <option value="">Select…</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Package type
            </label>
            <select
              className={fieldClass}
              value={row.package_type || 'individual'}
              onChange={(e) => updateField('package_type', e.target.value)}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </div>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Short description
            </label>
            <textarea
              className={`${fieldClass} min-h-[88px] leading-relaxed`}
              value={row.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief summary shown on package cards"
            />
          </div>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-teal-500" />
              Long description
            </label>
            <textarea
              className={`${fieldClass} min-h-[140px] leading-relaxed`}
              value={row.long_description || ''}
              onChange={(e) => updateField('long_description', e.target.value)}
              placeholder="Full package story for the detail page"
            />
          </div>
          <label className="inline-flex items-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 to-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/30"
              checked={Boolean(row.featured)}
              onChange={(e) => updateField('featured', e.target.checked)}
            />
            Featured on website homepage
          </label>
        </div>
      </FormSection>

      <FormSection id="departures" icon={CalendarDays} title="Departures" description="Comma-separated departure dates shown on the site" accent="sky">
        <div className={fieldShell}>
          <label className={labelClass}>
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            Dates
          </label>
          <input
            className={fieldClass}
            value={datesText}
            onChange={(e) => setDatesText(e.target.value)}
            placeholder="21/08, 28/08, 04/09"
          />
          <p className="mt-2 text-xs text-slate-500">Separate multiple dates with commas.</p>
        </div>
      </FormSection>

      <FormSection
        id="flights"
        icon={Plane}
        title="Flights"
        description="Outbound and return flights for this package"
        accent="sky"
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={addRoundTripFlights}>
              <Plane className="h-4 w-4" />
              Add round trip
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addFlightRow('outbound')}>
              <Plus className="h-4 w-4" />
              Add flight
            </Button>
          </div>
        }
      >
        {flights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/40 px-4 py-10 text-center">
            <Plane className="mx-auto h-8 w-8 text-sky-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No flights yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Add outbound / return flights, airline, times, and airports for this package.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={addRoundTripFlights}>
                <Plane className="h-4 w-4" />
                Add round trip
              </Button>
              <Button size="sm" variant="secondary" onClick={() => addFlightRow('outbound')}>
                <Plus className="h-4 w-4" />
                Add single flight
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {flights.map((flight, index) => {
              const isReturn = flight.direction === 'return'
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isReturn
                      ? 'border-indigo-100/80 bg-gradient-to-br from-indigo-50/40 via-white to-white'
                      : 'border-sky-100/80 bg-gradient-to-br from-sky-50/50 via-white to-white'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm ${
                          isReturn
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                            : 'bg-gradient-to-br from-sky-500 to-blue-600'
                        }`}
                      >
                        <Plane className={`h-3.5 w-3.5 ${isReturn ? 'rotate-180' : ''}`} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {isReturn ? 'Return flight' : 'Outbound flight'}
                        </p>
                        <p className="text-[11px] text-slate-500">Flight {index + 1}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className={`${fieldClass} !w-auto !py-1.5 text-xs`}
                        value={flight.direction || 'outbound'}
                        onChange={(e) => updateFlight(index, { direction: e.target.value })}
                        aria-label="Flight direction"
                      >
                        <option value="outbound">Outbound</option>
                        <option value="return">Return</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => removeFlightRow(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Airline"
                      value={flight.airline || ''}
                      onChange={(e) => updateFlight(index, { airline: e.target.value })}
                      placeholder="e.g. Aegean, Cyprus Airways"
                    />
                    <Input
                      label="Flight number"
                      value={flight.flightNumber || ''}
                      onChange={(e) => updateFlight(index, { flightNumber: e.target.value })}
                      placeholder="e.g. A3 620"
                    />
                    <Input
                      label="Date"
                      value={flight.date || ''}
                      onChange={(e) => updateFlight(index, { date: e.target.value })}
                      placeholder="e.g. 21/08/2026"
                    />
                    <Input
                      label="From city"
                      value={flight.from || ''}
                      onChange={(e) => updateFlight(index, { from: e.target.value })}
                      placeholder="e.g. Larnaca"
                    />
                    <Input
                      label="From code"
                      value={flight.fromCode || ''}
                      onChange={(e) => updateFlight(index, { fromCode: e.target.value.toUpperCase() })}
                      placeholder="LCA"
                    />
                    <Input
                      label="Depart time"
                      value={flight.departureTime || ''}
                      onChange={(e) => updateFlight(index, { departureTime: e.target.value })}
                      placeholder="08:30"
                    />
                    <Input
                      label="To city"
                      value={flight.to || ''}
                      onChange={(e) => updateFlight(index, { to: e.target.value })}
                      placeholder="e.g. Athens"
                    />
                    <Input
                      label="To code"
                      value={flight.toCode || ''}
                      onChange={(e) => updateFlight(index, { toCode: e.target.value.toUpperCase() })}
                      placeholder="ATH"
                    />
                    <Input
                      label="Arrive time"
                      value={flight.arrivalTime || ''}
                      onChange={(e) => updateFlight(index, { arrivalTime: e.target.value })}
                      placeholder="10:15"
                    />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className={labelClass}>Notes</label>
                      <input
                        className={fieldClass}
                        value={flight.notes || ''}
                        onChange={(e) => updateFlight(index, { notes: e.target.value })}
                        placeholder="e.g. Direct flight · Hand luggage included"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FormSection>

      <FormSection id="media" icon={ImageIcon} title="Media" description="Cover, thumbnail, and gallery images" accent="violet">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              Cover image URL / path
            </label>
            <input
              className={fieldClass}
              value={row.details?.coverImage || ''}
              onChange={(e) => updateDetails({ coverImage: e.target.value })}
              placeholder="/images/… or https://…"
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              Thumbnail URL / path
            </label>
            <input
              className={fieldClass}
              value={row.details?.thumbnailImage || ''}
              onChange={(e) => updateDetails({ thumbnailImage: e.target.value })}
              placeholder="/images/… or https://…"
            />
          </div>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              Gallery (one URL per line)
            </label>
            <textarea
              className={`${fieldClass} min-h-[110px] font-mono text-xs leading-relaxed`}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
              placeholder={'/images/gallery-1.webp\n/images/gallery-2.webp'}
            />
          </div>
          {coverSrc && isUsableImageSrc(coverPreview) ? (
            <div className="sm:col-span-2 overflow-hidden rounded-2xl border border-violet-100 shadow-md ring-1 ring-violet-500/10">
              <div className="border-b border-violet-50 bg-violet-50/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                Cover preview
              </div>
              <img src={coverSrc} alt="" className="max-h-64 w-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        id="hotels"
        icon={Hotel}
        title="Hotels & prices"
        description="Room rates drive the package from-price"
        accent="amber"
        action={
          <Button size="sm" variant="secondary" onClick={addHotelRow}>
            <Plus className="h-4 w-4" />
            Add hotel
          </Button>
        }
      >
        {hotels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-sm text-slate-500">
            No hotel rows yet. Add the first hotel to start pricing.
          </div>
        ) : (
          <div className="space-y-4">
            {hotels.map((hotel, index) => (
              <div
                key={index}
                className="rounded-xl border border-amber-100/80 bg-gradient-to-br from-amber-50/40 via-white to-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                      <Hotel className="h-3.5 w-3.5" />
                    </span>
                    Hotel {index + 1}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeHotelRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Name"
                    value={hotel.name || ''}
                    onChange={(e) => updateHotel(index, { name: e.target.value })}
                  />
                  <Input
                    label="Stars"
                    type="number"
                    value={hotel.stars ?? ''}
                    onChange={(e) => updateHotel(index, { stars: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Room type"
                    value={hotel.roomType || ''}
                    onChange={(e) => updateHotel(index, { roomType: e.target.value })}
                  />
                  <Input
                    label="Board"
                    value={hotel.boardBasis || ''}
                    onChange={(e) => updateHotel(index, { boardBasis: e.target.value })}
                  />
                  <Input
                    label="Departure date"
                    value={hotel.departureDate || ''}
                    onChange={(e) => updateHotel(index, { departureDate: e.target.value })}
                  />
                  <Input
                    label="Nights"
                    type="number"
                    value={hotel.nights ?? ''}
                    onChange={(e) => updateHotel(index, { nights: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Double €"
                    type="number"
                    value={hotel.prices?.double ?? ''}
                    onChange={(e) => updateHotel(index, { priceField: { key: 'double', value: e.target.value } })}
                  />
                  <Input
                    label="Single €"
                    type="number"
                    value={hotel.prices?.single ?? ''}
                    onChange={(e) => updateHotel(index, { priceField: { key: 'single', value: e.target.value } })}
                  />
                  <Input
                    label="Triple €"
                    type="number"
                    value={hotel.prices?.triple ?? ''}
                    onChange={(e) => updateHotel(index, { priceField: { key: 'triple', value: e.target.value } })}
                  />
                  <Input
                    label="Child 1 €"
                    type="number"
                    value={hotel.prices?.child1 ?? ''}
                    onChange={(e) => updateHotel(index, { priceField: { key: 'child1', value: e.target.value } })}
                  />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Input
                      label="Hotel image URL"
                      value={hotel.image || ''}
                      onChange={(e) => updateHotel(index, { image: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection
        id="program"
        icon={ListChecks}
        title="Program & inclusions"
        description="Day-by-day itinerary, inclusions, and policies"
        accent="rose"
        action={
          <Button size="sm" variant="secondary" onClick={addProgramDay}>
            <Plus className="h-4 w-4" />
            Add day
          </Button>
        }
      >
        <div className="space-y-4">
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-rose-500" />
              Program introduction
            </label>
            <textarea
              className={`${fieldClass} min-h-[88px] leading-relaxed`}
              value={row.details?.program?.introduction || ''}
              onChange={(e) => updateProgram({ introduction: e.target.value })}
              placeholder="Opening text for the itinerary"
            />
          </div>

          {programDays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/30 px-4 py-8 text-center text-sm text-slate-500">
              No day-by-day entries yet.
            </div>
          ) : (
            programDays.map(({ key, text }, idx) => (
              <div
                key={key}
                className="rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50/40 via-white to-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-[11px] text-white shadow-sm">
                      {idx + 1}
                    </span>
                    {key}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeProgramDay(key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  className={`${fieldClass} min-h-[80px] leading-relaxed`}
                  value={text}
                  onChange={(e) => updateProgram({ [key]: e.target.value })}
                />
              </div>
            ))
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldShell}>
              <label className={labelClass}>
                <span className="h-1 w-1 rounded-full bg-rose-500" />
                Included (one per line)
              </label>
              <textarea
                className={`${fieldClass} min-h-[130px] leading-relaxed`}
                value={includedText}
                onChange={(e) => setIncludedText(e.target.value)}
              />
            </div>
            <div className={fieldShell}>
              <label className={labelClass}>
                <span className="h-1 w-1 rounded-full bg-rose-500" />
                Not included (one per line)
              </label>
              <textarea
                className={`${fieldClass} min-h-[130px] leading-relaxed`}
                value={notIncludedText}
                onChange={(e) => setNotIncludedText(e.target.value)}
              />
            </div>
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-rose-500" />
              Cancellation policy
            </label>
            <textarea
              className={`${fieldClass} min-h-[88px] leading-relaxed`}
              value={row.details?.cancellationPolicy || ''}
              onChange={(e) => updateDetails({ cancellationPolicy: e.target.value })}
            />
          </div>
          <div className={fieldShell}>
            <label className={labelClass}>
              <span className="h-1 w-1 rounded-full bg-rose-500" />
              Note
            </label>
            <textarea
              className={`${fieldClass} min-h-[70px] leading-relaxed`}
              value={row.details?.note || ''}
              onChange={(e) => updateDetails({ note: e.target.value })}
            />
          </div>
        </div>
      </FormSection>

      <div className="sticky bottom-3 z-20 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 p-3 shadow-[0_16px_50px_-20px_rgba(15,23,42,0.55)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 px-1">
            <p className="truncate text-sm font-semibold text-white">
              {row.title?.trim() || 'Untitled package'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {STATUS_OPTIONS.find((s) => s.id === currentStatus)?.label || 'Draft'}
              {row.category ? ` · ${catMeta.label}` : ''}
              {' · '}Website ID {row.legacy_id}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(backToCategory)}
              className="!border-white/15 !bg-white/10 !text-white hover:!bg-white/20"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="shadow-lg shadow-teal-900/40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save package
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
