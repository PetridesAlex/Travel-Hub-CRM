import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getTasks, createTask, updateTask, deleteTask } from '../services/tasks'
import { getClients } from '../services/clients'
import { getLeads } from '../services/leads'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { TASK_STATUSES } from '../constants/enums'
import { formatDate, formatClientName, formatClientOptionLabel } from '../utils/format'

const emptyForm = {
  client_id: '',
  lead_id: '',
  title: '',
  description: '',
  due_date: '',
  status: 'pending',
}

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [filter])

  async function loadData() {
    try {
      setLoading(true)
      const [tasksData, clientsData, leadsData] = await Promise.all([
        getTasks(filter),
        getClients(),
        getLeads(),
      ])
      setTasks(tasksData)
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
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(task) {
    setEditing(task)
    setForm({
      client_id: task.client_id || '',
      lead_id: task.lead_id || '',
      title: task.title || '',
      description: task.description || '',
      due_date: task.due_date || '',
      status: task.status || 'pending',
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
        due_date: form.due_date || null,
      }
      if (editing) {
        await updateTask(editing.id, payload)
      } else {
        await createTask(payload, user.id)
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleComplete(task) {
    try {
      await updateTask(task.id, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      })
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(task) {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(task.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const clientOptions = [{ value: '', label: 'No client' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const leadOptions = [{ value: '', label: 'No lead' }, ...leads.map((l) => ({ value: l.id, label: l.destination || `Lead ${l.id.slice(0, 8)}` }))]

  const columns = [
    {
      key: 'complete',
      label: '',
      render: (row) => (
        <button onClick={() => handleToggleComplete(row)} className={row.status === 'completed' ? 'text-green-600' : 'text-slate-300 hover:text-green-600'}>
          <CheckCircle className="h-5 w-5" />
        </button>
      ),
    },
    { key: 'title', label: 'Task' },
    { key: 'client', label: 'Client', render: (row) => formatClientName(row.clients) },
    { key: 'lead', label: 'Lead', render: (row) => row.leads?.destination || '—' },
    { key: 'due_date', label: 'Due Date', render: (row) => formatDate(row.due_date) },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
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
          <h2 className="text-xl font-semibold text-slate-900">Tasks & Follow-ups</h2>
          <p className="text-sm text-slate-500">Stay on top of client follow-ups</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'today', label: 'Due Today' },
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table columns={columns} data={tasks} emptyMessage="No tasks yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Task' : 'Add Task'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clientOptions} />
          <Select label="Lead" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} options={leadOptions} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={TASK_STATUSES} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
