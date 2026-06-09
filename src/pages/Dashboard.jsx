import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth } from 'date-fns'
import {
  Users, Target, FileText, CalendarCheck, CheckSquare, Wallet,
  ArrowRight, Plane, Mic, Plus, Receipt, ScrollText,
  TrendingUp, Clock, MapPin, Sparkles, Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { checkPaymentRemindersSlack } from '../services/slackNotify'
import { formatCurrency, formatDate, getTodayISO } from '../utils/format'
import { LEAD_STATUSES } from '../constants/enums'
import RecentActivityFeed from '../components/dashboard/RecentActivityFeed'

const PIPELINE_COLORS = {
  new: 'from-sky-400 to-sky-600',
  contacted: 'from-blue-400 to-blue-600',
  quoted: 'from-violet-400 to-violet-600',
  follow_up: 'from-amber-400 to-amber-600',
  confirmed: 'from-emerald-400 to-emerald-600',
  lost: 'from-slate-300 to-slate-400',
}

const ACTIVITY_META = {
  Client: { icon: Users, color: 'text-teal-600 bg-teal-50 ring-teal-100' },
  Lead: { icon: Target, color: 'text-sky-600 bg-sky-50 ring-sky-100' },
  Quotation: { icon: FileText, color: 'text-violet-600 bg-violet-50 ring-violet-100' },
  Booking: { icon: CalendarCheck, color: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
  Invoice: { icon: ScrollText, color: 'text-amber-600 bg-amber-50 ring-amber-100' },
  Receipt: { icon: Receipt, color: 'text-green-600 bg-green-50 ring-green-100' },
}

// ACTIVITY_META kept for potential reuse; Recent Activity uses RecentActivityFeed

const QUICK_ACTIONS = [
  { label: 'Add Client', to: '/clients', icon: Users, accent: 'teal' },
  { label: 'New Lead', to: '/leads', icon: Target, accent: 'sky' },
  { label: 'AI Generator', to: '/ai-workspace/generator', icon: Sparkles, accent: 'violet' },
  { label: 'Voice Note', to: '/voice-notes', icon: Mic, accent: 'amber' },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getUserFirstName(user) {
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0]
  }
  const email = user?.email || ''
  const local = email.split('@')[0] || 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

function MetricCard({ title, value, subtitle, icon: Icon, gradient, to }) {
  const body = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {to && (
        <div className="relative mt-4 flex items-center gap-1 text-xs font-semibold text-teal-700 opacity-0 transition-opacity group-hover:opacity-100">
          View details <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  )

  if (to) {
    return <Link to={to} className="block h-full">{body}</Link>
  }
  return body
}

function SectionCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/35 to-transparent" />
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/20">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h3 className="font-semibold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    clients: 0,
    activeLeads: 0,
    pendingQuotations: 0,
    confirmedBookings: 0,
    followUpsToday: 0,
    tasksToday: 0,
    pendingBalances: 0,
    collectedThisMonth: 0,
    outstandingInvoices: 0,
    overdueInvoices: 0,
  })
  const [pipeline, setPipeline] = useState([])
  const [todayFocus, setTodayFocus] = useState([])
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboard()
    checkPaymentRemindersSlack(session)
  }, [session])

  async function loadDashboard() {
    try {
      const today = getTodayISO()
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

      const [
        clientsRes,
        activeLeadsRes,
        pendingQuotesRes,
        confirmedBookingsRes,
        followUpsRes,
        tasksTodayRes,
        bookingsRes,
        receiptsRes,
        outstandingInvoicesRes,
        overdueInvoicesRes,
        leadsStatusRes,
        followUpLeadsRes,
        tasksDueRes,
        upcomingBookingsRes,
        recentClients,
        recentLeads,
        recentQuotes,
        recentBookings,
        recentInvoices,
        recentReceipts,
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '(confirmed,lost)'),
        supabase.from('quotations').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('follow_up_date', today).not('status', 'in', '(confirmed,lost)'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('due_date', today).eq('status', 'pending'),
        supabase.from('bookings').select('balance_due').gt('balance_due', 0),
        supabase.from('receipts').select('amount').gte('payment_date', monthStart),
        supabase.from('invoices').select('total_amount').in('status', ['sent', 'overdue']),
        supabase.from('invoices').select('total_amount').eq('status', 'overdue'),
        supabase.from('leads').select('status'),
        supabase.from('leads').select('id, destination, follow_up_date, clients(full_name)').eq('follow_up_date', today).not('status', 'in', '(confirmed,lost)').limit(5),
        supabase.from('tasks').select('id, title, due_date').eq('due_date', today).eq('status', 'pending').limit(5),
        supabase.from('bookings').select('id, booking_reference, travel_start_date, travel_end_date, status, clients(full_name, company_name)').gte('travel_start_date', today).in('status', ['pending', 'confirmed']).order('travel_start_date', { ascending: true }).limit(5),
        supabase.from('clients').select('id, full_name, company_name, client_type, email, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('leads').select('id, destination, status, notes, created_at, clients(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('quotations').select('id, title, status, selling_price, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('id, booking_reference, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('id, invoice_number, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('receipts').select('id, receipt_number, amount, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      const pendingBalances = (bookingsRes.data || []).reduce((sum, b) => sum + Number(b.balance_due || 0), 0)
      const collectedThisMonth = (receiptsRes.data || []).reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const outstandingInvoices = (outstandingInvoicesRes.data || []).reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
      const overdueInvoices = (overdueInvoicesRes.data || []).reduce((sum, i) => sum + Number(i.total_amount || 0), 0)

      const statusCounts = (leadsStatusRes.data || []).reduce((acc, lead) => {
        const key = lead.status || 'new'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      const pipelineData = LEAD_STATUSES.map((s) => ({
        ...s,
        count: statusCounts[s.value] || 0,
      })).filter((s) => s.count > 0 || ['new', 'contacted', 'quoted', 'follow_up'].includes(s.value))

      const focusItems = [
        ...(followUpLeadsRes.data || []).map((lead) => ({
          id: `lead-${lead.id}`,
          type: 'lead',
          title: lead.destination || 'Lead follow-up',
          subtitle: lead.clients?.full_name ? `Client: ${lead.clients.full_name}` : 'Follow up today',
          to: '/leads',
        })),
        ...(tasksDueRes.data || []).map((task) => ({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          subtitle: 'Task due today',
          to: '/tasks',
        })),
      ]

      setStats({
        clients: clientsRes.count || 0,
        activeLeads: activeLeadsRes.count || 0,
        pendingQuotations: pendingQuotesRes.count || 0,
        confirmedBookings: confirmedBookingsRes.count || 0,
        followUpsToday: followUpsRes.count || 0,
        tasksToday: tasksTodayRes.count || 0,
        pendingBalances,
        collectedThisMonth,
        outstandingInvoices,
        overdueInvoices,
      })
      setPipeline(pipelineData)
      setTodayFocus(focusItems)
      setUpcomingTrips(upcomingBookingsRes.data || [])

      const activity = [
        ...(recentClients.data || []).map((r) => ({
          id: r.id,
          type: 'Client',
          label: r.company_name || r.full_name,
          subtitle: r.email || (r.client_type === 'business' ? 'Corporate account' : 'Individual traveller'),
          date: r.created_at,
          to: '/clients',
        })),
        ...(recentLeads.data || []).map((r) => ({
          id: r.id,
          type: 'Lead',
          label: r.destination || 'New lead',
          notes: r.notes,
          subtitle: r.clients?.full_name ? `Client: ${r.clients.full_name}` : '',
          meta: r.status ? r.status.replace(/_/g, ' ') : '',
          date: r.created_at,
          to: '/leads',
        })),
        ...(recentQuotes.data || []).map((r) => ({
          id: r.id,
          type: 'Quotation',
          label: r.title,
          subtitle: r.selling_price != null ? formatCurrency(r.selling_price) : '',
          meta: r.status,
          date: r.created_at,
          to: '/quotations',
        })),
        ...(recentBookings.data || []).map((r) => ({
          id: r.id,
          type: 'Booking',
          label: r.booking_reference || 'New booking',
          meta: r.status,
          date: r.created_at,
          to: '/bookings',
        })),
        ...(recentInvoices.data || []).map((r) => ({
          id: r.id,
          type: 'Invoice',
          label: r.invoice_number,
          subtitle: formatCurrency(r.total_amount),
          meta: r.status,
          date: r.created_at,
          to: '/invoices',
        })),
        ...(recentReceipts.data || []).map((r) => ({
          id: r.id,
          type: 'Receipt',
          label: r.receipt_number,
          subtitle: formatCurrency(r.amount),
          date: r.created_at,
          to: '/receipts',
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)

      setRecentActivity(activity)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const pipelineTotal = useMemo(() => pipeline.reduce((sum, s) => sum + s.count, 0), [pipeline])
  const agencyName = agency?.name || 'Your Travel Agency'
  const firstName = getUserFirstName(user)
  const todayLabel = format(new Date(), 'EEEE, d MMMM yyyy')

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          <span className="text-sm font-medium text-slate-600">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-teal-200 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {agencyName}
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {getGreeting()}, {firstName}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Your command centre for clients, sales pipeline, bookings, and finances — all in one place.
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{todayLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            {[
              { label: 'Active leads', value: stats.activeLeads },
              { label: 'Confirmed', value: stats.confirmedBookings },
              { label: 'Follow-ups', value: stats.followUpsToday },
              { label: 'Tasks today', value: stats.tasksToday },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-teal-200 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <Plus className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-teal-600" />
          </Link>
        ))}
      </div>

      {/* KPI metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total Clients" value={stats.clients} subtitle="Individuals & corporate" icon={Users} gradient="from-teal-400 to-teal-700" to="/clients" />
        <MetricCard title="Active Leads" value={stats.activeLeads} subtitle="In your sales pipeline" icon={Target} gradient="from-sky-400 to-sky-700" to="/leads" />
        <MetricCard title="Pending Quotes" value={stats.pendingQuotations} subtitle="Draft & sent quotations" icon={FileText} gradient="from-violet-400 to-violet-700" to="/quotations" />
        <MetricCard title="Confirmed Bookings" value={stats.confirmedBookings} subtitle="Ready to travel" icon={CalendarCheck} gradient="from-emerald-400 to-emerald-700" to="/bookings" />
        <MetricCard title="Collected This Month" value={formatCurrency(stats.collectedThisMonth)} subtitle="Payments received" icon={TrendingUp} gradient="from-green-400 to-green-700" to="/receipts" />
        <MetricCard title="Outstanding" value={formatCurrency(stats.pendingBalances)} subtitle={stats.overdueInvoices > 0 ? `${formatCurrency(stats.overdueInvoices)} overdue` : 'Booking balances due'} icon={Wallet} gradient="from-amber-400 to-amber-700" to="/bookings" />
      </div>

      {/* Pipeline + Finance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Sales Pipeline" subtitle="Lead status breakdown" icon={Target}>
          {pipelineTotal === 0 ? (
            <p className="text-sm text-slate-500">No leads yet. Add your first lead to start building your pipeline.</p>
          ) : (
            <div className="space-y-4">
              {pipeline.map((stage) => {
                const pct = pipelineTotal ? Math.round((stage.count / pipelineTotal) * 100) : 0
                return (
                  <div key={stage.value}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{stage.label}</span>
                      <span className="tabular-nums text-slate-500">{stage.count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${PIPELINE_COLORS[stage.value] || 'from-slate-400 to-slate-500'} transition-all duration-500`}
                        style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <Link to="/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                Manage leads <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Financial Snapshot" subtitle="Collections & receivables" icon={Wallet}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Collected</p>
                <p className="mt-2 text-xl font-bold text-emerald-900">{formatCurrency(stats.collectedThisMonth)}</p>
                <p className="mt-1 text-xs text-emerald-700/80">This month</p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Receivable</p>
                <p className="mt-2 text-xl font-bold text-amber-900">{formatCurrency(stats.outstandingInvoices)}</p>
                <p className="mt-1 text-xs text-amber-700/80">Sent & overdue invoices</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/invoices" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                View invoices
              </Link>
              <Link to="/receipts" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                View receipts
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Today + Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Today's Focus"
          subtitle={`${stats.followUpsToday} follow-ups · ${stats.tasksToday} tasks`}
          icon={CheckSquare}
          action={
            <Link to="/tasks" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
              All tasks
            </Link>
          }
        >
          {todayFocus.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-5">
              <Clock className="h-5 w-5 text-slate-400" />
              <p className="text-sm text-slate-500">You&apos;re all caught up for today. Great work!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayFocus.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.type === 'lead' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.type === 'lead' ? <Target className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Departures"
          subtitle="Confirmed & pending trips"
          icon={Plane}
          action={
            <Link to="/bookings" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
              All bookings
            </Link>
          }
        >
          {upcomingTrips.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-5">
              <MapPin className="h-5 w-5 text-slate-400" />
              <p className="text-sm text-slate-500">No upcoming departures scheduled.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcomingTrips.map((trip) => {
                const clientName = trip.clients?.company_name || trip.clients?.full_name || 'Client'
                return (
                  <li
                    key={trip.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                      <Plane className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {trip.booking_reference || 'Booking'} · {clientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Departs {formatDate(trip.travel_start_date)}
                        {trip.travel_end_date ? ` → ${formatDate(trip.travel_end_date)}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                      {trip.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Recent activity */}
      <SectionCard title="Recent Activity" subtitle="Latest updates across your agency" icon={Clock}>
        <RecentActivityFeed activity={recentActivity} />
      </SectionCard>
    </div>
  )
}
