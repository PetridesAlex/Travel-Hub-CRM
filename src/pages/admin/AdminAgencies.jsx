import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Euro,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { listAdminAgencies } from '../../services/adminAgencies'
import AdminPanelCard from '../../components/admin/AdminPanelCard'
import { AdminStatCard } from '../../components/admin/AdminPanelCard'
import SubscriptionBadge from '../../components/admin/SubscriptionBadge'
import AgencyLogo from '../../components/layout/AgencyLogo'
import Button from '../../components/ui/Button'
import { resolveAgencyLogoUrl } from '../../utils/resolveAgencyLogo'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'past_due', label: 'Past due' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: 'Create agency',
    description: 'Set company name, plan, and monthly price for the new customer.',
    action: 'New agency',
    to: '/admin/agencies/new',
  },
  {
    step: 2,
    title: 'Invite the owner',
    description: 'Send a Supabase invite so they can sign in and manage their workspace.',
    action: 'After create',
    to: null,
  },
  {
    step: 3,
    title: 'Customer setup',
    description: 'They complete Settings → Company, Integrations, and Team invites.',
    action: 'Their CRM',
    to: '/dashboard',
  },
  {
    step: 4,
    title: 'Mark as active',
    description: 'When payment is received, set subscription status to Active in admin.',
    action: 'Edit agency',
    to: null,
  },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPlan(plan) {
  if (!plan) return 'Starter'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export default function AdminAgencies() {
  const { session } = useAuth()
  const [agencies, setAgencies] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(overrides = {}) {
    setLoading(true)
    setError('')
    try {
      const data = await listAdminAgencies(session, {
        search: overrides.search ?? search,
        status: overrides.status ?? statusFilter,
      })
      setAgencies(data.agencies || [])
      setTotal(data.total ?? data.agencies?.length ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const active = agencies.filter((a) => a.subscription_status === 'active').length
    const trial = agencies.filter((a) => a.subscription_status === 'trial').length
    const needsOwner = agencies.filter((a) => !a.owner_email).length
    const mrr = agencies
      .filter((a) => a.subscription_status === 'active' && a.monthly_price != null)
      .reduce((sum, a) => sum + Number(a.monthly_price), 0)
    return { active, trial, needsOwner, mrr }
  }, [agencies])

  function handleStatusChange(next) {
    setStatusFilter(next)
    load({ status: next })
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-teal-950/50 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/90">Platform control</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Agency tenants</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Onboard travel agencies, invite owners, and track subscriptions. Each agency gets an isolated CRM workspace on Travel Hub.
            </p>
          </div>
          <Link to="/admin/agencies/new">
            <Button className="bg-teal-500 shadow-lg shadow-teal-900/30 hover:bg-teal-400">
              <Plus className="h-4 w-4" /> New agency
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total agencies" value={loading ? '…' : total} hint="On the platform" icon={Building2} accent="teal" />
        <AdminStatCard title="Active" value={loading ? '…' : stats.active} hint="Paying or live" icon={Sparkles} accent="emerald" />
        <AdminStatCard title="On trial" value={loading ? '…' : stats.trial} hint="Evaluation period" icon={Users} accent="amber" />
        <AdminStatCard
          title="Est. MRR"
          value={loading ? '…' : stats.mrr > 0 ? `€${stats.mrr.toLocaleString()}` : '—'}
          hint={stats.needsOwner > 0 ? `${stats.needsOwner} need owner invite` : 'From active plans'}
          icon={Euro}
          accent="violet"
        />
      </div>

      <AdminPanelCard>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">How to onboard a new customer</h3>
            <p className="mt-1 text-sm text-slate-500">Follow these steps when someone wants to buy Travel Hub CRM.</p>
          </div>
          <Link
            to="/admin/agencies/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-300 transition hover:text-teal-200"
          >
            Start now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ONBOARDING_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-teal-500/20 hover:bg-white/[0.04]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-300">
                {item.step}
              </span>
              <p className="mt-3 font-medium text-slate-200">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.description}</p>
              {item.to ? (
                <Link to={item.to} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300">
                  {item.action} <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <p className="mt-3 text-xs font-medium text-slate-600">{item.action}</p>
              )}
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard padding="p-4 sm:p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); load() }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agency name or email…"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => handleStatusChange(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === f.value
                    ? 'bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <Button type="submit" variant="secondary" size="sm" className="ml-1">
              Search
            </Button>
          </div>
        </form>
      </AdminPanelCard>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <AdminPanelCard padding="p-0 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-white">All agencies</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {loading ? 'Loading…' : `${agencies.length} shown${total > agencies.length ? ` of ${total}` : ''}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold sm:px-6">Agency</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="hidden px-4 py-3.5 font-semibold md:table-cell">Plan</th>
                <th className="hidden px-4 py-3.5 font-semibold lg:table-cell">Owner</th>
                <th className="hidden px-4 py-3.5 font-semibold sm:table-cell">Price</th>
                <th className="hidden px-4 py-3.5 font-semibold xl:table-cell">Joined</th>
                <th className="px-5 py-3.5 sm:px-6" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-400" />
                    <p className="mt-3 text-sm text-slate-500">Loading agencies…</p>
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <p className="mt-4 font-medium text-slate-300">No agencies yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                      Create your first customer workspace and invite their owner to get started.
                    </p>
                    <Link to="/admin/agencies/new" className="mt-5 inline-block">
                      <Button size="sm"><Plus className="h-4 w-4" /> Create first agency</Button>
                    </Link>
                  </td>
                </tr>
              ) : agencies.map((agency) => (
                <tr
                  key={agency.id}
                  className="group border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <AgencyLogo
                        name={agency.name}
                        logoUrl={resolveAgencyLogoUrl(agency)}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{agency.name}</p>
                        {agency.email && (
                          <p className="truncate text-xs text-slate-500">{agency.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SubscriptionBadge status={agency.subscription_status} />
                  </td>
                  <td className="hidden px-4 py-4 capitalize text-slate-300 md:table-cell">
                    {formatPlan(agency.subscription_plan)}
                  </td>
                  <td className="hidden px-4 py-4 lg:table-cell">
                    {agency.owner_email ? (
                      <span className="text-slate-300">{agency.owner_email}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                        <UserPlus className="h-3 w-3" /> Needs invite
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-4 text-slate-300 sm:table-cell">
                    {agency.monthly_price != null ? `€${agency.monthly_price}` : '—'}
                  </td>
                  <td className="hidden px-4 py-4 text-slate-500 xl:table-cell">
                    {formatDate(agency.created_at)}
                  </td>
                  <td className="px-5 py-4 text-right sm:px-6">
                    <Link
                      to={`/admin/agencies/${agency.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-teal-300 transition group-hover:border-teal-500/30 group-hover:bg-teal-500/10 group-hover:text-teal-200"
                    >
                      Manage <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanelCard>
    </div>
  )
}
