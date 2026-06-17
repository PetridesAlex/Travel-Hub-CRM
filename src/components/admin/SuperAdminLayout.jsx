import { NavLink, Outlet } from 'react-router-dom'
import { Building2, LayoutDashboard, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/admin/agencies', label: 'Agencies', icon: Building2, description: 'Tenants & billing' },
  { to: '/dashboard', label: 'CRM App', icon: LayoutDashboard, description: 'Your workspace' },
]

export default function SuperAdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/40 via-slate-950 to-slate-950" />

      <header className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/25 to-teal-600/10 text-teal-300 ring-1 ring-teal-500/20">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Travel Hub</p>
              <h1 className="text-lg font-bold tracking-tight text-white">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {NAV.map(({ to, label, icon: Icon, description }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-w-[140px] items-center gap-3 rounded-xl px-3 py-2.5 transition md:min-w-0 ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-100 ring-1 ring-teal-500/25'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${to.startsWith('/admin') ? 'bg-teal-500/10' : 'bg-white/5'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="hidden text-[11px] text-slate-500 md:block">{description}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 md:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick tip</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              New customer? Create an agency, invite the owner, then mark them <span className="text-emerald-400">Active</span> when paid.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
