import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../services/invoices'
import { getClients } from '../services/clients'
import { getBookings } from '../services/bookings'
import { getQuotations } from '../services/quotations'
import Button from '../components/ui/Button'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { INVOICE_STATUSES, INVOICE_SERVICE_TYPES } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor, getTodayISO } from '../utils/format'
import { exportInvoicePdf } from '../utils/exportPdf'

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

export default function Invoices() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [invoices, setInvoices] = useState([])
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
      getInvoices(search, statusFilter, serviceFilter),
      getClients(),
      getBookings(),
      getQuotations(),
    ])

    const [invoicesResult, clientsResult, bookingsResult, quotesResult] = results

    if (invoicesResult.status === 'fulfilled') {
      setInvoices(invoicesResult.value)
      setListError('')
    } else {
      console.error('Failed to load invoices:', invoicesResult.reason)
      setInvoices([])
      setListError(getSaveErrorMessage(invoicesResult.reason))
    }

    if (clientsResult.status === 'fulfilled') {
      setClients(clientsResult.value)
    } else {
      console.error('Failed to load clients:', clientsResult.reason)
      setClients([])
    }

    if (bookingsResult.status === 'fulfilled') {
      setBookings(bookingsResult.value)
    } else {
      console.error('Failed to load bookings:', bookingsResult.reason)
      setBookings([])
    }

    if (quotesResult.status === 'fulfilled') {
      setQuotations(quotesResult.value)
    } else {
      console.error('Failed to load quotations:', quotesResult.reason)
      setQuotations([])
    }

    setLoading(false)
  }

  async function refreshInvoices() {
    const data = await getInvoices('', '', '')
    setInvoices(data)
    setListError('')
    return data
  }

  async function applyFilters() {
    setLoading(true)
    setSaveSuccess('')
    try {
      const data = await getInvoices(search, statusFilter, serviceFilter)
      setInvoices(data)
      setListError('')
    } catch (err) {
      console.error(err)
      setListError(getSaveErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const outstanding = invoices
      .filter((inv) => ['draft', 'sent', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const paid = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length
    return { outstanding, paid, overdueCount, total: invoices.length }
  }, [invoices])

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
    if (!form.invoice_number.trim()) {
      errors.invoice_number = 'Invoice number is required'
    }
    if (!form.service_type) {
      errors.service_type = 'Please select a service type'
    }
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

      setSearch('')
      setStatusFilter('')
      setServiceFilter('')
      setInvoices((prev) => {
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
    {
      value: '',
      label: sortedClients.length ? 'Select client' : 'No clients found — add one in Clients',
    },
    ...sortedClients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) })),
  ]
  const bookingOptions = [{ value: '', label: 'No booking' }, ...bookings.map((b) => ({ value: b.id, label: b.booking_reference || b.id.slice(0, 8) }))]
  const quoteOptions = [{ value: '', label: 'No quotation' }, ...quotations.map((q) => ({ value: q.id, label: q.title }))]
  const statusOptions = [{ value: '', label: 'All statuses' }, ...INVOICE_STATUSES]
  const serviceOptions = [{ value: '', label: 'All services' }, ...INVOICE_SERVICE_TYPES]
  const serviceFormOptions = [{ value: '', label: 'Select service' }, ...INVOICE_SERVICE_TYPES]
  const estimatedTotal = (Number(form.amount) || 0) + (Number(form.tax_amount) || 0)

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (row) => <span className="font-medium text-slate-900">{row.invoice_number}</span> },
    { key: 'client', label: 'Client', render: (row) => formatClientName(row.clients) },
    {
      key: 'service_type',
      label: 'Service',
      render: (row) => row.service_type
        ? labelFor(INVOICE_SERVICE_TYPES, row.service_type)
        : '—',
    },
    { key: 'issue_date', label: 'Issued', render: (row) => formatDate(row.issue_date) },
    { key: 'due_date', label: 'Due', render: (row) => formatDate(row.due_date) },
    { key: 'total_amount', label: 'Total', render: (row) => formatCurrency(row.total_amount, row.currency) },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} label={labelFor(INVOICE_STATUSES, row.status)} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => handleExportPdf(row)} className="text-slate-400 hover:text-teal-600" title="Download PDF">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-teal-600" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(row)} className="text-slate-400 hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500">Track client invoices and outstanding balances</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Invoice</Button>
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveSuccess}</div>
      )}

      {listError && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{listError}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Invoices</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{formatCurrency(stats.outstanding)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Paid</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{formatCurrency(stats.paid)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-red-900">{stats.overdueCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Search invoice number, description..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} className="sm:w-44" />
        <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} options={serviceOptions} className="sm:w-52" />
        <Button variant="secondary" onClick={applyFilters}>Search</Button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">No invoices yet.</td></tr>
                ) : (
                  invoices.map((row) => (
                    <tr key={row.id} className={row.status === 'overdue' ? 'bg-red-50/50' : ''}>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
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
