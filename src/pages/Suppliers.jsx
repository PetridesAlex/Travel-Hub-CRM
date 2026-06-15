import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, Building2, Plane, Ship, Car, Shield, Globe,
  Search, ArrowUpDown, ChevronDown, Loader2, Briefcase, Mail, Phone, User,
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
import { labelFor } from '../utils/format'

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
  hotel: { gradient: 'from-violet-400 to-violet-700', badge: 'border-violet-200/80 bg-gradient-to-r from-violet-50 to-white text-violet-800' },
  airline: { gradient: 'from-sky-400 to-sky-700', badge: 'border-sky-200/80 bg-gradient-to-r from-sky-50 to-white text-sky-800' },
  cruise: { gradient: 'from-blue-400 to-blue-700', badge: 'border-blue-200/80 bg-gradient-to-r from-blue-50 to-white text-blue-800' },
  dmc: { gradient: 'from-teal-400 to-teal-700', badge: 'border-teal-200/80 bg-gradient-to-r from-teal-50 to-white text-teal-800' },
  transfer: { gradient: 'from-amber-400 to-amber-700', badge: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-white text-amber-800' },
  insurance: { gradient: 'from-emerald-400 to-emerald-700', badge: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-800' },
  other: { gradient: 'from-slate-500 to-slate-700', badge: 'border-slate-200/80 bg-gradient-to-r from-slate-50 to-white text-slate-700' },
}

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A → Z' },
  { value: 'name_desc', label: 'Name Z → A' },
  { value: 'type', label: 'By type' },
  { value: 'newest', label: 'Recently added' },
]

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

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

  const stats = useMemo(() => ({
    total: allSuppliers.length,
    hotels: typeCounts.hotel || 0,
    airlines: typeCounts.airline || 0,
    cruise: typeCounts.cruise || 0,
  }), [allSuppliers.length, typeCounts])

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
      render: (row) => {
        const style = TYPE_STYLES[row.supplier_type] || TYPE_STYLES.other
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${style.gradient} opacity-25 blur-[2px]`} />
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-xs font-bold text-white shadow-sm`}>
                {getCompanyInitials(row.company_name)}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight text-slate-900">{row.company_name}</p>
              {row.contact_person && (
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <User className="h-3 w-3" />
                  {row.contact_person}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'email',
      label: 'Contact',
      render: (row) => (
        <div className="space-y-1 text-sm">
          {row.email ? (
            <p className="flex items-center gap-1.5 font-medium text-slate-800">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{row.email}</span>
            </p>
          ) : (
            <p className="text-slate-400">—</p>
          )}
          {row.phone && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="h-3 w-3 text-slate-400" />
              {row.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'supplier_type',
      label: 'Type',
      render: (row) => <SupplierTypeBadge type={row.supplier_type} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500">Manage hotels, airlines, cruise lines, DMCs, and partners</p>
        </div>
        <Button onClick={() => openAdd()} size="lg">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total suppliers', value: stats.total, sub: 'Active partners', icon: Briefcase, gradient: 'from-teal-400 to-teal-700' },
          { label: 'Hotels', value: stats.hotels, sub: 'Accommodation', icon: Building2, gradient: 'from-violet-400 to-violet-700' },
          { label: 'Airlines', value: stats.airlines, sub: 'Flight partners', icon: Plane, gradient: 'from-sky-400 to-sky-700' },
          { label: 'Cruise lines', value: stats.cruise, sub: 'Cruise partners', icon: Ship, gradient: 'from-blue-400 to-blue-700' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${item.gradient} opacity-10 blur-2xl`} />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Type tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {typeTabs.map(({ id, label, icon: Icon }) => {
            const count = id ? typeCounts[id] : typeCounts.all
            const active = typeFilter === id
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all sm:px-4 sm:py-2.5 ${
                  active
                    ? 'border-teal-200 bg-white text-teal-800 shadow-sm ring-1 ring-teal-500/15'
                    : 'border-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                  active ? 'bg-teal-600 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & sort */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Search className="h-3.5 w-3.5 text-teal-600" />
              Search suppliers
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
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
              <ArrowUpDown className="h-3.5 w-3.5 text-teal-600" />
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
        <p className="mt-3 text-xs text-slate-500">
          Showing {suppliers.length} of {allSuppliers.length} supplier{allSuppliers.length === 1 ? '' : 's'}
          {typeFilter ? ` · ${labelFor(SUPPLIER_TYPES, typeFilter)}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={suppliers}
          emptyMessage={
            typeFilter
              ? `No ${labelFor(SUPPLIER_TYPES, typeFilter).toLowerCase()} suppliers found.`
              : 'No suppliers yet. Add your first partner to get started.'
          }
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
              className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
