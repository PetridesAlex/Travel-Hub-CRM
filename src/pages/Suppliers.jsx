import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, Building2, Plane, Ship, Car, Shield, Globe,
  Search, ArrowUpDown, ChevronDown, Loader2, Briefcase, Mail, Phone, User,
  Sparkles, MoreHorizontal, Truck, SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/suppliers'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { SUPPLIER_TYPES } from '../constants/enums'
import { labelFor, formatDateTime } from '../utils/format'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const TYPE_ICONS = {
  hotel: Building2,
  airline: Plane,
  cruise: Ship,
  dmc: Globe,
  transfer: Car,
  insurance: Shield,
  other: Briefcase,
}

const TYPE_STYLES = {
  hotel: {
    gradient: 'from-violet-500 to-violet-700',
    badge: 'border-violet-200/80 bg-gradient-to-r from-violet-50 to-white text-violet-800',
    tab: {
      activeClass: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 text-violet-900 shadow-md shadow-violet-900/5 ring-1 ring-violet-500/15',
      iconActive: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-900/20',
      countActive: 'bg-violet-600 text-white shadow-sm',
      accent: 'from-violet-400 to-fuchsia-500',
    },
  },
  airline: {
    gradient: 'from-sky-500 to-sky-700',
    badge: 'border-sky-200/80 bg-gradient-to-r from-sky-50 to-white text-sky-800',
    tab: {
      activeClass: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-blue-50/30 text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-500/15',
      iconActive: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-900/20',
      countActive: 'bg-sky-600 text-white shadow-sm',
      accent: 'from-sky-400 to-blue-500',
    },
  },
  cruise: {
    gradient: 'from-blue-500 to-indigo-700',
    badge: 'border-blue-200/80 bg-gradient-to-r from-blue-50 to-white text-blue-800',
    tab: {
      activeClass: 'border-blue-200/90 bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 text-blue-900 shadow-md shadow-blue-900/5 ring-1 ring-blue-500/15',
      iconActive: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-900/20',
      countActive: 'bg-blue-600 text-white shadow-sm',
      accent: 'from-blue-400 to-indigo-500',
    },
  },
  dmc: {
    gradient: 'from-teal-500 to-teal-700',
    badge: 'border-teal-200/80 bg-gradient-to-r from-teal-50 to-white text-teal-800',
    tab: {
      activeClass: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-emerald-50/30 text-teal-900 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/15',
      iconActive: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-900/20',
      countActive: 'bg-teal-600 text-white shadow-sm',
      accent: 'from-teal-400 to-emerald-500',
    },
  },
  transfer: {
    gradient: 'from-amber-500 to-orange-600',
    badge: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-white text-amber-800',
    tab: {
      activeClass: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 text-amber-900 shadow-md shadow-amber-900/5 ring-1 ring-amber-500/15',
      iconActive: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/20',
      countActive: 'bg-amber-600 text-white shadow-sm',
      accent: 'from-amber-400 to-orange-500',
    },
  },
  insurance: {
    gradient: 'from-emerald-500 to-emerald-700',
    badge: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-800',
    tab: {
      activeClass: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-900 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/15',
      iconActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20',
      countActive: 'bg-emerald-600 text-white shadow-sm',
      accent: 'from-emerald-400 to-teal-500',
    },
  },
  other: {
    gradient: 'from-slate-500 to-slate-700',
    badge: 'border-slate-200/80 bg-gradient-to-r from-slate-50 to-white text-slate-700',
    tab: {
      activeClass: 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-400/15',
      iconActive: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-md shadow-slate-900/20',
      countActive: 'bg-slate-600 text-white shadow-sm',
      accent: 'from-slate-400 to-slate-600',
    },
  },
}

const ALL_TAB_STYLE = {
  activeClass: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-violet-50/40 text-indigo-900 shadow-md shadow-indigo-900/5 ring-1 ring-indigo-500/15',
  iconActive: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/20',
  countActive: 'bg-indigo-600 text-white shadow-sm',
  accent: 'from-indigo-400 to-violet-500',
}

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A → Z' },
  { value: 'name_desc', label: 'Name Z → A' },
  { value: 'type', label: 'By type' },
  { value: 'newest', label: 'Recently added' },
]

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

const emptyForm = {
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  supplier_type: 'other',
  notes: '',
}

function getCompanyInitials(name) {
  const parts = (name || '').split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (name || 'SP').slice(0, 2).toUpperCase()
}

function getTabStyle(typeId) {
  if (!typeId) return ALL_TAB_STYLE
  return TYPE_STYLES[typeId]?.tab || TYPE_STYLES.other.tab
}

function SupplierTypeBadge({ type }) {
  const supplierType = type || 'other'
  const Icon = TYPE_ICONS[supplierType] || Briefcase
  const style = TYPE_STYLES[supplierType] || TYPE_STYLES.other
  const label = labelFor(SUPPLIER_TYPES, supplierType)

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${style.badge}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} text-white shadow-sm`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </span>
  )
}

function SupplierAvatar({ supplier }) {
  const style = TYPE_STYLES[supplier.supplier_type] || TYPE_STYLES.other
  return (
    <div className="relative shrink-0">
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${style.gradient} opacity-30 blur-[3px]`} />
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-xs font-bold text-white shadow-sm ring-2 ring-white`}>
        {getCompanyInitials(supplier.company_name)}
      </div>
    </div>
  )
}

function SuppliersEmptyState({ typeFilter, onAdd }) {
  const typeLabel = typeFilter ? labelFor(SUPPLIER_TYPES, typeFilter) : null
  const Icon = typeFilter ? (TYPE_ICONS[typeFilter] || Briefcase) : Truck

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-indigo-200/80 bg-gradient-to-b from-indigo-50/60 via-white to-violet-50/40 px-6 py-16 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-8 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-8 h-28 w-28 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/25 ring-4 ring-white">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">
        {typeLabel ? `No ${typeLabel.toLowerCase()} suppliers yet` : 'Build your supplier network'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {typeLabel
          ? `Add your first ${typeLabel.toLowerCase()} partner to manage contacts, rates, and bookings in one place.`
          : 'Add hotels, airlines, cruise lines, DMCs, and transfer partners — your trusted network for every itinerary.'}
      </p>
      <Button onClick={onAdd} className="mt-6 shadow-lg shadow-indigo-900/20">
        <Plus className="h-4 w-4" />
        {typeLabel ? `Add ${typeLabel} supplier` : 'Add your first supplier'}
      </Button>
    </div>
  )
}

function sortSuppliers(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'name_desc':
      return sorted.sort((a, b) => (b.company_name || '').localeCompare(a.company_name || '', undefined, { sensitivity: 'base' }))
    case 'type':
      return sorted.sort((a, b) => (a.supplier_type || '').localeCompare(b.supplier_type || ''))
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    case 'name_asc':
    default:
      return sorted.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', undefined, { sensitivity: 'base' }))
  }
}

export default function Suppliers() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [allSuppliers, setAllSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('name_asc')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    try {
      setLoading(true)
      const data = await getSuppliers()
      setAllSuppliers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd(type = typeFilter || 'hotel') {
    setEditing(null)
    setForm({ ...emptyForm, supplier_type: type || 'hotel' })
    setModalOpen(true)
  }

  function openEdit(supplier) {
    setEditing(supplier)
    setForm({
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      supplier_type: supplier.supplier_type || 'other',
      notes: supplier.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.company_name.trim()) {
      alert('Please enter the company name')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateSupplier(editing.id, form)
      } else {
        await createSupplier(form, user.id, agency?.id)
      }
      setModalOpen(false)
      loadSuppliers()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(supplier) {
    if (!confirm(`Delete supplier "${supplier.company_name}"?`)) return
    try {
      await deleteSupplier(supplier.id)
      loadSuppliers()
    } catch (err) {
      alert(err.message)
    }
  }

  const typeCounts = useMemo(() => {
    const counts = { all: allSuppliers.length }
    SUPPLIER_TYPES.forEach((t) => {
      counts[t.value] = allSuppliers.filter((s) => (s.supplier_type || 'other') === t.value).length
    })
    return counts
  }, [allSuppliers])

  const suppliers = useMemo(() => {
    let result = typeFilter
      ? allSuppliers.filter((s) => (s.supplier_type || 'other') === typeFilter)
      : allSuppliers

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) =>
        s.company_name?.toLowerCase().includes(q)
        || s.contact_person?.toLowerCase().includes(q)
        || s.email?.toLowerCase().includes(q)
        || s.phone?.toLowerCase().includes(q),
      )
    }

    return sortSuppliers(result, sortBy)
  }, [allSuppliers, typeFilter, search, sortBy])

  const typeTabs = [
    { id: '', label: 'All', icon: Briefcase },
    ...SUPPLIER_TYPES.map((t) => ({ id: t.value, label: t.label, icon: TYPE_ICONS[t.value] || Briefcase })),
  ]

  const columns = [
    {
      key: 'company_name',
      label: 'Company',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Building2} label="Company" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <div className="flex min-w-[10rem] items-center gap-3">
          <SupplierAvatar supplier={row} />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-slate-900">{row.company_name}</p>
            {row.contact_person && (
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <User className="h-3 w-3 shrink-0" />
                {row.contact_person}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Mail} label="Contact" accent="sky" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => (
        <div className="space-y-1 text-sm">
          {row.email ? (
            <p className="flex items-center gap-1.5 font-medium text-slate-800">
              <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span className="truncate">{row.email}</span>
            </p>
          ) : (
            <p className="text-slate-400">—</p>
          )}
          {row.phone && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              {row.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'supplier_type',
      label: 'Type',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Truck} label="Type" accent="violet" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <SupplierTypeBadge type={row.supplier_type} />,
    },
    {
      key: 'created_at',
      label: 'Added',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={Sparkles} label="Added" accent="amber" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.created_at ? formatDateTime(row.created_at) : '—'}
        </span>
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
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Edit supplier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete supplier"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const activeTabStyle = getTabStyle(typeFilter)

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" />
              Partner network
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Suppliers</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Manage hotels, airlines, cruise lines, DMCs, and transfer partners — your trusted supply chain
            </p>
          </div>
          <Button onClick={() => openAdd()} className="shrink-0 shadow-lg shadow-indigo-900/30">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total partners', value: typeCounts.all, icon: Briefcase },
            { label: 'Hotels', value: typeCounts.hotel || 0, icon: Building2 },
            { label: 'Airlines', value: typeCounts.airline || 0, icon: Plane },
            { label: 'Cruise lines', value: typeCounts.cruise || 0, icon: Ship },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-indigo-200/80">
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {typeTabs.map(({ id, label, icon: Icon }) => {
            const count = id ? typeCounts[id] : typeCounts.all
            const active = typeFilter === id
            const tabStyle = getTabStyle(id)
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`group relative flex min-w-[7.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all duration-300 sm:min-w-[8.5rem] sm:px-4 sm:py-3.5 ${
                  active
                    ? tabStyle.activeClass
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-md'
                }`}
              >
                {active && (
                  <span className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r ${tabStyle.accent}`} />
                )}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    active
                      ? `${tabStyle.iconActive} scale-105`
                      : 'bg-slate-100 text-slate-500 group-hover:scale-105 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={`text-center text-xs font-bold tracking-tight sm:text-sm ${active ? '' : 'text-slate-700'}`}>
                  {label}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums transition-all ${
                    active ? tabStyle.countActive : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & sort */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search & filters</p>
              <p className="text-xs text-slate-500">Find partners by company, contact, or email</p>
            </div>
          </div>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold tabular-nums text-indigo-800">
            {suppliers.length} of {typeCounts.all} shown
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Search className="h-3.5 w-3.5 text-indigo-600" />
              Search suppliers
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Company, contact, email, or phone..."
                className={`${fieldClass} pl-10 pr-4`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
              Sort by
            </label>
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
          </div>
        </div>
        {(search || typeFilter) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            {typeFilter && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${activeTabStyle.activeClass}`}>
                {labelFor(SUPPLIER_TYPES, typeFilter)}
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 ring-1 ring-indigo-200/80">
                &quot;{search}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading your supplier network…</p>
        </div>
      ) : suppliers.length === 0 ? (
        <SuppliersEmptyState typeFilter={typeFilter} onAdd={() => openAdd(typeFilter || 'hotel')} />
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={
            typeFilter
              ? `${labelFor(SUPPLIER_TYPES, typeFilter)} suppliers`
              : 'All suppliers'
          }
          captionCount={`${suppliers.length} shown`}
          columns={columns}
          data={suppliers}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Company Name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Supplier Type" value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value })} options={SUPPLIER_TYPES} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
