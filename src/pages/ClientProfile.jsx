import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Calendar, CalendarCheck, CheckSquare, FileText,
  Globe, Loader2, Mail, MapPin, Mic, Phone, Sparkles, Target, User,
  ChevronRight, StickyNote,
} from 'lucide-react'
import { getClient, getClientRelatedData } from '../services/clients'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ClientTimeline from '../components/clients/ClientTimeline'
import { formatDate, formatCurrency, formatDateTime, labelFor, formatClientName } from '../utils/format'
import { buildClientTimeline, buildClientInsights } from '../utils/clientTimeline'
import {
  LEAD_STATUSES, QUOTATION_STATUSES, BOOKING_STATUSES, TRAVEL_TYPES, CLIENT_TYPES,
} from '../constants/enums'
import { LeadStatusBadge, LeadTravelTypeBadge } from '../components/leads/LeadTableCells'

const TABS = [
  { key: 'leads', label: 'Leads', icon: Target, tone: 'teal' },
  { key: 'quotations', label: 'Quotations', icon: FileText, tone: 'violet' },
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck, tone: 'sky' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, tone: 'amber' },
  { key: 'voiceNotes', label: 'Voice Notes', icon: Mic, tone: 'rose' },
]

const TAB_ACTIVE = {
  teal: 'border-teal-200/90 bg-gradient-to-b from-teal-50 via-white to-white text-teal-900 ring-teal-500/15',
  violet: 'border-violet-200/90 bg-gradient-to-b from-violet-50 via-white to-white text-violet-900 ring-violet-500/15',
  sky: 'border-sky-200/90 bg-gradient-to-b from-sky-50 via-white to-white text-sky-900 ring-sky-500/15',
  amber: 'border-amber-200/90 bg-gradient-to-b from-amber-50 via-white to-white text-amber-900 ring-amber-500/15',
  rose: 'border-rose-200/90 bg-gradient-to-b from-rose-50 via-white to-white text-rose-900 ring-rose-500/15',
}

function getInitials(client) {
  const name = formatClientName(client)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function InfoTile({ icon: Icon, label, value, href, accent = 'slate' }) {
  const accents = {
    teal: 'border-teal-100/80 bg-gradient-to-br from-teal-50/80 to-white text-teal-900',
    sky: 'border-sky-100/80 bg-gradient-to-br from-sky-50/80 to-white text-sky-900',
    violet: 'border-violet-100/80 bg-gradient-to-br from-violet-50/80 to-white text-violet-900',
    slate: 'border-slate-100/80 bg-gradient-to-br from-slate-50/80 to-white text-slate-800',
  }
  const iconAccents = {
    teal: 'bg-teal-600 text-white shadow-teal-900/20',
    sky: 'bg-sky-600 text-white shadow-sky-900/20',
    violet: 'bg-violet-600 text-white shadow-violet-900/20',
    slate: 'bg-slate-700 text-white shadow-slate-900/20',
  }

  const content = (
    <div className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${accents[accent]}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${iconAccents[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold">{value || '—'}</p>
        </div>
      </div>
    </div>
  )

  if (href && value) {
    return (
      <a href={href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30">
        {content}
      </a>
    )
  }
  return content
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [related, setRelated] = useState({ leads: [], quotations: [], bookings: [], tasks: [], voiceNotes: [] })
  const [activeTab, setActiveTab] = useState('leads')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      setLoading(true)
      const [clientData, relatedData] = await Promise.all([
        getClient(id),
        getClientRelatedData(id),
      ])
      setClient(clientData)
      setRelated(relatedData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(
    () => ({
      leads: related.leads.length,
      quotations: related.quotations.length,
      bookings: related.bookings.length,
      tasks: related.tasks.length,
    }),
    [related],
  )

  const timeline = useMemo(
    () => buildClientTimeline(related),
    [related],
  )

  const insights = useMemo(
    () => buildClientInsights(related),
    [related],
  )

  function handleTimelineSelect(entry) {
    const tabMap = { booking: 'bookings', quotation: 'quotations', lead: 'leads' }
    const tab = tabMap[entry.sourceType]
    if (tab) setActiveTab(tab)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">Client not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/clients')}>
          Back to clients
        </Button>
      </div>
    )
  }

  const isBusiness = client.client_type === 'business'
  const displayName = formatClientName(client)

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-teal-950 to-violet-950 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to clients
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className={`absolute inset-0 rounded-2xl blur-md ${isBusiness ? 'bg-violet-400/40' : 'bg-teal-400/40'}`} />
                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-xl ring-2 ring-white/20 sm:h-20 sm:w-20 sm:text-2xl ${
                    isBusiness
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-700'
                      : 'bg-gradient-to-br from-teal-500 to-sky-700'
                  }`}
                >
                  {getInitials(client)}
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100">
                  {isBusiness ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  {labelFor(CLIENT_TYPES, client.client_type || 'individual')}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{displayName}</h1>
                {isBusiness && client.full_name && (
                  <p className="mt-1 text-sm text-slate-300">
                    Primary contact: <span className="font-medium text-white">{client.full_name}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Client since {formatDateTime(client.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link to={`/leads?client=${id}`}>
                <Button variant="secondary" size="sm" className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20">
                  <Target className="h-4 w-4" /> Add lead
                </Button>
              </Link>
              <Link to={`/quotations?client=${id}`}>
                <Button size="sm" className="shadow-lg shadow-teal-900/30">
                  <FileText className="h-4 w-4" /> Create quotation
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Leads', value: stats.leads, icon: Target },
              { label: 'Quotations', value: stats.quotations, icon: FileText },
              { label: 'Bookings', value: stats.bookings, icon: CalendarCheck },
              { label: 'Tasks', value: stats.tasks, icon: CheckSquare },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm transition hover:bg-white/10"
              >
                <div className="flex items-center gap-2 text-teal-200/80">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ClientTimeline
        clientName={displayName}
        timeline={timeline}
        insights={insights}
        onSelectEntry={handleTimelineSelect}
      />

      {/* Contact details */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Contact & profile</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile icon={Mail} label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : null} accent="sky" />
          <InfoTile icon={Phone} label="Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : null} accent="teal" />
          {isBusiness ? (
            <InfoTile icon={Building2} label="Company" value={client.company_name} accent="violet" />
          ) : (
            <>
              <InfoTile icon={Globe} label="Nationality" value={client.nationality} accent="slate" />
              <InfoTile icon={User} label="Passport" value={client.passport_number} accent="slate" />
              <InfoTile icon={Calendar} label="Date of birth" value={formatDate(client.date_of_birth)} accent="slate" />
            </>
          )}
          {isBusiness && client.nationality && (
            <InfoTile icon={Globe} label="Nationality" value={client.nationality} accent="slate" />
          )}
        </div>
        {client.notes && (
          <div className="mt-4 rounded-xl border border-amber-100/80 bg-gradient-to-br from-amber-50/50 to-white p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-800">
              <StickyNote className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Notes</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Activity tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ key, label, icon: Icon, tone }) => {
            const active = activeTab === key
            const count = related[key]?.length || 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`group relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? `${TAB_ACTIVE[tone]} shadow-md ring-1`
                    : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className={`text-sm font-semibold ${active ? '' : 'text-slate-700'}`}>{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${active ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'leads' && (
        <ActivityList
          items={related.leads}
          emptyIcon={Target}
          empty="No leads linked to this client yet."
          render={(item) => (
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-transparent p-4 text-left transition hover:border-teal-100 hover:bg-teal-50/30"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.destination || 'General inquiry'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <LeadTravelTypeBadge travelType={item.travel_type} />
                    <span className="text-xs text-slate-500">
                      Budget: {item.budget != null ? formatCurrency(item.budget) : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <LeadStatusBadge status={item.status} />
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600" />
              </div>
            </button>
          )}
        />
      )}

      {activeTab === 'quotations' && (
        <ActivityList
          items={related.quotations}
          emptyIcon={FileText}
          empty="No quotations for this client."
          render={(item) => (
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-transparent p-4 text-left transition hover:border-violet-100 hover:bg-violet-50/30"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(item.selling_price, item.currency)} · Profit {formatCurrency(item.profit, item.currency)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge status={item.status} label={labelFor(QUOTATION_STATUSES, item.status)} />
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-600" />
              </div>
            </button>
          )}
        />
      )}

      {activeTab === 'bookings' && (
        <ActivityList
          items={related.bookings}
          emptyIcon={CalendarCheck}
          empty="No bookings for this client."
          render={(item) => (
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-transparent p-4 text-left transition hover:border-sky-100 hover:bg-sky-50/30"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{item.booking_reference || 'Booking'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Balance {formatCurrency(item.balance_due)} · Due {formatDate(item.due_date)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge status={item.status} label={labelFor(BOOKING_STATUSES, item.status)} />
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-600" />
              </div>
            </button>
          )}
        />
      )}

      {activeTab === 'tasks' && (
        <ActivityList
          items={related.tasks}
          emptyIcon={CheckSquare}
          empty="No tasks for this client."
          render={(item) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-transparent p-4 transition hover:border-amber-100 hover:bg-amber-50/30">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                  <CheckSquare className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Due {formatDate(item.due_date)}</p>
                </div>
              </div>
              <Badge status={item.status} />
            </div>
          )}
        />
      )}

      {activeTab === 'voiceNotes' && (
        <ActivityList
          items={related.voiceNotes}
          emptyIcon={Mic}
          empty="No voice notes linked to this client."
          render={(item) => (
            <div className="rounded-xl border border-transparent p-4 transition hover:border-rose-100 hover:bg-rose-50/20">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
                  <Mic className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-slate-800">{item.transcript || 'No transcript'}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDateTime(item.created_at)} · {item.processing_status}
                  </p>
                </div>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}

function ActivityList({ items, render, empty, emptyIcon: EmptyIcon }) {
  if (!items.length) {
    return <EmptyState icon={EmptyIcon} message={empty} />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="pointer-events-none h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id}>{render(item)}</li>
        ))}
      </ul>
    </div>
  )
}
