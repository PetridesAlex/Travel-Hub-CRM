import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, CheckCircle2, Circle, CheckSquare,
  Clock, AlertTriangle, Search, ArrowUpDown, ChevronDown, Loader2,
  Target, User, Calendar,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { getTasks, createTask, updateTask, deleteTask } from '../services/tasks'
import { getClients } from '../services/clients'
import { getLeads } from '../services/leads'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { TASK_STATUSES } from '../constants/enums'
import { formatDate, formatClientName, formatClientOptionLabel, getTodayISO, labelFor } from '../utils/format'

const FILTER_TABS = [
  { id: 'all', label: 'All Tasks', icon: CheckSquare },
  { id: 'today', label: 'Due Today', icon: Clock },
  { id: 'pending', label: 'Pending', icon: Circle },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
]

const SORT_OPTIONS = [
  { value: 'due_asc', label: 'Due date (soonest)' },
  { value: 'due_desc', label: 'Due date (latest)' },
  { value: 'newest', label: 'Recently added' },
  { value: 'title_asc', label: 'Title A → Z' },
]

const STATUS_STYLES = {
  pending: 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-white text-amber-800',
  completed: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-800',
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

const emptyForm = {
  client_id: '',
  lead_id: '',
  title: '',
  description: '',
  due_date: '',
  status: 'pending',
}

function getDueUrgency(dueDate, status) {
  if (!dueDate || status === 'completed') return null
  const days = differenceInDays(parseISO(dueDate), new Date())
  if (days < 0) return { label: 'Overdue', className: 'bg-red-50 text-red-700 ring-red-100' }
  if (days === 0) return { label: 'Due today', className: 'bg-amber-50 text-amber-700 ring-amber-100' }
  if (days <= 3) return { label: `In ${days}d`, className: 'bg-sky-50 text-sky-700 ring-sky-100' }
  return null
}

function TaskStatusBadge({ status }) {
  const label = labelFor(TASK_STATUSES, status)
  return (
    <span className={`inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {label}
    </span>
  )
}

function matchesFilter(task, filter, today) {
  if (filter === 'today') {
    return task.due_date === today && task.status === 'pending'
  }
  if (filter === 'pending') return task.status === 'pending'
  if (filter === 'completed') return task.status === 'completed'
  if (filter === 'overdue') {
    if (task.status === 'completed' || !task.due_date) return false
    return differenceInDays(parseISO(task.due_date), new Date()) < 0
  }
  return true
}

function sortTasks(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'due_desc':
      return sorted.sort((a, b) => (b.due_date || '9999').localeCompare(a.due_date || '9999'))
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    case 'title_asc':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
    case 'due_asc':
    default:
      return sorted.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
  }
}

export default function Tasks() {
  const { user } = useAuth()
  const [allTasks, setAllTasks] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('due_asc')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const today = getTodayISO()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [tasksData, clientsData, leadsData] = await Promise.all([
        getTasks('all'),
        getClients(),
        getLeads(),
      ])
      setAllTasks(tasksData)
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
    if (!form.title.trim()) {
      alert('Please enter a task title')
      return
    }
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

  const filterCounts = useMemo(() => ({
    all: allTasks.length,
    today: allTasks.filter((t) => matchesFilter(t, 'today', today)).length,
    pending: allTasks.filter((t) => t.status === 'pending').length,
    overdue: allTasks.filter((t) => matchesFilter(t, 'overdue', today)).length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
  }), [allTasks, today])

  const stats = useMemo(() => ({
    total: allTasks.length,
    dueToday: filterCounts.today,
    pending: filterCounts.pending,
    overdue: filterCounts.overdue,
  }), [allTasks.length, filterCounts])

  const tasks = useMemo(() => {
    let result = allTasks.filter((t) => matchesFilter(t, filter, today))

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.title?.toLowerCase().includes(q)
        || t.description?.toLowerCase().includes(q)
        || formatClientName(t.clients).toLowerCase().includes(q)
        || t.leads?.destination?.toLowerCase().includes(q),
      )
    }

    return sortTasks(result, sortBy)
  }, [allTasks, filter, search, sortBy, today])

  const clientOptions = [{ value: '', label: 'No client' }, ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) }))]
  const leadOptions = [{ value: '', label: 'No lead' }, ...leads.map((l) => ({ value: l.id, label: l.destination || `Lead ${l.id.slice(0, 8)}` }))]

  const columns = [
    {
      key: 'complete',
      label: '',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleComplete(row) }}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
            row.status === 'completed'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'border-slate-200 bg-white text-slate-300 hover:border-emerald-400 hover:text-emerald-500'
          }`}
          aria-label={row.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>
      ),
    },
    {
      key: 'title',
      label: 'Task',
      render: (row) => (
        <div className="min-w-[180px]">
          <p className={`font-semibold tracking-tight ${row.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {row.title}
          </p>
          {row.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'linked',
      label: 'Linked to',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.clients && formatClientName(row.clients) !== '—' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
              <User className="h-3 w-3" />
              {formatClientName(row.clients)}
            </span>
          )}
          {row.leads?.destination && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100">
              <Target className="h-3 w-3" />
              {row.leads.destination}
            </span>
          )}
          {!row.clients && !row.leads?.destination && (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'due_date',
      label: 'Due',
      render: (row) => {
        const urgency = getDueUrgency(row.due_date, row.status)
        return (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(row.due_date)}
            </p>
            {urgency && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${urgency.className}`}>
                {urgency.label}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <TaskStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tasks & Follow-ups</h2>
          <p className="text-sm text-slate-500">Stay on top of client follow-ups and deadlines</p>
        </div>
        <Button onClick={openAdd} size="lg">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total tasks', value: stats.total, sub: 'All follow-ups', icon: CheckSquare, gradient: 'from-teal-400 to-teal-700' },
          { label: 'Due today', value: stats.dueToday, sub: 'Needs attention', icon: Clock, gradient: 'from-amber-400 to-amber-700' },
          { label: 'Pending', value: stats.pending, sub: 'Open tasks', icon: Circle, gradient: 'from-sky-400 to-sky-700' },
          { label: 'Overdue', value: stats.overdue, sub: 'Past due date', icon: AlertTriangle, gradient: 'from-red-400 to-red-700' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${item.gradient} opacity-10 blur-2xl`} />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTER_TABS.map(({ id, label, icon: Icon }) => {
            const count = filterCounts[id]
            const active = filter === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all sm:px-4 sm:py-2.5 ${
                  active
                    ? 'border-teal-200 bg-white text-teal-800 shadow-sm ring-1 ring-teal-500/15'
                    : 'border-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                  active ? 'bg-teal-600 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & sort */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Search className="h-3.5 w-3.5 text-teal-600" />
              Search tasks
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, client, lead, or description..."
                className={`${fieldClass} pl-10 pr-4`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <ArrowUpDown className="h-3.5 w-3.5 text-teal-600" />
              Sort by
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`${fieldClass} pl-3 pr-9`}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {tasks.length} of {allTasks.length} task{allTasks.length === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={tasks}
          emptyMessage={
            filter === 'overdue'
              ? 'No overdue tasks — you\'re on track!'
              : filter === 'today'
                ? 'Nothing due today. Enjoy the clear schedule!'
                : 'No tasks yet. Add your first follow-up to get started.'
          }
        />
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
            <textarea
              className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
