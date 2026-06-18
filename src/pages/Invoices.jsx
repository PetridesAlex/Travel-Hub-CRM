import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Download, Sparkles, Loader2, SlidersHorizontal,
  FileText, User, Plane, Calendar, CalendarClock, Wallet, Flag, MoreHorizontal,
  Mail, AlertTriangle, Ban, Receipt,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../services/invoices'
import { getClients } from '../services/clients'
import { getBookings } from '../services/bookings'
import { getQuotations } from '../services/quotations'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { INVOICE_STATUSES, INVOICE_SERVICE_TYPES } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor, getTodayISO } from '../utils/format'
import { exportInvoicePdf } from '../utils/exportPdf'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const emptyForm = {
  invoice_number: '',
  client_id: '',
  booking_id: '',
  quotation_id: '',
  issue_date: getTodayISO(),
  due_date: '',
  amount: '',
  tax_amount: '',
  currency: 'EUR',
  status: 'draft',
  service_type: '',
  description: '',
  notes: '',
}

const INVOICE_FORM_ID = 'invoice-form'

const STATUS_ICONS = {
  draft: FileText,
  sent: Mail,
  paid: Wallet,
  overdue: AlertTriangle,
  cancelled: Ban,
}

const STATUS_TAB_STYLES = {
  '': {
    activeClass: 'border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 text-violet-900 shadow-md shadow-violet-900/5 ring-1 ring-violet-500/15',
    iconActive: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/20',
    countActive: 'bg-violet-600 text-white shadow-sm',
    accent: 'from-violet-400 to-indigo-500',
  },
  draft: {
    activeClass: 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-400/15',
    iconActive: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-md shadow-slate-900/20',
    countActive: 'bg-slate-600 text-white shadow-sm',
    accent: 'from-slate-400 to-slate-600',
  },
  sent: {
    activeClass: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-blue-50/30 text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-500/15',
    iconActive: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-900/20',
    countActive: 'bg-sky-600 text-white shadow-sm',
    accent: 'from-sky-400 to-blue-500',
  },
  paid: {
    activeClass: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-900 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/15',
    iconActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20',
    countActive: 'bg-emerald-600 text-white shadow-sm',
    accent: 'from-emerald-400 to-teal-500',
  },
  overdue: {
    activeClass: 'border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-red-50/30 text-rose-900 shadow-md shadow-rose-900/5 ring-1 ring-rose-500/15',
    iconActive: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-900/20',
    countActive: 'bg-rose-600 text-white shadow-sm',
    accent: 'from-rose-400 to-red-500',
  },
  cancelled: {
    activeClass: 'border-slate-200/90 bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-700 shadow-md shadow-slate-900/5 ring-1 ring-slate-300/15',
    iconActive: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-md shadow-slate-900/20',
    countActive: 'bg-slate-500 text-white shadow-sm',
    accent: 'from-slate-300 to-slate-500',
  },
}

const SERVICE_STYLES = {
  flight: 'border-sky-200/80 bg-sky-50 text-sky-800',
  hotel: 'border-violet-200/80 bg-violet-50 text-violet-800',
  ferry: 'border-blue-200/80 bg-blue-50 text-blue-800',
  car_rental: 'border-amber-200/80 bg-amber-50 text-amber-800',
  travel_insurance: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  cruise: 'border-indigo-200/80 bg-indigo-50 text-indigo-800',
  travel_package: 'border-teal-200/80 bg-teal-50 text-teal-800',
  other: 'border-slate-200/80 bg-slate-50 text-slate-700',
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-violet-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20'

function getSaveErrorMessage(err) {
  const msg = err?.message || ''
  if (msg.includes('service_type')) {
    return 'Database update needed: run supabase/migrations/005_invoice_service_type.sql in Supabase, then refresh.'
  }
  if (msg.includes('invoices') && (msg.includes('schema cache') || msg.includes('does not exist'))) {
    return 'Database update needed: run supabase/migrations/004_invoices_receipts.sql in Supabase, then refresh.'
  }
  return msg || 'Failed to save invoice. Please try again.'
}

function generateInvoiceNumber() {
  const date = new Date()
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const suffix = String(date.getTime()).slice(-4)
  return `INV-${stamp}-${suffix}`
}

function getStatusTabStyle(statusId) {
  return STATUS_TAB_STYLES[statusId] || STATUS_TAB_STYLES['']
}

function ServiceTypeBadge({ type }) {
  if (!type) return <span className="text-slate-400">—</span>
  const label = labelFor(INVOICE_SERVICE_TYPES, type)
  const style = SERVICE_STYLES[type] || SERVICE_STYLES.other
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}

function InvoicesEmptyState({ statusFilter, onAdd }) {
  const statusLabel = statusFilter ? labelFor(INVOICE_STATUSES, statusFilter) : null
  const Icon = statusFilter ? (STATUS_ICONS[statusFilter] || FileText) : Receipt

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-violet-200/80 bg-gradient-to-b from-violet-50/60 via-white to-indigo-50/40 px-6 py-16 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/25 ring-4 ring-white">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">
        {statusLabel ? `No ${statusLabel.toLowerCase()} invoices` : 'Start billing your clients'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {statusLabel
          ? `No invoices with status "${statusLabel}" yet. Create one or adjust your filters.`
          : 'Create professional invoices linked to bookings and quotations — track outstanding balances and payments.'}
      </p>
      <Button onClick={onAdd} className="mt-6 shadow-lg shadow-violet-900/20">
        <Plus className="h-4 w-4" />
        Create first invoice
      </Button>
    </div>
  )
}

export default function Invoices() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [allInvoices, setAllInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [bookings, setBookings] = useState([])
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [listError, setListError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadClients() {
    try {
      const data = await getClients()
      setClients(data)
      return data
    } catch (err) {
      console.error('Failed to load clients:', err)
      return []
    }
  }

  async function loadData() {
    setLoading(true)
    const results = await Promise.allSettled([
      getInvoices(),
      getClients(),
      getBookings(),
      getQuotations(),
    ])

    const [invoicesResult, clientsResult, bookingsResult, quotesResult] = results

    if (invoicesResult.status === 'fulfilled') {
      setAllInvoices(invoicesResult.value)
      setListError('')
    } else {
      console.error('Failed to load invoices:', invoicesResult.reason)
      setAllInvoices([])
      setListError(getSaveErrorMessage(invoicesResult.reason))
    }

    if (clientsResult.status === 'fulfilled') setClients(clientsResult.value)
    if (bookingsResult.status === 'fulfilled') setBookings(bookingsResult.value)
    if (quotesResult.status === 'fulfilled') setQuotations(quotesResult.value)

    setLoading(false)
  }

  async function refreshInvoices() {
    const data = await getInvoices()
    setAllInvoices(data)
    setListError('')
    return data
  }

  const statusCounts = useMemo(() => {
    const counts = { all: allInvoices.length }
    INVOICE_STATUSES.forEach((s) => {
      counts[s.value] = allInvoices.filter((inv) => inv.status === s.value).length
    })
    return counts
  }, [allInvoices])

  const stats = useMemo(() => {
    const outstanding = allInvoices
      .filter((inv) => ['draft', 'sent', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const paid = allInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length
    return { outstanding, paid, overdueCount, total: allInvoices.length }
  }, [allInvoices])

  const invoices = useMemo(() => {
    let result = statusFilter
      ? allInvoices.filter((inv) => inv.status === statusFilter)
      : allInvoices

    if (serviceFilter) {
      result = result.filter((inv) => inv.service_type === serviceFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((inv) =>
        inv.invoice_number?.toLowerCase().includes(q)
        || inv.description?.toLowerCase().includes(q)
        || inv.notes?.toLowerCase().includes(q)
        || formatClientName(inv.clients).toLowerCase().includes(q),
      )
    }

    return result
  }, [allInvoices, statusFilter, serviceFilter, search])

  const statusTabs = [
    { id: '', label: 'All', icon: Receipt },
    ...INVOICE_STATUSES.map((s) => ({ id: s.value, label: s.label, icon: STATUS_ICONS[s.value] || FileText })),
  ]

  function openAdd() {
    setEditing(null)
    setFormErrors({})
    setSaveError('')
    setForm({ ...emptyForm, invoice_number: generateInvoiceNumber(), issue_date: getTodayISO() })
    loadClients()
    setModalOpen(true)
  }

  function openEdit(invoice) {
    setEditing(invoice)
    setFormErrors({})
    setSaveError('')
    loadClients()
    setForm({
      invoice_number: invoice.invoice_number || '',
      client_id: invoice.client_id || '',
      booking_id: invoice.booking_id || '',
      quotation_id: invoice.quotation_id || '',
      issue_date: invoice.issue_date || '',
      due_date: invoice.due_date || '',
      amount: invoice.amount ?? '',
      tax_amount: invoice.tax_amount ?? '',
      currency: invoice.currency || 'EUR',
      status: invoice.status || 'draft',
      service_type: invoice.service_type || '',
      description: invoice.description || '',
      notes: invoice.notes || '',
    })
    setModalOpen(true)
  }

  function handleBookingSelect(bookingId) {
    const booking = bookings.find((b) => b.id === bookingId)
    if (booking) {
      setForm((f) => ({
        ...f,
        booking_id: bookingId,
        client_id: booking.client_id || f.client_id,
        amount: booking.total_cost || f.amount,
        due_date: booking.due_date || f.due_date,
      }))
    } else {
      setForm((f) => ({ ...f, booking_id: bookingId }))
    }
  }

  function mapQuotationServiceType(travelType) {
    const map = {
      flight: 'flight',
      hotel: 'hotel',
      cruise: 'cruise',
      package: 'travel_package',
    }
    return map[travelType] || ''
  }

  function handleQuotationSelect(quotationId) {
    const quote = quotations.find((q) => q.id === quotationId)
    if (quote) {
      setForm((f) => ({
        ...f,
        quotation_id: quotationId,
        client_id: quote.client_id || f.client_id,
        amount: quote.selling_price || f.amount,
        currency: quote.currency || f.currency,
        service_type: mapQuotationServiceType(quote.travel_type) || f.service_type,
      }))
    } else {
      setForm((f) => ({ ...f, quotation_id: quotationId }))
    }
  }

  function validateForm() {
    const errors = {}
    if (!form.invoice_number.trim()) errors.invoice_number = 'Invoice number is required'
    if (!form.service_type) errors.service_type = 'Please select a service type'
    return errors
  }

  async function handleSave(e) {
    if (e?.preventDefault) e.preventDefault()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      setSaveError('Please fix the highlighted fields before saving.')
      return
    }

    if (!user?.id) {
      setSaveError('You must be signed in to save an invoice.')
      return
    }

    setFormErrors({})
    setSaveError('')
    setSaveSuccess('')
    setSaving(true)
    try {
      const payload = {
        invoice_number: form.invoice_number.trim(),
        client_id: form.client_id || null,
        booking_id: form.booking_id || null,
        quotation_id: form.quotation_id || null,
        service_type: form.service_type,
        amount: Number(form.amount) || 0,
        tax_amount: Number(form.tax_amount) || 0,
        currency: form.currency || 'EUR',
        status: form.status || 'draft',
        description: form.description?.trim() || null,
        notes: form.notes?.trim() || null,
        issue_date: form.issue_date || getTodayISO(),
        due_date: form.due_date || null,
      }

      const saved = editing
        ? await updateInvoice(editing.id, payload)
        : await createInvoice(payload, user.id, agency?.id)

      setAllInvoices((prev) => {
        const withoutDuplicate = prev.filter((inv) => inv.id !== saved.id)
        return [saved, ...withoutDuplicate]
      })
      setModalOpen(false)
      setSaveSuccess(`Invoice ${saved.invoice_number} saved.`)

      try {
        await refreshInvoices()
      } catch (refreshErr) {
        console.error('Invoice saved but refresh failed:', refreshErr)
        setListError('Invoice saved, but the list could not fully refresh. Your saved invoice is still shown below.')
      }
    } catch (err) {
      console.error(err)
      setSaveError(getSaveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(invoice) {
    if (!confirm(`Delete invoice ${invoice.invoice_number}?`)) return
    try {
      await deleteInvoice(invoice.id)
      setSaveSuccess('')
      await refreshInvoices()
    } catch (err) {
      alert(err.message)
    }
  }

  function handleExportPdf(invoice) {
    const client = invoice.clients || clients.find((c) => c.id === invoice.client_id)
    exportInvoicePdf(invoice, { agency, client }).catch((err) => {
      alert(err.message || 'Failed to generate PDF')
    })
  }

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => formatClientOptionLabel(a).localeCompare(formatClientOptionLabel(b))),
    [clients],
  )

  const clientOptions = [
    { value: '', label: sortedClients.length ? 'Select client' : 'No clients found — add one in Clients' },
    ...sortedClients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) })),
  ]
  const bookingOptions = [{ value: '', label: 'No booking' }, ...bookings.map((b) => ({ value: b.id, label: b.booking_reference || b.id.slice(0, 8) }))]
  const quoteOptions = [{ value: '', label: 'No quotation' }, ...quotations.map((q) => ({ value: q.id, label: q.title }))]
  const serviceOptions = [{ value: '', label: 'All services' }, ...INVOICE_SERVICE_TYPES]
  const serviceFormOptions = [{ value: '', label: 'Select service' }, ...INVOICE_SERVICE_TYPES]
  const estimatedTotal = (Number(form.amount) || 0) + (Number(form.tax_amount) || 0)
  const activeTabStyle = getStatusTabStyle(statusFilter)

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={FileText} label="Invoice" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 ring-1 ring-violet-200/60">
            <FileText className="h-3.5 w-3.5" />
          </span>
          {row.invoice_number}
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
      key: 'service_type',
      label: 'Service',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Plane} label="Service" accent="sky" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => <ServiceTypeBadge type={row.service_type} />,
    },
    {
      key: 'issue_date',
      label: 'Issued',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={Calendar} label="Issued" accent="amber" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => <span className="text-sm text-slate-600">{formatDate(row.issue_date)}</span>,
    },
    {
      key: 'due_date',
      label: 'Due',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={CalendarClock} label="Due" accent="rose" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className={`text-sm font-medium ${row.status === 'overdue' ? 'text-rose-700' : 'text-slate-600'}`}>
          {formatDate(row.due_date)}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Wallet} label="Total" accent="emerald" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className="text-base font-bold tabular-nums tracking-tight text-slate-900 sm:text-sm">
          {formatCurrency(row.total_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Flag} label="Status" accent="violet" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <Badge status={row.status} label={labelFor(INVOICE_STATUSES, row.status)} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-[1%] whitespace-nowrap`,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} w-[1%] whitespace-nowrap`,
      render: (row) => (
        <div className="flex gap-1">
          <button type="button" onClick={() => handleExportPdf(row)} className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700" title="Download PDF">
            <Download className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => openEdit(row)} className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleDelete(row)} className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              Billing & accounts
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Invoices</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Track client invoices, outstanding balances, and payment status — linked to bookings and quotes
            </p>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-lg shadow-violet-900/30">
            <Plus className="h-4 w-4" /> Add Invoice
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total invoices', value: stats.total, icon: FileText },
            { label: 'Outstanding', value: formatCurrency(stats.outstanding), icon: AlertTriangle },
            { label: 'Paid', value: formatCurrency(stats.paid), icon: Wallet },
            { label: 'Overdue', value: stats.overdueCount, icon: CalendarClock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-violet-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          {saveSuccess}
        </div>
      )}

      {listError && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
          {listError}
        </div>
      )}

      {/* Status tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {statusTabs.map(({ id, label, icon: Icon }) => {
            const count = id ? statusCounts[id] : statusCounts.all
            const active = statusFilter === id
            const tabStyle = getStatusTabStyle(id)
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`group relative flex min-w-[6.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all duration-300 sm:min-w-[7.5rem] sm:px-4 sm:py-3.5 ${
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

      {/* Search & service filter */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search & filters</p>
              <p className="text-xs text-slate-500">Find invoices by number, client, or service type</p>
            </div>
          </div>
          <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold tabular-nums text-violet-800">
            {invoices.length} of {stats.total} shown
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice number, description, client..."
              className={`${fieldClass} pl-10 pr-4`}
            />
          </div>
          <Select
            label="Service type"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            options={serviceOptions}
          />
        </div>
        {(search || statusFilter || serviceFilter) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            {statusFilter && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${activeTabStyle.activeClass}`}>
                {labelFor(INVOICE_STATUSES, statusFilter)}
              </span>
            )}
            {serviceFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200/80">
                {labelFor(INVOICE_SERVICE_TYPES, serviceFilter)}
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200/80">
                &quot;{search}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500">Loading invoices…</p>
        </div>
      ) : invoices.length === 0 ? (
        <InvoicesEmptyState statusFilter={statusFilter} onAdd={openAdd} />
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={statusFilter ? `${labelFor(INVOICE_STATUSES, statusFilter)} invoices` : 'All invoices'}
          captionCount={`${invoices.length} shown`}
          columns={columns}
          data={invoices}
          getRowClassName={(row) => (row.status === 'overdue' ? 'bg-rose-50/40' : '')}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Invoice' : 'Add Invoice'}
        footer={
          <ModalFooter
            formId={INVOICE_FORM_ID}
            onCancel={() => setModalOpen(false)}
            onSave={handleSave}
            saving={saving}
          />
        }
      >
        <form id={INVOICE_FORM_ID} onSubmit={handleSave} className="space-y-3">
          {saveError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
          )}
          <Input
            label="Invoice Number *"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            error={formErrors.invoice_number}
            required
          />
          <Select
            label="Service Type *"
            value={form.service_type}
            onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            options={serviceFormOptions}
            error={formErrors.service_type}
            required
          />
          <Select
            label="Client"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            options={clientOptions}
            disabled={sortedClients.length === 0}
          />
          {sortedClients.length === 0 && (
            <p className="text-sm text-amber-700">
              No clients loaded. Add a client on the Clients page, then reopen this form.
            </p>
          )}
          <Select label="Linked Booking" value={form.booking_id} onChange={(e) => handleBookingSelect(e.target.value)} options={bookingOptions} />
          <Select label="Linked Quotation" value={form.quotation_id} onChange={(e) => handleQuotationSelect(e.target.value)} options={quoteOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issue Date" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Tax" type="number" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
            <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">
            Total: {formatCurrency(estimatedTotal, form.currency)}
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Athens to London return flights" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={INVOICE_STATUSES} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  )
}
