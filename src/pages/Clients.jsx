import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, User, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getClients, createClient, updateClient, deleteClient } from '../services/clients'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import SearchInput from '../components/ui/SearchInput'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { CLIENT_TYPES } from '../constants/enums'
import { formatClientName, labelFor } from '../utils/format'

const TYPE_TABS = [
  { id: '', label: 'All Clients' },
  { id: 'individual', label: 'Individuals' },
  { id: 'business', label: 'Corporate' },
]

const emptyForm = {
  client_type: 'individual',
  full_name: '',
  company_name: '',
  email: '',
  phone: '',
  nationality: '',
  passport_number: '',
  date_of_birth: '',
  notes: '',
}

function getClientPrimaryName(client) {
  return formatClientName(client)
}

function getClientSecondaryLine(client) {
  if (client.client_type === 'business' && client.full_name) {
    return `Contact: ${client.full_name}`
  }
  return client.email || '—'
}

export default function Clients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allClients, setAllClients] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isBusiness = form.client_type === 'business'

  useEffect(() => {
    loadClients()
  }, [search])

  async function loadClients() {
    try {
      setLoading(true)
      const data = await getClients(search)
      setAllClients(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd(clientType = typeFilter || 'individual') {
    setEditing(null)
    setForm({ ...emptyForm, client_type: clientType || 'individual' })
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({
      client_type: client.client_type || 'individual',
      full_name: client.full_name || '',
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      nationality: client.nationality || '',
      passport_number: client.passport_number || '',
      date_of_birth: client.date_of_birth || '',
      notes: client.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (isBusiness && !form.company_name.trim()) {
      alert('Please enter the company name')
      return
    }
    if (!form.full_name.trim()) {
      alert(isBusiness ? 'Please enter the contact person name' : 'Please enter the client name')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        company_name: isBusiness ? form.company_name.trim() : null,
        passport_number: isBusiness ? null : form.passport_number || null,
        date_of_birth: isBusiness ? null : form.date_of_birth || null,
      }

      if (editing) {
        await updateClient(editing.id, payload)
      } else {
        await createClient(payload, user.id)
      }
      setModalOpen(false)
      loadClients()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(client) {
    const name = getClientPrimaryName(client)
    if (!confirm(`Delete client "${name}"?`)) return
    try {
      await deleteClient(client.id)
      loadClients()
    } catch (err) {
      alert(err.message)
    }
  }

  const counts = {
    all: allClients.length,
    individual: allClients.filter((c) => (c.client_type || 'individual') === 'individual').length,
    business: allClients.filter((c) => c.client_type === 'business').length,
  }

  const clients = typeFilter
    ? allClients.filter((client) => (client.client_type || 'individual') === typeFilter)
    : allClients

  const columns = [
    {
      key: 'client_type',
      label: 'Type',
      render: (row) => (
        <Badge
          status={row.client_type || 'individual'}
          label={labelFor(CLIENT_TYPES, row.client_type || 'individual')}
        />
      ),
    },
    {
      key: 'name',
      label: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getClientPrimaryName(row)}</p>
          <p className="text-xs text-slate-500">{getClientSecondaryLine(row)}</p>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
    { key: 'nationality', label: 'Nationality', render: (row) => row.nationality || '—' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          <h2 className="text-xl font-semibold text-slate-900">Clients</h2>
          <p className="text-sm text-slate-500">Organise individual travellers and corporate accounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openAdd('individual')}>
            <User className="h-4 w-4" /> Add Individual
          </Button>
          <Button onClick={() => openAdd('business')}>
            <Building2 className="h-4 w-4" /> Add Corporate
          </Button>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        {TYPE_TABS.map(({ id, label }) => {
          const count = id === 'individual' ? counts.individual : id === 'business' ? counts.business : counts.all
          const active = typeFilter === id
          return (
            <button
              key={id || 'all'}
              type="button"
              onClick={() => setTypeFilter(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {id === 'business' ? <Building2 className="h-4 w-4" /> : id === 'individual' ? <User className="h-4 w-4" /> : null}
              {label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, company, email, phone, or passport..."
        className="max-w-md"
      />

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table
          columns={columns}
          data={clients}
          onRowClick={(row) => navigate(`/clients/${row.id}`)}
          emptyMessage={
            typeFilter === 'business'
              ? 'No corporate clients yet. Add a company account to get started.'
              : typeFilter === 'individual'
                ? 'No individual clients yet. Add a personal traveller to get started.'
                : 'No clients yet. Add your first client to get started.'
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Client' : isBusiness ? 'Add Corporate Client' : 'Add Individual Client'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Select
            label="Client Type *"
            value={form.client_type}
            onChange={(e) => setForm({ ...form, client_type: e.target.value })}
            options={CLIENT_TYPES}
          />

          {isBusiness ? (
            <>
              <Input
                label="Company Name *"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. Acme Travel Ltd"
              />
              <Input
                label="Contact Person *"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Maria Papadopoulos"
              />
            </>
          ) : (
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          )}

          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />

          {!isBusiness && (
            <>
              <Input label="Passport Number" value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} />
              <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
