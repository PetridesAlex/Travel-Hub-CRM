import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { listAdminAgencies } from '../../services/adminAgencies'
import SubscriptionBadge from '../../components/admin/SubscriptionBadge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function AdminAgencies() {
  const { session } = useAuth()
  const [agencies, setAgencies] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await listAdminAgencies(session, { search })
      setAgencies(data.agencies || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Agencies</h2>
          <p className="text-sm text-slate-400">Manage travel agency tenants on the platform</p>
        </div>
        <Link to="/admin/agencies/new"><Button><Plus className="h-4 w-4" /> New agency</Button></Link>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agencies..." className="max-w-sm" />
        <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> Search</Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-slate-400">Loading…</td></tr>
            ) : agencies.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-slate-400">No agencies found.</td></tr>
            ) : agencies.map((agency) => (
              <tr key={agency.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-white">{agency.name}</td>
                <td className="px-4 py-3"><SubscriptionBadge status={agency.subscription_status} /></td>
                <td className="px-4 py-3 capitalize text-slate-300">{agency.subscription_plan}</td>
                <td className="px-4 py-3 text-slate-400">{agency.owner_email || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{agency.monthly_price != null ? `€${agency.monthly_price}` : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/agencies/${agency.id}`} className="text-teal-300 hover:text-teal-200">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
