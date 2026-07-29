import {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History, Orbit, ClipboardList,
  Package, Sun, Snowflake, Flower2, Palmtree, Ship,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/enums'
import {
  PACKAGE_CATEGORIES,
  getPackageCategoryIcon,
  packagesCategoryPath,
} from '../../constants/packageCategories'
import { useAgency } from '../../hooks/useAgency'
import AgencyLogo from './AgencyLogo'
import { resolveAgencyLogoUrl } from '../../utils/resolveAgencyLogo'

const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History, ClipboardList,
  Package, Sun, Snowflake, Flower2, Palmtree, Ship,
}

const NAV_GROUPS = [
  { label: 'Overview', paths: ['/dashboard'], accent: 'teal' },
  { label: 'Sales', paths: ['/clients', '/leads', '/quotations', '/bookings'], accent: 'sky' },
  { label: 'Finance', paths: ['/invoices', '/receipts'], accent: 'emerald' },
  { label: 'Operations', paths: ['/suppliers', '/tasks', '/calendar', '/forms'], accent: 'amber' },
  { label: 'Catalog', paths: ['/packages'], accent: 'amber', showPackageCategories: true },
  { label: 'AI Workspace', paths: ['/ai-workspace/generator', '/ai-workspace/agents', '/ai-workspace/templates', '/ai-workspace/history'], accent: 'violet' },
  { label: 'AI Suite', paths: ['/ai-email', '/voice-notes', '/marketing'], accent: 'indigo' },
]

const ACCENT_ACTIVE = {
  teal: {
    bar: 'from-teal-300 to-cyan-400',
    bg: 'from-teal-500/30 via-teal-500/12 to-transparent',
    icon: 'bg-teal-400/20 text-teal-100 ring-teal-300/40',
    glow: 'shadow-[0_0_20px_rgba(45,212,191,0.28)]',
  },
  sky: {
    bar: 'from-sky-300 to-cyan-500',
    bg: 'from-sky-500/28 via-sky-500/10 to-transparent',
    icon: 'bg-sky-400/20 text-sky-100 ring-sky-300/40',
    glow: 'shadow-[0_0_18px_rgba(56,189,248,0.25)]',
  },
  emerald: {
    bar: 'from-emerald-300 to-teal-400',
    bg: 'from-emerald-500/28 via-emerald-500/10 to-transparent',
    icon: 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/40',
    glow: 'shadow-[0_0_18px_rgba(52,211,153,0.25)]',
  },
  amber: {
    bar: 'from-amber-300 to-orange-400',
    bg: 'from-amber-500/25 via-amber-500/10 to-transparent',
    icon: 'bg-amber-400/20 text-amber-100 ring-amber-300/35',
    glow: 'shadow-[0_0_18px_rgba(251,191,36,0.22)]',
  },
  violet: {
    bar: 'from-violet-300 to-fuchsia-400',
    bg: 'from-violet-500/28 via-violet-500/10 to-transparent',
    icon: 'bg-violet-400/20 text-violet-100 ring-violet-300/40',
    glow: 'shadow-[0_0_18px_rgba(167,139,250,0.28)]',
  },
  indigo: {
    bar: 'from-indigo-300 to-sky-400',
    bg: 'from-indigo-500/28 via-indigo-500/10 to-transparent',
    icon: 'bg-indigo-400/20 text-indigo-100 ring-indigo-300/40',
    glow: 'shadow-[0_0_18px_rgba(129,140,248,0.25)]',
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
          `sidebar-nav-link group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-300 ${
            isActive
              ? `bg-gradient-to-r ${styles.bg} text-white ${styles.glow}`
              : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className={`absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b ${styles.bar}`} />
            )}
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ring-1 ${
                isActive
                  ? styles.icon
                  : 'bg-white/[0.035] text-slate-500 ring-white/[0.05] group-hover:bg-white/[0.07] group-hover:text-slate-200 group-hover:ring-white/10'
              }`}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={isActive ? 2.25 : 2} />
            </span>
            <span className="truncate">{item.label}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-teal-200/90 shadow-[0_0_10px_rgba(153,246,228,0.8)]" />
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
    <div className="mb-2.5 flex items-center gap-2.5 px-2.5">
      <span className={`h-px flex-1 bg-gradient-to-r from-transparent ${isAi ? 'via-violet-400/35' : 'via-teal-400/20'} to-transparent`} />
      <p className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] ${
        isAi ? 'text-violet-300/75' : 'text-slate-500'
      }`}>
        {label}
      </p>
      <span className={`h-px flex-1 bg-gradient-to-l from-transparent ${isAi ? 'via-violet-400/35' : 'via-teal-400/20'} to-transparent`} />
    </div>
  )
}

function PackageCategoryNav({ onClose }) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const activeCategory = location.pathname.startsWith('/packages') ? params.get('category') : null
  const onPackagesIndex = location.pathname === '/packages' && !activeCategory

  return (
    <ul className="mt-1.5 ml-5 space-y-0.5 border-l border-teal-400/15 pl-3">
      <li>
        <NavLink
          to="/packages"
          end
          onClick={onClose}
          className={() =>
            `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition duration-200 ${
              onPackagesIndex
                ? 'bg-teal-500/15 text-teal-100'
                : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
            }`
          }
        >
          All packages
        </NavLink>
      </li>
      {PACKAGE_CATEGORIES.map((cat) => {
        const Icon = getPackageCategoryIcon(cat.icon)
        const active = activeCategory === cat.id
        return (
          <li key={cat.id}>
            <NavLink
              to={packagesCategoryPath(cat.id)}
              onClick={onClose}
              className={() =>
                `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition duration-200 ${
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="truncate">{cat.label}</span>
            </NavLink>
          </li>
        )
      })}
    </ul>
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
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[18.5rem] flex-col overflow-hidden transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="app-sidebar-mesh pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="sidebar-aurora pointer-events-none absolute -left-10 top-10 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="sidebar-aurora-delayed pointer-events-none absolute -right-16 bottom-24 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Brand */}
        <div className="relative shrink-0 px-4 pb-3 pt-5">
          <div className="sidebar-brand-panel relative overflow-hidden rounded-2xl px-3.5 py-4">
            <div className="sidebar-brand-sheen pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-teal-400/20 blur-2xl" />
            <div className="relative flex items-center gap-3.5">
              <div className="sidebar-logo-halo relative shrink-0">
                <AgencyLogo name={agencyName} logoUrl={resolveAgencyLogoUrl(agency)} size="xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-teal-300/80">
                  Travel Hub
                </p>
                <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-white">
                  {agencyName}
                </h1>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/25 bg-teal-500/15 px-2 py-0.5">
                    <Orbit className="h-2.5 w-2.5 text-teal-300" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-teal-200">
                      CRM
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5">
                    <span className="header-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300/90">
                      Live
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1">
          <div className="space-y-5">
            {NAV_GROUPS.map((group) => {
              const groupItems = group.paths.map((path) => itemsByPath[path]).filter(Boolean)
              if (!groupItems.length) return null

              return (
                <div key={group.label} className="sidebar-nav-group">
                  <NavGroupLabel label={group.label} accent={group.accent} />
                  <ul className="space-y-1">
                    {groupItems.map((item) => (
                      <NavItem key={item.path} item={item} onClose={onClose} accent={group.accent} />
                    ))}
                  </ul>
                  {group.showPackageCategories ? <PackageCategoryNav onClose={onClose} /> : null}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Settings dock */}
        {settingsItem && (
          <div className="relative shrink-0 border-t border-white/[0.06] p-3">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
            <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              System
            </p>
            <div className="sidebar-settings-dock rounded-2xl p-1">
              <NavItem item={settingsItem} onClose={onClose} accent="teal" />
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
