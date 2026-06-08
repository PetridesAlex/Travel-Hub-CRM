import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getReceipts, createReceipt, updateReceipt, deleteReceipt } from '../services/receipts'
import { getInvoices } from '../services/invoices'
import { getClients } from '../services/clients'
import { getBookings } from '../services/bookings'
import Button from '../components/ui/Button'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { PAYMENT_METHODS } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor, getTodayISO } from '../utils/format'

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

export default function Receipts() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
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
      const [receiptsData, invoicesData, clientsData, bookingsData] = await Promise.all([
        getReceipts(search, methodFilter),
        getInvoices(),
        getClients(),
        getBookings(),
      ])
      setReceipts(receiptsData)
      setInvoices(invoicesData)
      setClients(clientsData)
      setBookings(bookingsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function applyFilters() {
    setLoading(true)
    try {
      const data = await getReceipts(search, methodFilter)
      setReceipts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalReceived = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const thisMonth = receipts.filter((r) => {
      if (!r.payment_date) return false
      const d = new Date(r.payment_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((sum, r) => sum + Number(r.amount || 0), 0)
    return { totalReceived, thisMonth, count: receipts.length }
  }, [receipts])

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
        await createReceipt(payload, user.id)
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
  const methodOptions = [{ value: '', label: 'All methods' }, ...PAYMENT_METHODS]

  const columns = [
    { key: 'receipt_number', label: 'Receipt #', render: (row) => <span className="font-medium text-slate-900">{row.receipt_number}</span> },
    { key: 'client', label: 'Client', render: (row) => formatClientName(row.clients) },
    { key: 'invoice', label: 'Invoice', render: (row) => row.invoices?.invoice_number || '—' },
    { key: 'payment_date', label: 'Date', render: (row) => formatDate(row.payment_date) },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
    { key: 'payment_method', label: 'Method', render: (row) => labelFor(PAYMENT_METHODS, row.payment_method) },
    { key: 'reference', label: 'Reference', render: (row) => row.reference || '—' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-teal-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(row)} className="text-slate-400 hover:text-red-600">
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
          <h2 className="text-xl font-semibold text-slate-900">Receipts</h2>
          <p className="text-sm text-slate-500">Record payments received from clients</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Receipt</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Receipts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.count}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Total Received</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{formatCurrency(stats.totalReceived)}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">This Month</p>
          <p className="mt-1 text-2xl font-semibold text-teal-900">{formatCurrency(stats.thisMonth)}</p>
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
            placeholder="Search receipt number, reference..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} options={methodOptions} className="sm:w-48" />
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
                {receipts.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">No receipts yet.</td></tr>
                ) : (
                  receipts.map((row) => (
                    <tr key={row.id}>
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
