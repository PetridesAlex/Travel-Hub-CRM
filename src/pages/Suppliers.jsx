import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/suppliers'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import SearchInput from '../components/ui/SearchInput'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { SUPPLIER_TYPES } from '../constants/enums'
import { labelFor } from '../utils/format'

const emptyForm = {
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  supplier_type: 'other',
  notes: '',
}

export default function Suppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [search, typeFilter])

  async function loadSuppliers() {
    try {
      setLoading(true)
      const data = await getSuppliers(search, typeFilter)
      setSuppliers(data)
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

  function openEdit(supplier) {
    setEditing(supplier)
    setForm({
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      supplier_type: supplier.supplier_type || 'other',
      notes: supplier.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        await updateSupplier(editing.id, form)
      } else {
        await createSupplier(form, user.id)
      }
      setModalOpen(false)
      loadSuppliers()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(supplier) {
    if (!confirm(`Delete supplier "${supplier.company_name}"?`)) return
    try {
      await deleteSupplier(supplier.id)
      loadSuppliers()
    } catch (err) {
      alert(err.message)
    }
  }

  const columns = [
    { key: 'company_name', label: 'Company' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'supplier_type',
      label: 'Type',
      render: (row) => <Badge status="draft" label={labelFor(SUPPLIER_TYPES, row.supplier_type)} />,
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
          <h2 className="text-xl font-semibold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500">Manage hotels, airlines, cruise lines, and more</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." className="max-w-xs" />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[{ value: '', label: 'All Types' }, ...SUPPLIER_TYPES]}
          className="w-40"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table columns={columns} data={suppliers} emptyMessage="No suppliers yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Company Name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Supplier Type" value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value })} options={SUPPLIER_TYPES} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
