import {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History, Orbit,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/enums'
import { useAgency } from '../../hooks/useAgency'
import AgencyLogo from './AgencyLogo'
import { resolveAgencyLogoUrl } from '../../utils/resolveAgencyLogo'

const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History,
}

const NAV_GROUPS = [
  { label: 'Overview', paths: ['/dashboard'], accent: 'teal' },
  { label: 'Sales', paths: ['/clients', '/leads', '/quotations', '/bookings'], accent: 'sky' },
  { label: 'Finance', paths: ['/invoices', '/receipts'], accent: 'emerald' },
  { label: 'Operations', paths: ['/suppliers', '/tasks', '/calendar'], accent: 'amber' },
  { label: 'AI Workspace', paths: ['/ai-workspace/generator', '/ai-workspace/agents', '/ai-workspace/templates', '/ai-workspace/history'], accent: 'violet' },
  { label: 'AI Suite', paths: ['/ai-email', '/voice-notes', '/marketing'], accent: 'indigo' },
]

const ACCENT_ACTIVE = {
  teal: {
    bar: 'from-teal-300 to-cyan-500',
    bg: 'from-teal-500/25 via-teal-500/10 to-transparent',
    icon: 'bg-teal-500/20 text-teal-200 ring-teal-400/35',
    glow: 'shadow-[0_0_16px_rgba(45,212,191,0.35)]',
  },
  sky: {
    bar: 'from-sky-300 to-blue-500',
    bg: 'from-sky-500/25 via-sky-500/10 to-transparent',
    icon: 'bg-sky-500/20 text-sky-200 ring-sky-400/35',
    glow: 'shadow-[0_0_16px_rgba(56,189,248,0.3)]',
  },
  emerald: {
    bar: 'from-emerald-300 to-teal-500',
    bg: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
    icon: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/35',
    glow: 'shadow-[0_0_16px_rgba(52,211,153,0.3)]',
  },
  amber: {
    bar: 'from-amber-300 to-orange-500',
    bg: 'from-amber-500/25 via-amber-500/10 to-transparent',
    icon: 'bg-amber-500/20 text-amber-200 ring-amber-400/35',
    glow: 'shadow-[0_0_16px_rgba(251,191,36,0.28)]',
  },
  violet: {
    bar: 'from-violet-300 to-purple-500',
    bg: 'from-violet-500/25 via-violet-500/10 to-transparent',
    icon: 'bg-violet-500/20 text-violet-200 ring-violet-400/35',
    glow: 'shadow-[0_0_16px_rgba(139,92,246,0.35)]',
  },
  indigo: {
    bar: 'from-indigo-300 to-violet-500',
    bg: 'from-indigo-500/25 via-indigo-500/10 to-transparent',
    icon: 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/35',
    glow: 'shadow-[0_0_16px_rgba(99,102,241,0.3)]',
  },
}

function NavItem({ item, onClose, accent = 'teal' }) {
  const Icon = ICONS[item.icon]
  const styles = ACCENT_ACTIVE[accent] || ACCENT_ACTIVE.teal

  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onClose}
        className={({ isActive }) =>
          `sidebar-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300 ${
            isActive
              ? `bg-gradient-to-r ${styles.bg} text-white ${styles.glow}`
              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b ${styles.bar}`} />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ring-1 ${
                isActive
                  ? styles.icon
                  : 'bg-white/[0.03] text-slate-500 ring-white/[0.06] group-hover:bg-white/[0.06] group-hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate tracking-wide">{item.label}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

function NavGroupLabel({ label, accent }) {
  const isAi = accent === 'violet' || accent === 'indigo'
  return (
    <div className="mb-2 flex items-center gap-2 px-3">
      <span className={`h-px flex-1 bg-gradient-to-r from-transparent ${isAi ? 'via-violet-500/30' : 'via-white/10'} to-transparent`} />
      <p className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.22em] ${
        isAi ? 'text-violet-400/70' : 'text-slate-600'
      }`}>
        {label}
      </p>
      <span className={`h-px flex-1 bg-gradient-to-l from-transparent ${isAi ? 'via-violet-500/30' : 'via-white/10'} to-transparent`} />
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { agency } = useAgency()
  const agencyName = agency?.name || 'My Travel Agency'

  const itemsByPath = Object.fromEntries(NAV_ITEMS.map((item) => [item.path, item]))
  const settingsItem = itemsByPath['/settings']

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[17.5rem] flex-col overflow-hidden transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="app-sidebar-mesh pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="pointer-events-none absolute -right-24 top-20 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-32 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Brand */}
        <div className="relative shrink-0 border-b border-white/[0.06] px-4 py-5">
          <div className="sidebar-brand-panel relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-3.5 py-3.5">
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-teal-400/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="sidebar-logo-halo relative shrink-0">
                <AgencyLogo name={agencyName} logoUrl={resolveAgencyLogoUrl(agency)} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate bg-gradient-to-r from-white to-slate-300 bg-clip-text text-sm font-bold tracking-tight text-transparent">
                  {agencyName}
                </h1>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md border border-teal-400/20 bg-teal-500/10 px-1.5 py-0.5">
                    <Orbit className="h-2.5 w-2.5 text-teal-400" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-teal-300/90">
                      Hub CRM
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-5">
            {NAV_GROUPS.map((group) => {
              const groupItems = group.paths.map((path) => itemsByPath[path]).filter(Boolean)
              if (!groupItems.length) return null

              return (
                <div key={group.label}>
                  <NavGroupLabel label={group.label} accent={group.accent} />
                  <ul className="space-y-0.5">
                    {groupItems.map((item) => (
                      <NavItem key={item.path} item={item} onClose={onClose} accent={group.accent} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </nav>

        {/* Settings dock */}
        {settingsItem && (
          <div className="relative shrink-0 border-t border-white/[0.06] p-3">
            <p className="mb-2 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
              System
            </p>
            <div className="sidebar-settings-dock rounded-2xl border border-white/[0.06] bg-slate-950/60 p-1 backdrop-blur-sm">
              <NavItem item={settingsItem} onClose={onClose} accent="teal" />
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
