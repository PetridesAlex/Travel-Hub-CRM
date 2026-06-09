import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getLeads, createLead, updateLead, deleteLead } from '../services/leads'
import { getClients } from '../services/clients'
import { createTask } from '../services/tasks'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { TRAVEL_TYPES, LEAD_STATUSES } from '../constants/enums'
import { formatCurrency, formatDate, formatClientName, formatClientOptionLabel, labelFor } from '../utils/format'
import { notifySlack } from '../services/slackNotify'

const emptyForm = {
  client_id: '',
  destination: '',
  travel_type: 'other',
  budget: '',
  number_of_adults: 1,
  number_of_children: 0,
  travel_dates: '',
  status: 'new',
  notes: '',
  follow_up_date: '',
}

export default function Leads() {
  const { user, session } = useAuth()
  const [searchParams] = useSearchParams()
  const [leads, setLeads] = useState([])
  const [clients, setClients] = useState([])
  const [filters, setFilters] = useState({ status: '', travel_type: '' })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [filters])

  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId) {
      setForm((f) => ({ ...f, client_id: clientId }))
      setModalOpen(true)
    }
  }, [searchParams])

  async function loadData() {
    try {
      setLoading(true)
      const [leadsData, clientsData] = await Promise.all([
        getLeads(filters),
        getClients(),
      ])
      setLeads(leadsData)
      setClients(clientsData)
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

  function openEdit(lead) {
    setEditing(lead)
    setForm({
      client_id: lead.client_id || '',
      destination: lead.destination || '',
      travel_type: lead.travel_type || 'other',
      budget: lead.budget || '',
      number_of_adults: lead.number_of_adults || 1,
      number_of_children: lead.number_of_children || 0,
      travel_dates: lead.travel_dates || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
      follow_up_date: lead.follow_up_date || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        budget: form.budget ? Number(form.budget) : null,
        number_of_adults: Number(form.number_of_adults),
        number_of_children: Number(form.number_of_children),
        follow_up_date: form.follow_up_date || null,
      }

      if (editing) {
        await updateLead(editing.id, payload)
      } else {
        const lead = await createLead(payload, user.id)
        const linkedClient = clients.find((c) => c.id === payload.client_id)
        notifySlack(session, 'lead_created', {
          client_name: linkedClient ? formatClientName(linkedClient) : '—',
          email: linkedClient?.email,
          phone: linkedClient?.phone,
          destination: payload.destination || '—',
          budget: payload.budget,
          status: payload.status || 'new',
          currency: 'EUR',
        })
        if (payload.follow_up_date) {
          await createTask({
            client_id: payload.client_id,
            lead_id: lead.id,
            title: `Follow up: ${payload.destination || 'Lead'}`,
            due_date: payload.follow_up_date,
            status: 'pending',
          }, user.id)
        }
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(lead) {
    if (!confirm('Delete this lead?')) return
    try {
      await deleteLead(lead.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'No client linked' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]

  const linkedClientForForm = clients.find((c) => c.id === form.client_id)
  const contactClient = editing?.clients || linkedClientForForm

  const columns = [
    {
      key: 'client',
      label: 'Client',
      render: (row) => formatClientName(row.clients),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => row.clients?.email
        ? <a href={`mailto:${row.clients.email}`} className="text-teal-600 hover:underline">{row.clients.email}</a>
        : '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.clients?.phone
        ? <a href={`tel:${row.clients.phone}`} className="text-teal-600 hover:underline">{row.clients.phone}</a>
        : '—',
    },
    { key: 'destination', label: 'Destination' },
    {
      key: 'travel_type',
      label: 'Type',
      render: (row) => labelFor(TRAVEL_TYPES, row.travel_type),
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (row) => formatCurrency(row.budget),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} label={labelFor(LEAD_STATUSES, row.status)} />,
    },
    {
      key: 'follow_up_date',
      label: 'Follow-up',
      render: (row) => formatDate(row.follow_up_date),
    },
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
          <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">Track travel enquiries and opportunities</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Lead</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          options={[{ value: '', label: 'All Statuses' }, ...LEAD_STATUSES]}
          className="w-40"
        />
        <Select
          value={filters.travel_type}
          onChange={(e) => setFilters({ ...filters, travel_type: e.target.value })}
          options={[{ value: '', label: 'All Types' }, ...TRAVEL_TYPES]}
          className="w-40"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table columns={columns} data={leads} emptyMessage="No leads yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Lead' : 'Add Lead'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          {contactClient && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">Contact details</p>
              <p className="mt-1 text-slate-700">
                Email:{' '}
                {contactClient.email
                  ? <a href={`mailto:${contactClient.email}`} className="text-teal-600 hover:underline">{contactClient.email}</a>
                  : '—'}
              </p>
              <p className="text-slate-700">
                Phone:{' '}
                {contactClient.phone
                  ? <a href={`tel:${contactClient.phone}`} className="text-teal-600 hover:underline">{contactClient.phone}</a>
                  : '—'}
              </p>
            </div>
          )}
          <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clientOptions} />
          <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <Select label="Travel Type" value={form.travel_type} onChange={(e) => setForm({ ...form, travel_type: e.target.value })} options={TRAVEL_TYPES} />
          <Input label="Budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Adults" type="number" min="1" value={form.number_of_adults} onChange={(e) => setForm({ ...form, number_of_adults: e.target.value })} />
            <Input label="Children" type="number" min="0" value={form.number_of_children} onChange={(e) => setForm({ ...form, number_of_children: e.target.value })} />
          </div>
          <Input label="Travel Dates" value={form.travel_dates} onChange={(e) => setForm({ ...form, travel_dates: e.target.value })} placeholder="e.g. 15-22 July 2026" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={LEAD_STATUSES} />
          <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
