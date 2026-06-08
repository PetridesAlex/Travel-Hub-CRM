import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getBookings, createBooking, updateBooking, deleteBooking } from '../services/bookings'
import { getClients } from '../services/clients'
import { getQuotations } from '../services/quotations'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { BOOKING_STATUSES } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor } from '../utils/format'
import { differenceInDays, parseISO } from 'date-fns'

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

function getDueAlertClass(dueDate, balanceDue) {
  if (!dueDate || balanceDue <= 0) return ''
  const days = differenceInDays(parseISO(dueDate), new Date())
  if (days < 0) return 'bg-red-50'
  if (days <= 7) return 'bg-amber-50'
  return ''
}

export default function Bookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [clients, setClients] = useState([])
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

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
        await createBooking(payload, user.id)
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

  const columns = [
    { key: 'booking_reference', label: 'Reference', render: (row) => row.booking_reference || '—' },
    { key: 'client', label: 'Client', render: (row) => formatClientName(row.clients) },
    { key: 'total_cost', label: 'Total', render: (row) => formatCurrency(row.total_cost) },
    { key: 'amount_paid', label: 'Paid', render: (row) => formatCurrency(row.amount_paid) },
    {
      key: 'balance_due',
      label: 'Balance',
      render: (row) => (
        <span className={row.balance_due > 0 ? 'font-medium text-amber-700' : 'text-green-700'}>
          {formatCurrency(row.balance_due)}
        </span>
      ),
    },
    { key: 'due_date', label: 'Due Date', render: (row) => formatDate(row.due_date) },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} label={labelFor(BOOKING_STATUSES, row.status)} /> },
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
          <h2 className="text-xl font-semibold text-slate-900">Bookings</h2>
          <p className="text-sm text-slate-500">Track bookings and payments</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Booking</Button>
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
                {bookings.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">No bookings yet.</td></tr>
                ) : (
                  bookings.map((row) => (
                    <tr key={row.id} className={getDueAlertClass(row.due_date, row.balance_due)}>
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
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
            Estimated Balance Due: {formatCurrency(estimatedBalance)}
          </div>
          <Input label="Payment Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={BOOKING_STATUSES} />
        </div>
      </Modal>
    </div>
  )
}
