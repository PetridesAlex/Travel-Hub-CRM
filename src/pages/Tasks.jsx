import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, CheckCircle2, Circle, CheckSquare,
  Clock, AlertTriangle, Search, ArrowUpDown, ChevronDown, Loader2,
  Target, User, Calendar, Sparkles, SlidersHorizontal, MoreHorizontal,
  ListTodo, Link2, Flag,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
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
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const FILTER_TABS = [
  {
    id: 'all',
    label: 'All Tasks',
    icon: CheckSquare,
    tab: {
      activeClass: 'border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-sky-50/40 text-teal-900 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/15',
      iconActive: 'bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-md shadow-teal-900/20',
      countActive: 'bg-teal-600 text-white shadow-sm',
      accent: 'from-teal-400 to-sky-500',
    },
  },
  {
    id: 'today',
    label: 'Due Today',
    icon: Clock,
    tab: {
      activeClass: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 text-amber-900 shadow-md shadow-amber-900/5 ring-1 ring-amber-500/15',
      iconActive: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/20',
      countActive: 'bg-amber-600 text-white shadow-sm',
      accent: 'from-amber-400 to-orange-500',
    },
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: Circle,
    tab: {
      activeClass: 'border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-blue-50/30 text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-500/15',
      iconActive: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-900/20',
      countActive: 'bg-sky-600 text-white shadow-sm',
      accent: 'from-sky-400 to-blue-500',
    },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: AlertTriangle,
    tab: {
      activeClass: 'border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-red-50/30 text-rose-900 shadow-md shadow-rose-900/5 ring-1 ring-rose-500/15',
      iconActive: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-900/20',
      countActive: 'bg-rose-600 text-white shadow-sm',
      accent: 'from-rose-400 to-red-500',
    },
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    tab: {
      activeClass: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-900 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/15',
      iconActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20',
      countActive: 'bg-emerald-600 text-white shadow-sm',
      accent: 'from-emerald-400 to-teal-500',
    },
  },
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
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-sky-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20'

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
  if (days < 0) return { label: 'Overdue', className: 'bg-rose-50 text-rose-700 ring-rose-100' }
  if (days === 0) return { label: 'Due today', className: 'bg-amber-50 text-amber-700 ring-amber-100' }
  if (days <= 3) return { label: `In ${days}d`, className: 'bg-sky-50 text-sky-700 ring-sky-100' }
  return null
}

function TaskStatusBadge({ status }) {
  const label = labelFor(TASK_STATUSES, status)
  return (
    <span className={`inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold shadow-sm ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
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

function TasksEmptyState({ filter, onAdd }) {
  const messages = {
    overdue: { title: 'No overdue tasks', desc: "You're on track — nothing past its due date.", icon: CheckCircle2 },
    today: { title: 'Clear schedule today', desc: 'Nothing due today. Enjoy the breathing room.', icon: Clock },
    completed: { title: 'No completed tasks yet', desc: 'Finished follow-ups will appear here.', icon: CheckCircle2 },
    pending: { title: 'No pending tasks', desc: 'All caught up! Add a new follow-up when needed.', icon: ListTodo },
    all: { title: 'Stay ahead of every follow-up', desc: 'Create tasks linked to clients and leads — never miss a callback or deadline.', icon: ListTodo },
  }
  const msg = messages[filter] || messages.all
  const Icon = msg.icon

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-sky-200/80 bg-gradient-to-b from-sky-50/60 via-white to-teal-50/40 px-6 py-16 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-lg shadow-sky-900/25 ring-4 ring-white">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">{msg.title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{msg.desc}</p>
      {filter !== 'overdue' && filter !== 'completed' && (
        <Button onClick={onAdd} className="mt-6 shadow-lg shadow-sky-900/20">
          <Plus className="h-4 w-4" />
          Add your first task
        </Button>
      )}
    </div>
  )
}

export default function Tasks() {
  const { user } = useAuth()
  const { agency } = useAgency()
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
        await createTask(payload, user.id, agency?.id)
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
  }), [filterCounts])

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

  const filterLabel = FILTER_TABS.find((t) => t.id === filter)?.label || 'All Tasks'

  const columns = [
    {
      key: 'complete',
      label: '',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-14`,
      headerRender: () => <span className="sr-only">Complete</span>,
      cellClassName: `${PREMIUM_CELL_CLASS} w-14`,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleComplete(row) }}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            row.status === 'completed'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-900/10'
              : 'border-slate-200 bg-white text-slate-300 hover:scale-105 hover:border-emerald-400 hover:text-emerald-500'
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
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={ListTodo} label="Task" accent="gradient" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <div className="min-w-[10rem]">
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
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Link2} label="Linked" accent="teal" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
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
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Calendar} label="Due" accent="amber" surface="light" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => {
        const urgency = getDueUrgency(row.due_date, row.status)
        return (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
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
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Flag} label="Status" accent="emerald" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <TaskStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-[1%] whitespace-nowrap`,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" surface="light" />,
      cellClassName: `${PREMIUM_CELL_CLASS} w-[1%] whitespace-nowrap`,
      render: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
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

  function isTaskOverdue(task) {
    if (task.status === 'completed' || !task.due_date) return false
    return differenceInDays(parseISO(task.due_date), new Date()) < 0
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              Follow-ups & deadlines
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Tasks & Follow-ups</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Stay on top of client callbacks, lead follow-ups, and booking deadlines — never miss a beat
            </p>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-lg shadow-sky-900/30">
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total tasks', value: stats.total, icon: CheckSquare },
            { label: 'Due today', value: stats.dueToday, icon: Clock },
            { label: 'Pending', value: stats.pending, icon: Circle },
            { label: 'Overdue', value: stats.overdue, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-sky-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map(({ id, label, icon: Icon, tab }) => {
            const count = filterCounts[id]
            const active = filter === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`group relative flex min-w-[7rem] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all duration-300 sm:min-w-[8rem] sm:px-4 sm:py-3.5 ${
                  active
                    ? tab.activeClass
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-md'
                }`}
              >
                {active && (
                  <span className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r ${tab.accent}`} />
                )}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    active
                      ? `${tab.iconActive} scale-105`
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
                    active ? tab.countActive : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & sort */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md shadow-sky-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Search & sort</p>
              <p className="text-xs text-slate-500">Find tasks by title, client, lead, or description</p>
            </div>
          </div>
          <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold tabular-nums text-sky-800">
            {tasks.length} of {allTasks.length} shown
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Search className="h-3.5 w-3.5 text-sky-600" />
              Search tasks
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
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
              <ArrowUpDown className="h-3.5 w-3.5 text-sky-600" />
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
        {search && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200/80">
              &quot;{search}&quot;
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
          <p className="text-sm text-slate-500">Loading tasks…</p>
        </div>
      ) : tasks.length === 0 ? (
        <TasksEmptyState filter={filter} onAdd={openAdd} />
      ) : (
        <Table
          variant="premium"
          headerTone="light"
          caption={filterLabel}
          captionCount={`${tasks.length} shown`}
          columns={columns}
          data={tasks}
          getRowClassName={(row) => (isTaskOverdue(row) ? 'bg-rose-50/40' : '')}
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
              className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
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
