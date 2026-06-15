import { NavLink, Outlet } from 'react-router-dom'
import { Building2, LayoutDashboard, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/admin/agencies', label: 'Agencies', icon: Building2 },
  { to: '/dashboard', label: 'CRM App', icon: LayoutDashboard },
]

export default function SuperAdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Travel Hub</p>
              <h1 className="text-lg font-bold text-white">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:inline">{user?.email}</span>
            <button type="button" onClick={signOut} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-500/20 text-teal-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`
                }
              >
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  )
}
