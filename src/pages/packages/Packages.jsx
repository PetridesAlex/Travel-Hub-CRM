import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  ExternalLink,
  EyeOff,
  Filter,
  Globe,
  Loader2,
  MapPin,
  Package,
  PencilLine,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import {
  fetchCmsPackages,
  HONEYWELL_PACKAGE_SITE,
  resolvePackageCoverImage,
} from '../../services/cmsPackages'
import {
  PACKAGE_CATEGORIES,
  getPackageCategoryIcon,
  getPackageCategoryMeta,
} from '../../constants/packageCategories'

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `From €${n.toLocaleString()}`
}

function formatUpdated(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function packageStatus(row) {
  if (row.hidden) {
    return {
      id: 'hidden',
      label: 'Hidden',
      className: 'border-slate-200/80 bg-slate-100 text-slate-700',
    }
  }
  if (row.published === false) {
    return {
      id: 'draft',
      label: 'Draft',
      className: 'border-amber-200/80 bg-amber-50 text-amber-800',
    }
  }
  return {
    id: 'published',
    label: 'Published',
    className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  }
}

function departureList(row) {
  const list = row?.details?.departureDates
  if (Array.isArray(list) && list.length) {
    return list.map((d) => String(d).trim()).filter(Boolean)
  }
  if (row?.details?.departureDate) {
    return String(row.details.departureDate)
      .split(/[,;]+/)
      .map((d) => d.trim())
      .filter(Boolean)
  }
  return []
}

function flightCount(row) {
  const flights = row?.details?.flights
  if (Array.isArray(flights)) return flights.length
  if (typeof row?.details?.flight === 'string' && row.details.flight.trim()) return 1
  return 0
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All', Icon: Filter },
  { id: 'published', label: 'Published', Icon: Globe },
  { id: 'draft', label: 'Draft', Icon: PencilLine },
  { id: 'hidden', label: 'Hidden', Icon: EyeOff },
]

export default function Packages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category') || 'all'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(categoryFromUrl)
  const [destination, setDestination] = useState('all')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    setCategory(categoryFromUrl)
  }, [categoryFromUrl])

  const setCategoryFilter = (next) => {
    setCategory(next)
    if (!next || next === 'all') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ category: next }, { replace: true })
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await fetchCmsPackages()
    if (queryError) {
      setError(queryError.message)
      setSchemaMissing(Boolean(queryError.schemaMissing))
      setRows([])
    } else {
      setRows(data || [])
      setSchemaMissing(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(PACKAGE_CATEGORIES.map((c) => [c.id, 0]))
    let uncategorized = 0
    for (const row of rows) {
      if (row.category && counts[row.category] != null) counts[row.category] += 1
      else if (row.category) uncategorized += 1
      else uncategorized += 1
    }
    return { ...counts, uncategorized, all: rows.length }
  }, [rows])

  const destinations = useMemo(() => {
    const set = new Set(rows.map((row) => row.destination).filter(Boolean))
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      const rowStatus = packageStatus(row).id
      if (status !== 'all' && rowStatus !== status) return false
      if (category !== 'all' && row.category !== category) return false
      if (destination !== 'all' && row.destination !== destination) return false
      if (!term) return true
      return [row.title, row.destination, row.category, String(row.legacy_id), row.duration]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [rows, search, category, destination, status])

  const stats = useMemo(
    () => ({
      total: rows.length,
      published: rows.filter((r) => !r.hidden && r.published !== false).length,
      draft: rows.filter((r) => !r.hidden && r.published === false).length,
      hidden: rows.filter((r) => r.hidden).length,
    }),
    [rows],
  )

  const activeCategoryMeta = category !== 'all' ? getPackageCategoryMeta(category) : null

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-teal-950 to-violet-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">
              <Sparkles className="h-3.5 w-3.5" />
              Live catalog
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Packages</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Browse by category, edit Honeywell packages, and publish updates to the live website.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={load}
              disabled={loading}
              className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Link to="/packages/new">
              <Button className="shadow-lg shadow-teal-900/30">
                <Plus className="h-4 w-4" />
                New package
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, icon: Package },
            { label: 'Published', value: stats.published, icon: Globe },
            { label: 'Drafts', value: stats.draft, icon: PencilLine },
            { label: 'Hidden', value: stats.hidden, icon: EyeOff },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10"
            >
              <div className="flex items-center gap-2 text-teal-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
      </div>

      {schemaMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Setup required. Run <code className="rounded bg-amber-100 px-1">supabase/migrations/023_cms_packages.sql</code>{' '}
          in Supabase SQL Editor, then refresh.
          <Button className="ml-3" size="sm" onClick={load}>
            Check again
          </Button>
        </div>
      ) : null}

      {!schemaMissing && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!schemaMissing ? (
        <>
          {/* Category nav */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`group relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  category === 'all'
                    ? 'border-teal-200/90 bg-gradient-to-b from-teal-50 via-white to-white text-teal-900 shadow-md ring-1 ring-teal-500/15'
                    : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    category === 'all'
                      ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Package className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">All</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    category === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {categoryCounts.all}
                </span>
              </button>

              {PACKAGE_CATEGORIES.map((cat) => {
                const Icon = getPackageCategoryIcon(cat.icon)
                const active = category === cat.id
                const count = categoryCounts[cat.id] || 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`group relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                      active
                        ? 'border-slate-200/90 bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5'
                        : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {active && (
                      <span className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r ${cat.accent}`} />
                    )}
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm ${
                        active ? cat.iconBg : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap">{cat.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        active ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search & filters */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold tracking-tight text-slate-900">
                  {activeCategoryMeta ? activeCategoryMeta.fullLabel : 'All packages'}
                </p>
                <p className="text-xs text-slate-500">Search by title, destination, or website ID</p>
              </div>
              <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold tabular-nums text-teal-800">
                {loading ? '…' : filtered.length} shown
              </span>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
                <input
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, destination, category, or ID…"
                  aria-label="Search packages"
                />
                {search.trim() ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <select
                className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                aria-label="Filter by destination"
              >
                {destinations.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All destinations' : item}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    status === id
                      ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-pressed={status === id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}

              {(status !== 'all' || category !== 'all' || destination !== 'all' || search.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                    setDestination('all')
                    setCategoryFilter('all')
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Loading packages…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
              <Package className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium">No packages match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => {
                const statusInfo = packageStatus(row)
                const cover = resolvePackageCoverImage(row)
                const departures = departureList(row)
                const flights = flightCount(row)
                const catMeta = getPackageCategoryMeta(row.category)
                const CatIcon = getPackageCategoryIcon(catMeta.icon)

                return (
                  <article
                    key={row.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-22px_rgba(15,23,42,0.25)] ring-1 ring-transparent transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:ring-teal-200/60"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {cover ? (
                        <img
                          src={cover.startsWith('/') ? `${HONEYWELL_PACKAGE_SITE}${cover}` : cover}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
                          <Package className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/55 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/80">
                          ID {row.legacy_id}
                        </span>
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-teal-800 shadow-sm">
                          {formatMoney(row.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h2 className="line-clamp-2 text-base font-semibold tracking-tight text-slate-900">
                          {row.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.destination ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-1 text-[11px] font-medium text-sky-800">
                              <MapPin className="h-3 w-3" />
                              {row.destination}
                            </span>
                          ) : null}
                          {row.duration ? (
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                              {row.duration}
                            </span>
                          ) : null}
                          {row.category ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${catMeta.chip}`}
                            >
                              <CatIcon className="h-3 w-3" />
                              {catMeta.label}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            <CalendarDays className="h-3 w-3 text-teal-600" />
                            Departures
                          </div>
                          {departures.length > 0 ? (
                            <span className="text-[10px] font-semibold tabular-nums text-slate-500">
                              {departures.length} date{departures.length === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                        {departures.length ? (
                          <div className="flex flex-wrap gap-1">
                            {departures.slice(0, 4).map((date) => (
                              <span
                                key={date}
                                className="rounded-md border border-teal-100/80 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm"
                              >
                                {date}
                              </span>
                            ))}
                            {departures.length > 4 ? (
                              <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700">
                                +{departures.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No dates set</span>
                        )}

                        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                          <Plane className="h-3 w-3 text-sky-600" />
                          {flights > 0 ? (
                            <span className="font-medium text-slate-700">
                              {flights} flight{flights === 1 ? '' : 's'} configured
                            </span>
                          ) : (
                            <span>No flights set</span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400">Updated {formatUpdated(row.updated_at)}</p>

                      <div className="mt-auto flex gap-2 pt-1">
                        <Link to={`/packages/${row.id}`} className="flex-1">
                          <Button className="w-full" size="sm">
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </Link>
                        <a
                          href={`${HONEYWELL_PACKAGE_SITE}/packages/${row.legacy_id}/details`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button variant="secondary" className="w-full" size="sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Site
                          </Button>
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
