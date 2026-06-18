import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pencil, Trash2, User, Building2, Users, SlidersHorizontal,
  Search, ArrowUpDown, Globe, ChevronDown, X, Sparkles, Loader2,
  Phone, MoreHorizontal, UserCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getClients, createClient, updateClient, deleteClient } from '../services/clients'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { CLIENT_TYPES } from '../constants/enums'
import { formatClientName, labelFor, formatDateTime } from '../utils/format'
import { notifySlack } from '../services/slackNotify'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const TYPE_TABS = [
  {
    id: '',
    label: 'All Clients',
    icon: Users,
    activeClass: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-violet-50/40 text-teal-900 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/15',
    iconActive: 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/20',
    countActive: 'bg-teal-600 text-white shadow-sm',
    accent: 'from-teal-400 to-violet-400',
  },
  {
    id: 'individual',
    label: 'Individuals',
    icon: User,
    activeClass: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-teal-50/30 text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-500/15',
    iconActive: 'bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md shadow-sky-900/20',
    countActive: 'bg-sky-600 text-white shadow-sm',
    accent: 'from-sky-400 to-teal-500',
  },
  {
    id: 'business',
    label: 'Corporate',
    icon: Building2,
    activeClass: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 text-violet-900 shadow-md shadow-violet-900/5 ring-1 ring-violet-500/15',
    iconActive: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-900/20',
    countActive: 'bg-violet-600 text-white shadow-sm',
    accent: 'from-violet-400 to-fuchsia-500',
  },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A → Z' },
  { value: 'name_desc', label: 'Name Z → A' },
  { value: 'updated', label: 'Recently updated' },
]

function sortClients(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'name_asc':
      return sorted.sort((a, b) => getClientPrimaryName(a).localeCompare(getClientPrimaryName(b), undefined, { sensitivity: 'base' }))
    case 'name_desc':
      return sorted.sort((a, b) => getClientPrimaryName(b).localeCompare(getClientPrimaryName(a), undefined, { sensitivity: 'base' }))
    case 'updated':
      return sorted.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

const emptyForm = {
  client_type: 'individual',
  full_name: '',
  company_name: '',
  email: '',
  phone: '',
  nationality: '',
  passport_number: '',
  date_of_birth: '',
  notes: '',
}

function getClientPrimaryName(client) {
  return formatClientName(client)
}

function getClientSecondaryLine(client) {
  if (client.client_type === 'business' && client.full_name) {
    return `Contact: ${client.full_name}`
  }
  return client.email || '—'
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

function getClientInitials(client) {
  const name = getClientPrimaryName(client)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function ClientAvatar({ client }) {
  const isCorporate = client.client_type === 'business'
  return (
    <div className="relative shrink-0">
      <div className={`absolute inset-0 rounded-full blur-[3px] ${isCorporate ? 'bg-violet-400/30' : 'bg-teal-400/30'}`} />
      <div
        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white ${
          isCorporate
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-700'
            : 'bg-gradient-to-br from-teal-600 to-sky-700'
        }`}
      >
        {getClientInitials(client)}
      </div>
    </div>
  )
}

function ClientTypeBadge({ type }) {
  const clientType = type || 'individual'
  const isCorporate = clientType === 'business'
  const Icon = isCorporate ? Building2 : User
  const label = labelFor(CLIENT_TYPES, clientType)

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
        isCorporate
          ? 'border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-white text-violet-800'
          : 'border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-white text-teal-800'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
          isCorporate
            ? 'bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm shadow-violet-900/20'
            : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shadow-teal-900/20'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </span>
  )
}

function FilterField({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-teal-600" />
        {label}
      </label>
      {children}
    </div>
  )
}

export default function Clients() {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const navigate = useNavigate()
  const [allClients, setAllClients] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isBusiness = form.client_type === 'business'

  useEffect(() => {
    loadClients()
  }, [search])

  async function loadClients() {
    try {
      setLoading(true)
      const data = await getClients(search)
      setAllClients(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd(clientType = typeFilter || 'individual') {
    setEditing(null)
    setForm({ ...emptyForm, client_type: clientType || 'individual' })
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({
      client_type: client.client_type || 'individual',
      full_name: client.full_name || '',
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      nationality: client.nationality || '',
      passport_number: client.passport_number || '',
      date_of_birth: client.date_of_birth || '',
      notes: client.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (isBusiness && !form.company_name.trim()) {
      alert('Please enter the company name')
      return
    }
    if (!form.full_name.trim()) {
      alert(isBusiness ? 'Please enter the contact person name' : 'Please enter the client name')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        company_name: isBusiness ? form.company_name.trim() : null,
        passport_number: isBusiness ? null : form.passport_number || null,
        date_of_birth: isBusiness ? null : form.date_of_birth || null,
      }

      if (editing) {
        await updateClient(editing.id, payload)
      } else {
        const created = await createClient(payload, user.id, agency?.id)
        notifySlack(session, 'client_created', {
          full_name: formatClientName(created),
          email: created.email || '—',
          phone: created.phone || '—',
        })
      }
      setModalOpen(false)
      loadClients()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(client) {
    const name = getClientPrimaryName(client)
    if (!confirm(`Delete client "${name}"?`)) return
    try {
      await deleteClient(client.id)
      loadClients()
    } catch (err) {
      alert(err.message)
    }
  }

  const counts = useMemo(() => {
    const individual = allClients.filter((c) => (c.client_type || 'individual') === 'individual').length
    const business = allClients.filter((c) => c.client_type === 'business').length
    const nationalities = new Set(allClients.map((c) => c.nationality?.trim()).filter(Boolean)).size
    return { all: allClients.length, individual, business, nationalities }
  }, [allClients])

  const nationalityOptions = useMemo(() => {
    const values = [...new Set(allClients.map((c) => c.nationality?.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
    return [{ value: '', label: 'All nationalities' }, ...values.map((n) => ({ value: n, label: n }))]
  }, [allClients])

  const clients = useMemo(() => {
    let result = typeFilter
      ? allClients.filter((client) => (client.client_type || 'individual') === typeFilter)
      : allClients

    if (nationalityFilter) {
      result = result.filter((client) => client.nationality === nationalityFilter)
    }

    return sortClients(result, sortBy)
  }, [allClients, typeFilter, nationalityFilter, sortBy])

  const columns = [
    {
      key: 'client_type',
      label: 'Type',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Building2} label="Type" accent="violet" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <ClientTypeBadge type={row.client_type} />,
    },
    {
      key: 'name',
      label: 'Customer',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={UserCircle} label="Customer" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <div className="flex min-w-[10rem] items-center gap-3">
          <ClientAvatar client={row} />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-slate-900">{getClientPrimaryName(row)}</p>
            <p className="truncate text-xs text-slate-500">{getClientSecondaryLine(row)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Phone} label="Phone" accent="teal" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => (
        <span className={row.phone ? 'font-medium tabular-nums text-slate-800' : 'text-slate-400'}>
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'nationality',
      label: 'Nationality',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={Globe} label="Nationality" accent="sky" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => (
        row.nationality ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-xs font-medium text-sky-800">
            <Globe className="h-3 w-3 text-sky-500" />
            {row.nationality}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Added',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden xl:table-cell`,
      headerRender: () => <LeadTableHeader icon={Sparkles} label="Added" accent="amber" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden xl:table-cell`,
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-[1%] whitespace-nowrap`,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} w-[1%] whitespace-nowrap`,
      render: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            aria-label="Edit client"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete client"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

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
              Client directory
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Clients</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Organise individual travellers and corporate accounts — your single source of truth for every booking
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => openAdd('individual')}
              className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
            >
              <User className="h-4 w-4" /> Add Individual
            </Button>
            <Button onClick={() => openAdd('business')} className="shadow-lg shadow-violet-900/30">
              <Building2 className="h-4 w-4" /> Add Corporate
            </Button>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total clients', value: counts.all, icon: Users },
            { label: 'Individuals', value: counts.individual, icon: User },
            { label: 'Corporate', value: counts.business, icon: Building2 },
            { label: 'Nationalities', value: counts.nationalities, icon: Globe },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-teal-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Type tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPE_TABS.map((tab) => {
            const { id, label, icon: Icon, activeClass, iconActive, countActive, accent } = tab
            const count = id === 'individual' ? counts.individual : id === 'business' ? counts.business : counts.all
            const active = typeFilter === id
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`group relative flex items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-300 sm:flex-col sm:items-center sm:justify-center sm:text-center ${
                  active
                    ? activeClass
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-md'
                }`}
              >
                {active && (
                  <span className={`absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r ${accent}`} />
                )}
                <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      active
                        ? `${iconActive} scale-105`
                        : 'bg-slate-100 text-slate-500 group-hover:scale-105 group-hover:bg-slate-200 group-hover:text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-sm font-bold tracking-tight ${active ? '' : 'text-slate-700'}`}>
                    {label}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tabular-nums transition-all duration-300 sm:mt-1 ${
                    active
                      ? countActive
                      : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search & filters</p>
              <p className="text-xs text-slate-500">Find clients by name, nationality, or sort order</p>
            </div>
          </div>
          <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold tabular-nums text-teal-800">
            {clients.length} of {counts.all} shown
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_200px_200px]">
            <FilterField label="Search" icon={Search}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, company, email, phone, passport..."
                  className={`${fieldClass} pl-10 pr-4`}
                />
              </div>
            </FilterField>

            <FilterField label="Sort by" icon={ArrowUpDown}>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`${fieldClass} pl-3 pr-9`}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </FilterField>

            <FilterField label="Nationality" icon={Globe}>
              <div className="relative">
                <select
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className={`${fieldClass} pl-3 pr-9`}
                >
                  {nationalityOptions.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </FilterField>
          </div>
        </div>

        {(search || sortBy !== 'newest' || nationalityFilter || typeFilter) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            {typeFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80">
                {TYPE_TABS.find((t) => t.id === typeFilter)?.label}
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80">
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
              </span>
            )}
            {nationalityFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80">
                {nationalityFilter}
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80">
                &quot;{search}&quot;
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSortBy('newest')
                setNationalityFilter('')
                setTypeFilter('')
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">Loading your client directory…</p>
        </div>
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={
            typeFilter === 'business'
              ? 'Corporate accounts'
              : typeFilter === 'individual'
                ? 'Individual travellers'
                : 'All clients'
          }
          captionCount={`${clients.length} shown`}
          columns={columns}
          data={clients}
          onRowClick={(row) => navigate(`/clients/${row.id}`)}
          emptyMessage={
            typeFilter === 'business'
              ? 'No corporate clients yet. Add a company account to get started.'
              : typeFilter === 'individual'
                ? 'No individual clients yet. Add a personal traveller to get started.'
                : 'No clients yet. Add your first client to get started.'
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Client' : isBusiness ? 'Add Corporate Client' : 'Add Individual Client'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Select
            label="Client Type *"
            value={form.client_type}
            onChange={(e) => setForm({ ...form, client_type: e.target.value })}
            options={CLIENT_TYPES}
          />

          {isBusiness ? (
            <>
              <Input
                label="Company Name *"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. Acme Travel Ltd"
              />
              <Input
                label="Contact Person *"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Maria Papadopoulos"
              />
            </>
          ) : (
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          )}

          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />

          {!isBusiness && (
            <>
              <Input label="Passport Number" value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} />
              <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
