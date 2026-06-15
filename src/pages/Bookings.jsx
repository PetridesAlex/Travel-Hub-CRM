import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, CalendarCheck, Wallet, AlertTriangle,
  Plane, Search, ArrowUpDown, ChevronDown, Loader2, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getBookings, createBooking, updateBooking, deleteBooking } from '../services/bookings'
import { getClients } from '../services/clients'
import { getQuotations } from '../services/quotations'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { BOOKING_STATUSES } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor } from '../utils/format'
import { differenceInDays, parseISO } from 'date-fns'

const STATUS_TABS = [
  { id: '', label: 'All Bookings', icon: CalendarCheck },
  { id: 'pending', label: 'Pending', icon: AlertTriangle },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', icon: AlertTriangle },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'departure', label: 'Departure date' },
  { value: 'due_soon', label: 'Payment due soon' },
  { value: 'balance_high', label: 'Highest balance' },
]

const STATUS_STYLES = {
  pending: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-white text-amber-800',
  confirmed: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-800',
  completed: 'border-slate-200/80 bg-gradient-to-r from-slate-50 to-white text-slate-700',
  cancelled: 'border-red-200/80 bg-gradient-to-r from-red-50 to-white text-red-700',
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

const emptyForm = {
  client_id: '',
  quotation_id: '',
  booking_reference: '',
  supplier_name: '',
  travel_start_date: '',
  travel_end_date: '',
  total_cost: '',
  amount_paid: '',
  due_date: '',
  status: 'pending',
}

function getClientInitials(client) {
  const name = formatClientName(client)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getDueUrgency(dueDate, balanceDue) {
  if (!dueDate || balanceDue <= 0) return null
  const days = differenceInDays(parseISO(dueDate), new Date())
  if (days < 0) return { label: 'Overdue', className: 'bg-red-50 text-red-700 ring-red-100' }
  if (days <= 7) return { label: `Due in ${days}d`, className: 'bg-amber-50 text-amber-700 ring-amber-100' }
  return null
}

function BookingStatusBadge({ status }) {
  const label = labelFor(BOOKING_STATUSES, status)
  return (
    <span className={`inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {label}
    </span>
  )
}

function PaymentCell({ total, paid, balance }) {
  const totalNum = Number(total) || 0
  const paidNum = Number(paid) || 0
  const pct = totalNum > 0 ? Math.min(100, Math.round((paidNum / totalNum) * 100)) : 0

  return (
    <div className="min-w-[140px]">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{formatCurrency(paidNum)} paid</span>
        <span className="text-slate-400">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${balance > 0 ? 'bg-gradient-to-r from-teal-400 to-teal-600' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs font-semibold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
        {balance > 0 ? `${formatCurrency(balance)} due` : 'Fully paid'}
      </p>
    </div>
  )
}

function sortBookings(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'departure':
      return sorted.sort((a, b) => {
        const aDate = a.travel_start_date || '9999-99-99'
        const bDate = b.travel_start_date || '9999-99-99'
        return aDate.localeCompare(bDate)
      })
    case 'due_soon':
      return sorted.sort((a, b) => {
        const aDate = a.due_date || '9999-99-99'
        const bDate = b.due_date || '9999-99-99'
        return aDate.localeCompare(bDate)
      })
    case 'balance_high':
      return sorted.sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0))
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }
}

export default function Bookings() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [bookingsData, clientsData, quotesData] = await Promise.all([
        getBookings(),
        getClients(),
        getQuotations(),
      ])
      setBookings(bookingsData)
      setClients(clientsData)
      setQuotations(quotesData.filter((q) => q.status === 'accepted'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(booking) {
    setEditing(booking)
    setForm({
      client_id: booking.client_id || '',
      quotation_id: booking.quotation_id || '',
      booking_reference: booking.booking_reference || '',
      supplier_name: booking.supplier_name || '',
      travel_start_date: booking.travel_start_date || '',
      travel_end_date: booking.travel_end_date || '',
      total_cost: booking.total_cost || '',
      amount_paid: booking.amount_paid || '',
      due_date: booking.due_date || '',
      status: booking.status || 'pending',
    })
    setModalOpen(true)
  }

  function handleQuotationSelect(quotationId) {
    const quote = quotations.find((q) => q.id === quotationId)
    if (quote) {
      setForm((f) => ({
        ...f,
        quotation_id: quotationId,
        client_id: quote.client_id || f.client_id,
        total_cost: quote.selling_price || f.total_cost,
      }))
    } else {
      setForm((f) => ({ ...f, quotation_id: quotationId }))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        quotation_id: form.quotation_id || null,
        total_cost: Number(form.total_cost) || 0,
        amount_paid: Number(form.amount_paid) || 0,
        travel_start_date: form.travel_start_date || null,
        travel_end_date: form.travel_end_date || null,
        due_date: form.due_date || null,
      }
      if (editing) {
        await updateBooking(editing.id, payload)
      } else {
        await createBooking(payload, user.id, agency?.id)
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(booking) {
    if (!confirm('Delete this booking?')) return
    try {
      await deleteBooking(booking.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'Select client' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const quoteOptions = [{ value: '', label: 'No quotation' }, ...quotations.map((q) => ({ value: q.id, label: q.title }))]
  const estimatedBalance = (Number(form.total_cost) || 0) - (Number(form.amount_paid) || 0)

  const stats = useMemo(() => {
    const outstanding = bookings.reduce((sum, b) => sum + Number(b.balance_due || 0), 0)
    const overdue = bookings.filter((b) => {
      const urgency = getDueUrgency(b.due_date, b.balance_due)
      return urgency?.label === 'Overdue'
    }).length
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      outstanding,
      overdue,
      pending: bookings.filter((b) => b.status === 'pending').length,
    }
  }, [bookings])

  const statusCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }), [bookings])

  const filteredBookings = useMemo(() => {
    let result = statusFilter
      ? bookings.filter((b) => b.status === statusFilter)
      : bookings

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((b) => {
        const clientName = formatClientName(b.clients).toLowerCase()
        return (
          b.booking_reference?.toLowerCase().includes(q)
          || clientName.includes(q)
          || b.supplier_name?.toLowerCase().includes(q)
        )
      })
    }

    return sortBookings(result, sortBy)
  }, [bookings, statusFilter, search, sortBy])

  const columns = [
    {
      key: 'booking_reference',
      label: 'Booking',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 font-mono text-[10px] font-bold text-white shadow-sm">
            {(row.booking_reference || 'BK').slice(0, 4).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-slate-900">{row.booking_reference || '—'}</p>
            <p className="truncate text-xs text-slate-500">{row.supplier_name || 'No supplier'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-[10px] font-bold text-white ring-2 ring-white">
            {getClientInitials(row.clients)}
          </div>
          <span className="font-medium text-slate-800">{formatClientName(row.clients)}</span>
        </div>
      ),
    },
    {
      key: 'travel',
      label: 'Travel',
      render: (row) => (
        row.travel_start_date ? (
          <div className="flex items-center gap-2 text-sm">
            <Plane className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            <div>
              <p className="font-medium text-slate-800">{formatDate(row.travel_start_date)}</p>
              {row.travel_end_date && (
                <p className="text-xs text-slate-500">→ {formatDate(row.travel_end_date)}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'payment',
      label: 'Payment',
      render: (row) => (
        <PaymentCell total={row.total_cost} paid={row.amount_paid} balance={row.balance_due} />
      ),
    },
    {
      key: 'due_date',
      label: 'Due',
      render: (row) => {
        const urgency = getDueUrgency(row.due_date, row.balance_due)
        return (
          <div>
            <p className="text-sm font-medium text-slate-800">{formatDate(row.due_date)}</p>
            {urgency && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${urgency.className}`}>
                {urgency.label}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <BookingStatusBadge status={row.status} />,
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
            aria-label="Edit booking"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete booking"
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
          <h2 className="text-xl font-semibold text-slate-900">Bookings</h2>
          <p className="text-sm text-slate-500">Track reservations, payments, and departures</p>
        </div>
        <Button onClick={openAdd} size="lg">
          <Plus className="h-4 w-4" /> Add Booking
        </Button>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total bookings', value: stats.total, sub: `${stats.confirmed} confirmed`, icon: CalendarCheck, gradient: 'from-teal-400 to-teal-700' },
          { label: 'Outstanding', value: formatCurrency(stats.outstanding), sub: 'Balance due', icon: Wallet, gradient: 'from-amber-400 to-amber-700' },
          { label: 'Pending', value: stats.pending, sub: 'Awaiting confirmation', icon: AlertTriangle, gradient: 'from-sky-400 to-sky-700' },
          { label: 'Overdue', value: stats.overdue, sub: 'Payments past due', icon: AlertTriangle, gradient: 'from-red-400 to-red-700' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
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

      {/* Status tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_TABS.map(({ id, label, icon: Icon }) => {
            const count = id ? statusCounts[id] : statusCounts.all
            const active = statusFilter === id
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
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
              Search bookings
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Reference, client, or supplier..."
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
          Showing {filteredBookings.length} of {bookings.length} booking{bookings.length === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredBookings}
          emptyMessage={
            statusFilter
              ? `No ${labelFor(BOOKING_STATUSES, statusFilter).toLowerCase()} bookings found.`
              : 'No bookings yet. Add your first booking to get started.'
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Booking' : 'Add Booking'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clientOptions} />
          <Select label="From Quotation" value={form.quotation_id} onChange={(e) => handleQuotationSelect(e.target.value)} options={quoteOptions} />
          <Input label="Booking Reference" value={form.booking_reference} onChange={(e) => setForm({ ...form, booking_reference: e.target.value })} />
          <Input label="Supplier Name" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Travel Start" type="date" value={form.travel_start_date} onChange={(e) => setForm({ ...form, travel_start_date: e.target.value })} />
            <Input label="Travel End" type="date" value={form.travel_end_date} onChange={(e) => setForm({ ...form, travel_end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total Cost" type="number" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} />
            <Input label="Amount Paid" type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
          </div>
          <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-white px-4 py-3 text-sm font-medium text-teal-800">
            Estimated balance due: {formatCurrency(estimatedBalance)}
          </div>
          <Input label="Payment Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={BOOKING_STATUSES} />
        </div>
      </Modal>
    </div>
  )
}
