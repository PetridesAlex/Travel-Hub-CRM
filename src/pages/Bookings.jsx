import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, CalendarCheck, Wallet, AlertTriangle,
  Plane, Search, ArrowUpDown, ChevronDown, Loader2, CheckCircle2,
  Sparkles, SlidersHorizontal, MoreHorizontal, User, Calendar,
  CalendarClock, Flag, Ban, Luggage,
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
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const STATUS_TABS = [
  {
    id: '',
    label: 'All Bookings',
    icon: Luggage,
    tab: {
      activeClass: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-indigo-50/40 text-teal-900 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/15',
      iconActive: 'bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-900/20',
      countActive: 'bg-teal-600 text-white shadow-sm',
      accent: 'from-teal-400 to-indigo-500',
    },
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: AlertTriangle,
    tab: {
      activeClass: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 text-amber-900 shadow-md shadow-amber-900/5 ring-1 ring-amber-500/15',
      iconActive: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/20',
      countActive: 'bg-amber-600 text-white shadow-sm',
      accent: 'from-amber-400 to-orange-500',
    },
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    icon: CheckCircle2,
    tab: {
      activeClass: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-900 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/15',
      iconActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20',
      countActive: 'bg-emerald-600 text-white shadow-sm',
      accent: 'from-emerald-400 to-teal-500',
    },
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: CalendarCheck,
    tab: {
      activeClass: 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-400/15',
      iconActive: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-md shadow-slate-900/20',
      countActive: 'bg-slate-600 text-white shadow-sm',
      accent: 'from-slate-400 to-slate-600',
    },
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: Ban,
    tab: {
      activeClass: 'border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-red-50/30 text-rose-900 shadow-md shadow-rose-900/5 ring-1 ring-rose-500/15',
      iconActive: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-900/20',
      countActive: 'bg-rose-600 text-white shadow-sm',
      accent: 'from-rose-400 to-red-500',
    },
  },
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

function getStatusTab(statusId) {
  return STATUS_TABS.find((t) => t.id === statusId)?.tab || STATUS_TABS[0].tab
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
  if (days < 0) return { label: 'Overdue', className: 'bg-rose-50 text-rose-700 ring-rose-100' }
  if (days <= 7) return { label: `Due in ${days}d`, className: 'bg-amber-50 text-amber-700 ring-amber-100' }
  return null
}

function isPaymentOverdue(booking) {
  const urgency = getDueUrgency(booking.due_date, booking.balance_due)
  return urgency?.label === 'Overdue'
}

function BookingStatusBadge({ status }) {
  const label = labelFor(BOOKING_STATUSES, status)
  return (
    <span className={`inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold shadow-sm ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {label}
    </span>
  )
}

function PaymentCell({ total, paid, balance }) {
  const totalNum = Number(total) || 0
  const paidNum = Number(paid) || 0
  const pct = totalNum > 0 ? Math.min(100, Math.round((paidNum / totalNum) * 100)) : 0

  return (
    <div className="min-w-[9rem]">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{formatCurrency(paidNum)} paid</span>
        <span className="font-semibold tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50">
        <div
          className={`h-full rounded-full transition-all ${balance > 0 ? 'bg-gradient-to-r from-teal-400 to-teal-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
        {balance > 0 ? `${formatCurrency(balance)} due` : 'Fully paid'}
      </p>
    </div>
  )
}

function BookingsEmptyState({ statusFilter, onAdd }) {
  const statusLabel = statusFilter ? labelFor(BOOKING_STATUSES, statusFilter) : null
  const Icon = statusFilter === 'cancelled' ? Ban : statusFilter === 'completed' ? CalendarCheck : Luggage

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-teal-200/80 bg-gradient-to-b from-teal-50/60 via-white to-indigo-50/40 px-6 py-16 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-lg shadow-teal-900/25 ring-4 ring-white">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">
        {statusLabel ? `No ${statusLabel.toLowerCase()} bookings` : 'Your booking pipeline starts here'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {statusLabel
          ? `No bookings with status "${statusLabel}" yet. Create one or adjust your filters.`
          : 'Track reservations, payment progress, and departures — convert quotes into confirmed trips.'}
      </p>
      <Button onClick={onAdd} className="mt-6 shadow-lg shadow-teal-900/20">
        <Plus className="h-4 w-4" />
        Add your first booking
      </Button>
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
      setLoading(true)
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
    const overdue = bookings.filter((b) => isPaymentOverdue(b)).length
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

  const activeTabStyle = getStatusTab(statusFilter)
  const filterLabel = STATUS_TABS.find((t) => t.id === statusFilter)?.label || 'All Bookings'

  const columns = [
    {
      key: 'booking_reference',
      label: 'Booking',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Luggage} label="Booking" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <div className="flex min-w-[10rem] items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-indigo-700 font-mono text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
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
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={User} label="Client" accent="teal" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-[10px] font-bold text-white ring-2 ring-white">
            {getClientInitials(row.clients)}
          </div>
          <span className="font-medium text-slate-800">{formatClientName(row.clients)}</span>
        </div>
      ),
    },
    {
      key: 'travel',
      label: 'Travel',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Plane} label="Travel" accent="sky" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => (
        row.travel_start_date ? (
          <div className="flex items-center gap-2 text-sm">
            <Plane className="h-3.5 w-3.5 shrink-0 text-sky-500" />
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
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Wallet} label="Payment" accent="emerald" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <PaymentCell total={row.total_cost} paid={row.amount_paid} balance={row.balance_due} />
      ),
    },
    {
      key: 'due_date',
      label: 'Due',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={CalendarClock} label="Due" accent="amber" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => {
        const urgency = getDueUrgency(row.due_date, row.balance_due)
        return (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              {formatDate(row.due_date)}
            </p>
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
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Flag} label="Status" accent="violet" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <BookingStatusBadge status={row.status} />,
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
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">
              <Sparkles className="h-3.5 w-3.5" />
              Reservations & payments
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Bookings</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Track reservations, payment progress, and departures — from quote to confirmed trip
            </p>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-lg shadow-teal-900/30">
            <Plus className="h-4 w-4" /> Add Booking
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total bookings', value: stats.total, sub: `${stats.confirmed} confirmed`, icon: Luggage },
            { label: 'Outstanding', value: formatCurrency(stats.outstanding), sub: 'Balance due', icon: Wallet },
            { label: 'Pending', value: stats.pending, sub: 'Awaiting confirmation', icon: AlertTriangle },
            { label: 'Overdue', value: stats.overdue, sub: 'Payments past due', icon: CalendarClock },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-teal-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(({ id, label, icon: Icon, tab }) => {
            const count = id ? statusCounts[id] : statusCounts.all
            const active = statusFilter === id
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`group relative flex min-w-[7rem] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all duration-300 sm:min-w-[8rem] sm:px-4 sm:py-3.5 ${
                  active
                    ? tab.activeClass
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-md'
                }`}
              >
                {active && (
                  <span className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r ${tab.accent}`} />
                )}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    active
                      ? `${tab.iconActive} scale-105`
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
                    active ? tab.countActive : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search & sort</p>
              <p className="text-xs text-slate-500">Find bookings by reference, client, or supplier</p>
            </div>
          </div>
          <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold tabular-nums text-teal-800">
            {filteredBookings.length} of {bookings.length} shown
          </span>
        </div>
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
        {(search || statusFilter) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            {statusFilter && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${activeTabStyle.activeClass}`}>
                {labelFor(BOOKING_STATUSES, statusFilter)}
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80">
                &quot;{search}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">Loading bookings…</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <BookingsEmptyState statusFilter={statusFilter} onAdd={openAdd} />
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={filterLabel}
          captionCount={`${filteredBookings.length} shown`}
          columns={columns}
          data={filteredBookings}
          getRowClassName={(row) => (isPaymentOverdue(row) ? 'bg-rose-50/40' : '')}
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
          <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-white px-4 py-3 text-sm font-semibold text-teal-800">
            Estimated balance due: {formatCurrency(estimatedBalance)}
          </div>
          <Input label="Payment Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={BOOKING_STATUSES} />
        </div>
      </Modal>
    </div>
  )
}
