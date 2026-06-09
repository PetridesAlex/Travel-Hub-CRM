import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getQuotations, createQuotation, updateQuotation, deleteQuotation } from '../services/quotations'
import { getClients } from '../services/clients'
import { getLeads } from '../services/leads'
import { createBooking } from '../services/bookings'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import { QUOTATION_STATUSES } from '../constants/enums'
import { formatCurrency, formatClientName, formatClientOptionLabel, labelFor } from '../utils/format'
import { notifySlack } from '../services/slackNotify'

const emptyForm = {
  client_id: '',
  lead_id: '',
  title: '',
  destination: '',
  supplier_cost: '',
  selling_price: '',
  currency: 'EUR',
  inclusions: '',
  exclusions: '',
  terms: '',
  status: 'draft',
}

export default function Quotations() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewQuote, setPreviewQuote] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId) {
      setForm((f) => ({ ...f, client_id: clientId }))
      setModalOpen(true)
    }
  }, [searchParams])

  async function loadData() {
    try {
      const [quotesData, clientsData, leadsData] = await Promise.all([
        getQuotations(),
        getClients(),
        getLeads(),
      ])
      setQuotations(quotesData)
      setClients(clientsData)
      setLeads(leadsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, client_id: searchParams.get('client') || '' })
    setModalOpen(true)
  }

  function openEdit(quote) {
    setEditing(quote)
    setForm({
      client_id: quote.client_id || '',
      lead_id: quote.lead_id || '',
      title: quote.title || '',
      destination: quote.destination || '',
      supplier_cost: quote.supplier_cost || '',
      selling_price: quote.selling_price || '',
      currency: quote.currency || 'EUR',
      inclusions: quote.inclusions || '',
      exclusions: quote.exclusions || '',
      terms: quote.terms || '',
      status: quote.status || 'draft',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        lead_id: form.lead_id || null,
        supplier_cost: Number(form.supplier_cost) || 0,
        selling_price: Number(form.selling_price) || 0,
      }
      if (editing) {
        await updateQuotation(editing.id, payload)
      } else {
        const quote = await createQuotation(payload, user.id)
        const linkedClient = clients.find((c) => c.id === payload.client_id)
        notifySlack(session, 'quotation_created', {
          client_name: linkedClient ? formatClientName(linkedClient) : '—',
          destination: payload.destination || quote.destination || '—',
          selling_price: quote.selling_price,
          profit: quote.profit,
          currency: quote.currency || 'EUR',
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(quote) {
    if (!confirm('Delete this quotation?')) return
    try {
      await deleteQuotation(quote.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateBooking(quote) {
    try {
      await createBooking({
        client_id: quote.client_id,
        quotation_id: quote.id,
        total_cost: quote.selling_price,
        amount_paid: 0,
        status: 'pending',
      }, user.id)
      alert('Booking created from quotation!')
      navigate('/bookings')
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'Select client' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const leadOptions = [{ value: '', label: 'No lead linked' }, ...leads.map((l) => ({ value: l.id, label: l.destination || `Lead ${l.id.slice(0, 8)}` }))]

  const estimatedProfit = (Number(form.selling_price) || 0) - (Number(form.supplier_cost) || 0)

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'client', label: 'Client', render: (row) => formatClientName(row.clients) },
    { key: 'destination', label: 'Destination' },
    { key: 'selling_price', label: 'Price', render: (row) => formatCurrency(row.selling_price, row.currency) },
    { key: 'profit', label: 'Profit', render: (row) => formatCurrency(row.profit, row.currency) },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} label={labelFor(QUOTATION_STATUSES, row.status)} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => { setPreviewQuote(row); setPreviewOpen(true) }} className="text-slate-400 hover:text-teal-600" title="Preview">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-teal-600">
            <Pencil className="h-4 w-4" />
          </button>
          {row.status === 'accepted' && (
            <button onClick={() => handleCreateBooking(row)} className="text-xs text-teal-600 hover:underline">
              Book
            </button>
          )}
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
          <h2 className="text-xl font-semibold text-slate-900">Quotations</h2>
          <p className="text-sm text-slate-500">Create and manage travel quotes</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Create Quotation</Button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table columns={columns} data={quotations} emptyMessage="No quotations yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Quotation' : 'Create Quotation'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clientOptions} />
          <Select label="Lead" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} options={leadOptions} />
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Supplier Cost" type="number" value={form.supplier_cost} onChange={(e) => setForm({ ...form, supplier_cost: e.target.value })} />
            <Input label="Selling Price" type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          </div>
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
            Estimated Profit: {formatCurrency(estimatedProfit, form.currency)}
            <span className="ml-1 text-xs text-teal-600">(final profit calculated by database on save)</span>
          </div>
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={QUOTATION_STATUSES} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Inclusions</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Exclusions</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Terms</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Quotation Preview">
        {previewQuote && (
          <div className="quotation-preview space-y-4 border border-slate-200 p-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900">{previewQuote.title}</h3>
              <p className="text-sm text-slate-500">Travel Agency Quotation</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Client:</span> {formatClientName(previewQuote.clients)}</div>
              <div><span className="text-slate-500">Destination:</span> {previewQuote.destination || '—'}</div>
              <div><span className="text-slate-500">Price:</span> {formatCurrency(previewQuote.selling_price, previewQuote.currency)}</div>
              <div><span className="text-slate-500">Status:</span> <Badge status={previewQuote.status} /></div>
            </div>
            {previewQuote.inclusions && (
              <div>
                <h4 className="font-semibold text-slate-800">Inclusions</h4>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{previewQuote.inclusions}</p>
              </div>
            )}
            {previewQuote.exclusions && (
              <div>
                <h4 className="font-semibold text-slate-800">Exclusions</h4>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{previewQuote.exclusions}</p>
              </div>
            )}
            {previewQuote.terms && (
              <div>
                <h4 className="font-semibold text-slate-800">Terms & Conditions</h4>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{previewQuote.terms}</p>
              </div>
            )}
            <Button variant="secondary" disabled title="Coming soon">Export PDF (Coming soon)</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
