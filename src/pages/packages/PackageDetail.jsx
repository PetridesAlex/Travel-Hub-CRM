import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  EyeOff,
  ExternalLink,
  Globe,
  Hotel,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Trash2,
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

const CATEGORY_OPTIONS = [
  'Summer Packages',
  'Christmas Packages',
  'Easter Packages',
  'City Breaks',
  'Exotic Packages',
  'Cruises',
  'Other',
]

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
  'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'

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

  const hotels = useMemo(() => row?.details?.hotels || [], [row])
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
        : prev
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
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
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
    row.category && !CATEGORY_OPTIONS.includes(row.category)
      ? [row.category, ...CATEGORY_OPTIONS]
      : CATEGORY_OPTIONS

  const coverSrc = coverPreview
    ? coverPreview.startsWith('/')
      ? `${HONEYWELL_PACKAGE_SITE}${coverPreview}`
      : coverPreview
    : ''

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/packages" className="mb-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700">
            <ArrowLeft className="h-4 w-4" />
            Packages
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isNew ? 'New package' : row.title || 'Edit package'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Website ID {row.legacy_id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew ? (
            <a
              href={`${HONEYWELL_PACKAGE_SITE}/packages/${row.legacy_id}/details`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary">
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Status</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'live', label: 'Published', Icon: Globe },
            { id: 'draft', label: 'Draft', Icon: PencilLine },
            { id: 'hidden', label: 'Hidden', Icon: EyeOff },
          ].map(({ id: statusId, label, Icon }) => (
            <button
              key={statusId}
              type="button"
              onClick={() => setStatus(statusId)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                currentStatus === statusId
                  ? 'border-teal-300 bg-teal-50 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Title</label>
            <input className={fieldClass} value={row.title || ''} onChange={(e) => updateField('title', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Website ID</label>
            <input
              className={fieldClass}
              type="number"
              value={row.legacy_id ?? ''}
              onChange={(e) => updateField('legacy_id', e.target.value)}
              disabled={!isNew}
            />
          </div>
          <div>
            <label className={labelClass}>From price (€)</label>
            <input
              className={fieldClass}
              type="number"
              value={row.price ?? ''}
              onChange={(e) => updateField('price', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input
              className={fieldClass}
              value={row.destination || ''}
              onChange={(e) => updateField('destination', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Duration</label>
            <input
              className={fieldClass}
              value={row.duration || ''}
              onChange={(e) => updateField('duration', e.target.value)}
              placeholder="6 days / 5 nights"
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
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
          <div>
            <label className={labelClass}>Package type</label>
            <select
              className={fieldClass}
              value={row.package_type || 'individual'}
              onChange={(e) => updateField('package_type', e.target.value)}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Short description</label>
            <textarea
              className={`${fieldClass} min-h-[80px]`}
              value={row.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Long description</label>
            <textarea
              className={`${fieldClass} min-h-[120px]`}
              value={row.long_description || ''}
              onChange={(e) => updateField('long_description', e.target.value)}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(row.featured)}
              onChange={(e) => updateField('featured', e.target.checked)}
            />
            Featured on website
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Departures</h2>
        <label className={labelClass}>Dates (comma-separated)</label>
        <input
          className={fieldClass}
          value={datesText}
          onChange={(e) => setDatesText(e.target.value)}
          placeholder="21/08, 28/08"
        />
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cover image URL / path</label>
            <input
              className={fieldClass}
              value={row.details?.coverImage || ''}
              onChange={(e) => updateDetails({ coverImage: e.target.value })}
              placeholder="/images/… or https://…"
            />
          </div>
          <div>
            <label className={labelClass}>Thumbnail URL / path</label>
            <input
              className={fieldClass}
              value={row.details?.thumbnailImage || ''}
              onChange={(e) => updateDetails({ thumbnailImage: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Gallery (one URL per line)</label>
            <textarea
              className={`${fieldClass} min-h-[100px] font-mono text-xs`}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
            />
          </div>
          {coverSrc && isUsableImageSrc(coverPreview) ? (
            <div className="sm:col-span-2 overflow-hidden rounded-xl border border-slate-200">
              <img src={coverSrc} alt="" className="max-h-56 w-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Hotels & prices</h2>
          <Button size="sm" variant="secondary" onClick={addHotelRow}>
            <Plus className="h-4 w-4" />
            Add hotel
          </Button>
        </div>
        {hotels.length === 0 ? (
          <p className="text-sm text-slate-500">No hotel rows yet.</p>
        ) : (
          <div className="space-y-4">
            {hotels.map((hotel, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Hotel className="h-4 w-4 text-teal-600" />
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
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Program & inclusions</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Program introduction</label>
            <textarea
              className={`${fieldClass} min-h-[80px]`}
              value={row.details?.program?.introduction || ''}
              onChange={(e) => updateProgram({ introduction: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Day-by-day</p>
            <Button size="sm" variant="secondary" onClick={addProgramDay}>
              <Plus className="h-4 w-4" />
              Add day
            </Button>
          </div>
          {programDays.map(({ key, text }) => (
            <div key={key} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{key}</span>
                <Button size="sm" variant="ghost" onClick={() => removeProgramDay(key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                className={`${fieldClass} min-h-[70px]`}
                value={text}
                onChange={(e) => updateProgram({ [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Included (one per line)</label>
              <textarea
                className={`${fieldClass} min-h-[120px]`}
                value={includedText}
                onChange={(e) => setIncludedText(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Not included (one per line)</label>
              <textarea
                className={`${fieldClass} min-h-[120px]`}
                value={notIncludedText}
                onChange={(e) => setNotIncludedText(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cancellation policy</label>
            <textarea
              className={`${fieldClass} min-h-[80px]`}
              value={row.details?.cancellationPolicy || ''}
              onChange={(e) => updateDetails({ cancellationPolicy: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Note</label>
            <textarea
              className={`${fieldClass} min-h-[60px]`}
              value={row.details?.note || ''}
              onChange={(e) => updateDetails({ note: e.target.value })}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="secondary" onClick={() => navigate('/packages')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save package
        </Button>
      </div>
    </div>
  )
}
