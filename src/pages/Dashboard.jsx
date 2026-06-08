import { useEffect, useState } from 'react'
import {
  Users, Target, FileText, CalendarCheck, CheckSquare, Wallet, Activity,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/Card'
import Card from '../components/ui/Card'
import { formatCurrency, formatDateTime } from '../utils/format'
import { getTodayISO } from '../utils/format'

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    activeLeads: 0,
    pendingQuotations: 0,
    confirmedBookings: 0,
    followUpsToday: 0,
    pendingBalances: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const today = getTodayISO()

      const [
        clientsRes,
        activeLeadsRes,
        pendingQuotesRes,
        confirmedBookingsRes,
        followUpsRes,
        bookingsRes,
        recentClients,
        recentLeads,
        recentQuotes,
        recentBookings,
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '(confirmed,lost)'),
        supabase.from('quotations').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('due_date', today).eq('status', 'pending'),
        supabase.from('bookings').select('balance_due').gt('balance_due', 0),
        supabase.from('clients').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('leads').select('id, destination, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('quotations').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('id, booking_reference, status, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      const pendingBalances = (bookingsRes.data || []).reduce(
        (sum, b) => sum + Number(b.balance_due || 0),
        0
      )

      setStats({
        clients: clientsRes.count || 0,
        activeLeads: activeLeadsRes.count || 0,
        pendingQuotations: pendingQuotesRes.count || 0,
        confirmedBookings: confirmedBookingsRes.count || 0,
        followUpsToday: followUpsRes.count || 0,
        pendingBalances,
      })

      const activity = [
        ...(recentClients.data || []).map((r) => ({
          type: 'Client',
          label: r.full_name,
          date: r.created_at,
        })),
        ...(recentLeads.data || []).map((r) => ({
          type: 'Lead',
          label: r.destination || 'New lead',
          date: r.created_at,
        })),
        ...(recentQuotes.data || []).map((r) => ({
          type: 'Quotation',
          label: r.title,
          date: r.created_at,
        })),
        ...(recentBookings.data || []).map((r) => ({
          type: 'Booking',
          label: r.booking_reference || 'New booking',
          date: r.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)

      setRecentActivity(activity)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-slate-500">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">Overview of your travel agency</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Clients" value={stats.clients} icon={Users} accent="teal" />
        <StatCard title="Active Leads" value={stats.activeLeads} icon={Target} accent="blue" />
        <StatCard title="Pending Quotations" value={stats.pendingQuotations} icon={FileText} accent="purple" />
        <StatCard title="Confirmed Bookings" value={stats.confirmedBookings} icon={CalendarCheck} accent="green" />
        <StatCard title="Follow-ups Today" value={stats.followUpsToday} icon={CheckSquare} accent="amber" />
        <StatCard
          title="Pending Balances"
          value={formatCurrency(stats.pendingBalances)}
          icon={Wallet}
          accent="red"
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity yet. Start by adding a client or lead.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentActivity.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <span className="text-xs font-medium uppercase text-teal-600">{item.type}</span>
                  <p className="text-sm text-slate-800">{item.label}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(item.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
