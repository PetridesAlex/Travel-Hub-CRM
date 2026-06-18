import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Sparkles, Loader2, SlidersHorizontal,
  Receipt, User, FileText, Calendar, Wallet, CreditCard, Hash, MoreHorizontal,
  Banknote, Building2, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getReceipts, createReceipt, updateReceipt, deleteReceipt } from '../services/receipts'
import { getInvoices } from '../services/invoices'
import { getClients } from '../services/clients'
import { getBookings } from '../services/bookings'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { PAYMENT_METHODS } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor, getTodayISO } from '../utils/format'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  cheque: FileText,
  other: Hash,
}

const METHOD_STYLES = {
  cash: {
    badge: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-white text-amber-800',
    icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    tab: {
      activeClass: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 text-amber-900 shadow-md shadow-amber-900/5 ring-1 ring-amber-500/15',
      iconActive: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/20',
      countActive: 'bg-amber-600 text-white shadow-sm',
      accent: 'from-amber-400 to-orange-500',
    },
  },
  card: {
    badge: 'border-violet-200/80 bg-gradient-to-r from-violet-50 to-white text-violet-800',
    icon: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white',
    tab: {
      activeClass: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-indigo-50/30 text-violet-900 shadow-md shadow-violet-900/5 ring-1 ring-violet-500/15',
      iconActive: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/20',
      countActive: 'bg-violet-600 text-white shadow-sm',
      accent: 'from-violet-400 to-indigo-500',
    },
  },
  bank_transfer: {
    badge: 'border-sky-200/80 bg-gradient-to-r from-sky-50 to-white text-sky-800',
    icon: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
    tab: {
      activeClass: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-blue-50/30 text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-500/15',
      iconActive: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-900/20',
      countActive: 'bg-sky-600 text-white shadow-sm',
      accent: 'from-sky-400 to-blue-500',
    },
  },
  cheque: {
    badge: 'border-teal-200/80 bg-gradient-to-r from-teal-50 to-white text-teal-800',
    icon: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
    tab: {
      activeClass: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-emerald-50/30 text-teal-900 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/15',
      iconActive: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-900/20',
      countActive: 'bg-teal-600 text-white shadow-sm',
      accent: 'from-teal-400 to-emerald-500',
    },
  },
  other: {
    badge: 'border-slate-200/80 bg-gradient-to-r from-slate-50 to-white text-slate-700',
    icon: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white',
    tab: {
      activeClass: 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-400/15',
      iconActive: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-md shadow-slate-900/20',
      countActive: 'bg-slate-600 text-white shadow-sm',
      accent: 'from-slate-400 to-slate-600',
    },
  },
}

const ALL_TAB_STYLE = {
  activeClass: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 text-emerald-900 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/15',
  iconActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20',
  countActive: 'bg-emerald-600 text-white shadow-sm',
  accent: 'from-emerald-400 to-teal-500',
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-emerald-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'

const emptyForm = {
  receipt_number: '',
  invoice_id: '',
  client_id: '',
  booking_id: '',
  payment_date: getTodayISO(),
  amount: '',
  currency: 'EUR',
  payment_method: 'bank_transfer',
  reference: '',
  notes: '',
}

function generateReceiptNumber() {
  const date = new Date()
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const suffix = String(date.getTime()).slice(-4)
  return `RCP-${stamp}-${suffix}`
}

function getMethodStyle(method) {
  return METHOD_STYLES[method] || METHOD_STYLES.other
}

function getTabStyle(methodId) {
  if (!methodId) return ALL_TAB_STYLE
  return getMethodStyle(methodId).tab
}

function PaymentMethodBadge({ method }) {
  const key = method || 'other'
  const Icon = METHOD_ICONS[key] || Hash
  const style = getMethodStyle(key)
  const label = labelFor(PAYMENT_METHODS, key)

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${style.badge}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${style.icon} shadow-sm`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </span>
  )
}

function ReceiptsEmptyState({ onAdd }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-emerald-200/80 bg-gradient-to-b from-emerald-50/60 via-white to-teal-50/40 px-6 py-16 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/25 ring-4 ring-white">
        <Receipt className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">No receipts recorded yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Log payments received from clients — cash, card, bank transfer, or cheque — and keep your accounts in sync.
      </p>
      <Button onClick={onAdd} className="mt-6 shadow-lg shadow-emerald-900/20">
        <Plus className="h-4 w-4" />
        Record first payment
      </Button>
    </div>
  )
}

export default function Receipts() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [allReceipts, setAllReceipts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [receiptsData, invoicesData, clientsData, bookingsData] = await Promise.all([
        getReceipts(),
        getInvoices(),
        getClients(),
        getBookings(),
      ])
      setAllReceipts(receiptsData)
      setInvoices(invoicesData)
      setClients(clientsData)
      setBookings(bookingsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const methodCounts = useMemo(() => {
    const counts = { all: allReceipts.length }
    PAYMENT_METHODS.forEach((m) => {
      counts[m.value] = allReceipts.filter((r) => r.payment_method === m.value).length
    })
    return counts
  }, [allReceipts])

  const stats = useMemo(() => {
    const totalReceived = allReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const thisMonth = allReceipts.filter((r) => {
      if (!r.payment_date) return false
      const d = new Date(r.payment_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((sum, r) => sum + Number(r.amount || 0), 0)
    return { totalReceived, thisMonth, count: allReceipts.length }
  }, [allReceipts])

  const receipts = useMemo(() => {
    let result = methodFilter
      ? allReceipts.filter((r) => r.payment_method === methodFilter)
      : allReceipts

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        r.receipt_number?.toLowerCase().includes(q)
        || r.reference?.toLowerCase().includes(q)
        || r.notes?.toLowerCase().includes(q)
        || formatClientName(r.clients).toLowerCase().includes(q),
      )
    }

    return result
  }, [allReceipts, methodFilter, search])

  const methodTabs = [
    { id: '', label: 'All methods', icon: Wallet },
    ...PAYMENT_METHODS.map((m) => ({ id: m.value, label: m.label, icon: METHOD_ICONS[m.value] || Hash })),
  ]

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, receipt_number: generateReceiptNumber(), payment_date: getTodayISO() })
    setModalOpen(true)
  }

  function openEdit(receipt) {
    setEditing(receipt)
    setForm({
      receipt_number: receipt.receipt_number || '',
      invoice_id: receipt.invoice_id || '',
      client_id: receipt.client_id || '',
      booking_id: receipt.booking_id || '',
      payment_date: receipt.payment_date || '',
      amount: receipt.amount ?? '',
      currency: receipt.currency || 'EUR',
      payment_method: receipt.payment_method || 'bank_transfer',
      reference: receipt.reference || '',
      notes: receipt.notes || '',
    })
    setModalOpen(true)
  }

  function handleInvoiceSelect(invoiceId) {
    const invoice = invoices.find((inv) => inv.id === invoiceId)
    if (invoice) {
      setForm((f) => ({
        ...f,
        invoice_id: invoiceId,
        client_id: invoice.client_id || f.client_id,
        booking_id: invoice.booking_id || f.booking_id,
        amount: invoice.total_amount || f.amount,
        currency: invoice.currency || f.currency,
      }))
    } else {
      setForm((f) => ({ ...f, invoice_id: invoiceId }))
    }
  }

  function handleBookingSelect(bookingId) {
    const booking = bookings.find((b) => b.id === bookingId)
    if (booking) {
      setForm((f) => ({
        ...f,
        booking_id: bookingId,
        client_id: booking.client_id || f.client_id,
        amount: booking.amount_paid || f.amount,
      }))
    } else {
      setForm((f) => ({ ...f, booking_id: bookingId }))
    }
  }

  async function handleSave() {
    if (!form.receipt_number.trim()) {
      alert('Please enter a receipt number')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        invoice_id: form.invoice_id || null,
        client_id: form.client_id || null,
        booking_id: form.booking_id || null,
        amount: Number(form.amount) || 0,
        payment_date: form.payment_date || null,
      }
      if (editing) {
        await updateReceipt(editing.id, payload)
      } else {
        await createReceipt(payload, user.id, agency?.id)
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(receipt) {
    if (!confirm(`Delete receipt ${receipt.receipt_number}?`)) return
    try {
      await deleteReceipt(receipt.id)
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'Select client' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const invoiceOptions = [{ value: '', label: 'No invoice' }, ...invoices.map((inv) => ({ value: inv.id, label: `${inv.invoice_number} — ${formatCurrency(inv.total_amount, inv.currency)}` }))]
  const bookingOptions = [{ value: '', label: 'No booking' }, ...bookings.map((b) => ({ value: b.id, label: b.booking_reference || b.id.slice(0, 8) }))]

  const columns = [
    {
      key: 'receipt_number',
      label: 'Receipt #',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Receipt} label="Receipt" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 ring-1 ring-emerald-200/60">
            <Receipt className="h-3.5 w-3.5" />
          </span>
          {row.receipt_number}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={User} label="Client" accent="teal" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <span className="font-medium text-slate-800">{formatClientName(row.clients)}</span>,
    },
    {
      key: 'invoice',
      label: 'Invoice',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={FileText} label="Invoice" accent="sky" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => (
        row.invoices?.invoice_number ? (
          <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
            {row.invoices.invoice_number}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'payment_date',
      label: 'Date',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Calendar} label="Date" accent="amber" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => <span className="text-sm font-medium text-slate-700">{formatDate(row.payment_date)}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Wallet} label="Amount" accent="emerald" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className="text-base font-bold tabular-nums tracking-tight text-emerald-700 sm:text-sm">
          {formatCurrency(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      label: 'Method',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={CreditCard} label="Method" accent="violet" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => <PaymentMethodBadge method={row.payment_method} />,
    },
    {
      key: 'reference',
      label: 'Reference',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden xl:table-cell`,
      headerRender: () => <LeadTableHeader icon={Hash} label="Reference" accent="slate" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden xl:table-cell`,
      render: (row) => (
        <span className={row.reference ? 'text-sm text-slate-600' : 'text-slate-400'}>
          {row.reference || '—'}
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
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label="Edit receipt"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete receipt"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const activeTabStyle = getTabStyle(methodFilter)

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Payments received
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Receipts</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Record and track payments received from clients — linked to invoices and bookings
            </p>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-lg shadow-emerald-900/30">
            <Plus className="h-4 w-4" /> Add Receipt
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total receipts', value: stats.count, icon: Receipt },
            { label: 'Total received', value: formatCurrency(stats.totalReceived), icon: TrendingUp },
            { label: 'This month', value: formatCurrency(stats.thisMonth), icon: Wallet },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-emerald-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment method tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {methodTabs.map(({ id, label, icon: Icon }) => {
            const count = id ? methodCounts[id] : methodCounts.all
            const active = methodFilter === id
            const tabStyle = getTabStyle(id)
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setMethodFilter(id)}
                className={`group relative flex min-w-[7rem] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all duration-300 sm:min-w-[8rem] sm:px-4 sm:py-3.5 ${
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

      {/* Search */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search receipts</p>
              <p className="text-xs text-slate-500">Filter by receipt number, reference, client, or notes</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold tabular-nums text-emerald-800">
            {receipts.length} of {stats.count} shown
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt number, reference, client name..."
            className={`${fieldClass} pl-10 pr-4`}
          />
        </div>
        {(search || methodFilter) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            {methodFilter && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${activeTabStyle.activeClass}`}>
                {labelFor(PAYMENT_METHODS, methodFilter)}
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80">
                &quot;{search}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading receipts…</p>
        </div>
      ) : receipts.length === 0 ? (
        <ReceiptsEmptyState onAdd={openAdd} />
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={methodFilter ? `${labelFor(PAYMENT_METHODS, methodFilter)} receipts` : 'All receipts'}
          captionCount={`${receipts.length} shown`}
          columns={columns}
          data={receipts}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Receipt' : 'Add Receipt'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Receipt Number *" value={form.receipt_number} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} />
          <Select label="Linked Invoice" value={form.invoice_id} onChange={(e) => handleInvoiceSelect(e.target.value)} options={invoiceOptions} />
          <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clientOptions} />
          <Select label="Linked Booking" value={form.booking_id} onChange={(e) => handleBookingSelect(e.target.value)} options={bookingOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Payment Date" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} options={PAYMENT_METHODS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <Input label="Payment Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. Bank transfer ref, card last 4 digits" />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}
