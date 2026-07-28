import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import {
  fetchCmsPackages,
  HONEYWELL_PACKAGE_SITE,
  resolvePackageCoverImage,
} from '../../services/cmsPackages'

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
  if (row.hidden) return { id: 'hidden', label: 'Hidden', className: 'bg-slate-100 text-slate-700' }
  if (row.published === false) return { id: 'draft', label: 'Draft', className: 'bg-amber-50 text-amber-800' }
  return { id: 'published', label: 'Published', className: 'bg-emerald-50 text-emerald-800' }
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

const STATUS_FILTERS = [
  { id: 'all', label: 'All', Icon: Filter },
  { id: 'published', label: 'Published', Icon: Globe },
  { id: 'draft', label: 'Draft', Icon: PencilLine },
  { id: 'hidden', label: 'Hidden', Icon: EyeOff },
]

export default function Packages() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [destination, setDestination] = useState('all')
  const [status, setStatus] = useState('all')

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

  const categories = useMemo(() => {
    const set = new Set(rows.map((row) => row.category).filter(Boolean))
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Packages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Edit Honeywell website packages. Changes publish to the live catalog.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Link to="/packages/new">
            <Button>
              <Plus className="h-4 w-4" />
              New package
            </Button>
          </Link>
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All categories' : item}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    status === id
                      ? 'border-teal-300 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-pressed={status === id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{loading ? '…' : filtered.length}</span>{' '}
              package{filtered.length === 1 ? '' : 's'} shown
            </p>
            {(status !== 'all' || category !== 'all' || destination !== 'all' || search.trim()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatus('all')
                  setCategory('all')
                  setDestination('all')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading packages…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-16 text-slate-500">
              <Package className="h-8 w-8" />
              <p>No packages match your search.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => {
                const statusInfo = packageStatus(row)
                const cover = resolvePackageCoverImage(row)
                const departures = departureList(row)

                return (
                  <article
                    key={row.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative aspect-[16/10] bg-slate-100">
                      {cover ? (
                        <img
                          src={cover.startsWith('/') ? `${HONEYWELL_PACKAGE_SITE}${cover}` : cover}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <Package className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          ID {row.legacy_id}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <h2 className="line-clamp-2 text-base font-semibold text-slate-900">{row.title}</h2>
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                        {row.destination ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1">
                            <MapPin className="h-3 w-3" />
                            {row.destination}
                          </span>
                        ) : null}
                        {row.duration ? (
                          <span className="rounded-md bg-slate-50 px-2 py-1">{row.duration}</span>
                        ) : null}
                        {row.category ? (
                          <span className="rounded-md bg-slate-50 px-2 py-1">{row.category}</span>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-teal-700">{formatMoney(row.price)}</p>
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <CalendarDays className="h-3 w-3" />
                          Departures
                        </div>
                        {departures.length ? (
                          <div className="flex flex-wrap gap-1">
                            {departures.slice(0, 5).map((date) => (
                              <span
                                key={date}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-600"
                              >
                                {date}
                              </span>
                            ))}
                            {departures.length > 5 ? (
                              <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                                +{departures.length - 5}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No dates set</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">Updated {formatUpdated(row.updated_at)}</p>
                      <div className="mt-auto flex gap-2 pt-1">
                        <Link to={`/packages/${row.id}`} className="flex-1">
                          <Button className="w-full" size="sm">
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
