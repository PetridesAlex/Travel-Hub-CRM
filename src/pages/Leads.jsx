import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, SlidersHorizontal, Sparkles, Target, TrendingUp, CalendarClock,
  User, Mail, MapPin, Tag, Wallet, Flag, Calendar, MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getLeads, createLead, updateLead, deleteLead } from '../services/leads'
import { getClients } from '../services/clients'
import { createTask } from '../services/tasks'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import LeadInquiryCell from '../components/leads/LeadInquiryCell'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'
import {
  LeadActionsCell,
  LeadBudgetCell,
  LeadClientCell,
  LeadContactCell,
  LeadFollowUpCell,
  LeadStatusBadge,
  LeadTravelTypeBadge,
} from '../components/leads/LeadTableCells'
import { TRAVEL_TYPES, LEAD_STATUSES } from '../constants/enums'
import { formatClientName, formatClientOptionLabel } from '../utils/format'
import { LEAD_STATUS_ROW_ACCENT } from '../utils/leadDisplay'
import { notifySlack } from '../services/slackNotify'
import { defaultLeadFollowUpDate } from '../utils/exportPdf'

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

const STATUS_TABS = [
  { id: '', label: 'All Leads', tone: 'slate' },
  { id: 'new', label: 'New', tone: 'blue' },
  { id: 'contacted', label: 'Contacted', tone: 'indigo' },
  { id: 'quoted', label: 'Quoted', tone: 'purple' },
  { id: 'follow_up', label: 'Follow Up', tone: 'amber' },
  { id: 'confirmed', label: 'Confirmed', tone: 'emerald' },
  { id: 'lost', label: 'Lost', tone: 'red' },
]

const TAB_ACTIVE = {
  slate: 'border-slate-300/90 bg-gradient-to-b from-slate-100 via-white to-white text-slate-900 ring-slate-400/15',
  blue: 'border-blue-200/90 bg-gradient-to-b from-blue-50 via-white to-white text-blue-900 ring-blue-500/15',
  indigo: 'border-indigo-200/90 bg-gradient-to-b from-indigo-50 via-white to-white text-indigo-900 ring-indigo-500/15',
  purple: 'border-purple-200/90 bg-gradient-to-b from-purple-50 via-white to-white text-purple-900 ring-purple-500/15',
  amber: 'border-amber-200/90 bg-gradient-to-b from-amber-50 via-white to-white text-amber-900 ring-amber-500/15',
  emerald: 'border-emerald-200/90 bg-gradient-to-b from-emerald-50 via-white to-white text-emerald-900 ring-emerald-500/15',
  red: 'border-red-200/90 bg-gradient-to-b from-red-50 via-white to-white text-red-900 ring-red-500/15',
}

const fieldClass =
  'w-full appearance-none rounded-xl border border-slate-200/80 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

function FilterField({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function Leads() {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [allLeads, setAllLeads] = useState([])
  const [clients, setClients] = useState([])
  const [filters, setFilters] = useState({ status: '', travel_type: '' })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [filters.travel_type])

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
        getLeads({ travel_type: filters.travel_type }),
        getClients(),
      ])
      setAllLeads(leadsData)
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
        const lead = await createLead(payload, user.id, agency?.id)
        const linkedClient = clients.find((c) => c.id === payload.client_id)
        notifySlack(session, 'lead_created', {
          client_name: linkedClient ? formatClientName(linkedClient) : '—',
          email: linkedClient?.email,
          phone: linkedClient?.phone,
          destination: payload.destination || '—',
          message: payload.notes,
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
          }, user.id, agency?.id)
        } else {
          const dueDate = defaultLeadFollowUpDate()
          await createTask({
            client_id: payload.client_id || null,
            lead_id: lead.id,
            title: `Follow up: ${payload.destination || 'New lead'}`,
            due_date: dueDate,
            status: 'pending',
          }, user.id, agency?.id)
          await updateLead(lead.id, { follow_up_date: dueDate })
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

  const leads = useMemo(() => {
    if (!filters.status) return allLeads
    return allLeads.filter((l) => l.status === filters.status)
  }, [allLeads, filters.status])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return {
      total: allLeads.length,
      new: allLeads.filter((l) => l.status === 'new').length,
      followUpDue: allLeads.filter((l) => {
        if (!l.follow_up_date || ['confirmed', 'lost'].includes(l.status)) return false
        const due = new Date(l.follow_up_date)
        due.setHours(0, 0, 0, 0)
        return due <= today
      }).length,
    }
  }, [allLeads])

  const statusCounts = useMemo(() => {
    const counts = { '': allLeads.length }
    LEAD_STATUSES.forEach(({ value }) => {
      counts[value] = allLeads.filter((l) => l.status === value).length
    })
    return counts
  }, [allLeads])

  const columns = [
    {
      key: 'client',
      label: 'Client',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={User} label="Client" accent="teal" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => <LeadClientCell client={row.clients} />,
    },
    {
      key: 'contact',
      label: 'Contact',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={Mail} label="Contact" accent="sky" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <LeadContactCell client={row.clients} />,
    },
    {
      key: 'destination',
      label: 'Destination',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={MapPin} label="Destination" accent="gradient" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => <LeadInquiryCell lead={row} />,
    },
    {
      key: 'travel_type',
      label: 'Type',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={Tag} label="Type" accent="violet" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => <LeadTravelTypeBadge travelType={row.travel_type} />,
    },
    {
      key: 'budget',
      label: 'Budget',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={Wallet} label="Budget" accent="emerald" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => <LeadBudgetCell budget={row.budget} />,
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Flag} label="Status" accent="amber" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => <LeadStatusBadge status={row.status} />,
    },
    {
      key: 'follow_up_date',
      label: 'Follow-up',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden lg:table-cell`,
      headerRender: () => <LeadTableHeader icon={Calendar} label="Follow-up" accent="rose" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden lg:table-cell`,
      render: (row) => <LeadFollowUpCell followUpDate={row.follow_up_date} status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-16 sm:w-20`,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" />,
      cellClassName: `${PREMIUM_CELL_CLASS} w-16 sm:w-20`,
      render: (row) => (
        <LeadActionsCell
          onCreateQuote={() => navigate(`/quotations?lead=${row.id}`)}
          onEdit={() => openEdit(row)}
          onDelete={() => handleDelete(row)}
        />
      ),
    },
  ]

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-4 shadow-xl shadow-slate-900/10 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">
              <Sparkles className="h-3.5 w-3.5" />
              Pipeline
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Leads</h2>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">Track enquiries, contact details, and opportunities in one place</p>
          </div>
          <Button onClick={openAdd} className="relative shrink-0 shadow-lg shadow-teal-900/30">
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>

        <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total leads', value: stats.total, icon: Target, accent: 'from-blue-400 to-cyan-400' },
            { label: 'New enquiries', value: stats.new, icon: TrendingUp, accent: 'from-violet-400 to-fuchsia-400' },
            { label: 'Follow-ups due', value: stats.followUpDue, icon: CalendarClock, accent: 'from-amber-400 to-orange-400' },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(({ id, label, tone }) => {
            const active = filters.status === id
            return (
              <button
                key={id || 'all'}
                type="button"
                onClick={() => setFilters({ ...filters, status: id })}
                className={`group relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? `${TAB_ACTIVE[tone]} shadow-md ring-1`
                    : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <span className={`text-sm font-semibold ${active ? '' : 'text-slate-700'}`}>{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${active ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                  {statusCounts[id] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)] sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/20">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Filters</p>
              <p className="text-xs text-slate-500">Narrow by travel type</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold tabular-nums text-slate-600 shadow-sm">
            {leads.length} of {allLeads.length} shown
          </span>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white/90 p-3 shadow-sm sm:p-4">
          <FilterField label="Travel type">
            <select
              value={filters.travel_type}
              onChange={(e) => setFilters({ ...filters, travel_type: e.target.value })}
              className={`${fieldClass} px-3`}
            >
              <option value="">All types</option>
              {TRAVEL_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-16 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Loading leads…</p>
        </div>
      ) : (
        <Table
          variant="premium"
          columns={columns}
          data={leads}
          emptyMessage="No leads yet. Add one or wait for website enquiries."
          getRowClassName={(row) => `border-l-[3px] ${LEAD_STATUS_ROW_ACCENT[row.status] || 'border-l-transparent'}`}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Lead' : 'Add Lead'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          {contactClient && (
            <div className="rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-3 text-sm">
              <p className="font-semibold text-slate-900">Contact details</p>
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
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
