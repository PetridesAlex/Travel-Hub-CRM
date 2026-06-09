import {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
  Plane, ScrollText, Receipt, Sparkles, Bot, FileStack, History,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/enums'
import { useAgency } from '../../hooks/useAgency'

const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History,
}

const NAV_GROUPS = [
  { label: 'Overview', paths: ['/dashboard'] },
  { label: 'Sales', paths: ['/clients', '/leads', '/quotations', '/bookings'] },
  { label: 'Finance', paths: ['/invoices', '/receipts'] },
  { label: 'Operations', paths: ['/suppliers', '/tasks'] },
  { label: 'AI Workspace', paths: ['/ai-workspace/generator', '/ai-workspace/agents', '/ai-workspace/templates', '/ai-workspace/history'] },
  { label: 'AI Suite', paths: ['/ai-email', '/voice-notes', '/marketing'] },
]

function NavItem({ item, onClose }) {
  const Icon = ICONS[item.icon]

  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onClose}
        className={({ isActive }) =>
          `group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200 sm:gap-3 sm:px-3 sm:py-2.5 ${
            isActive
              ? 'bg-gradient-to-r from-teal-500/20 via-teal-500/10 to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-300 to-teal-600 shadow-[0_0_12px_rgba(45,212,191,0.45)]" />
            )}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8 ${
                isActive
                  ? 'bg-teal-500/25 text-teal-200 ring-1 ring-teal-400/30'
                  : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate tracking-wide">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
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
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-64 flex-col overflow-hidden border-r border-white/[0.06] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
        <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative shrink-0 border-b border-white/[0.06] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-teal-400/30 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 shadow-lg shadow-teal-900/40 ring-1 ring-white/10 sm:h-11 sm:w-11">
                <Plane className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold tracking-tight text-white">{agencyName}</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-teal-400" />
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Travel Hub CRM</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            {NAV_GROUPS.map((group) => {
              const groupItems = group.paths.map((path) => itemsByPath[path]).filter(Boolean)
              if (!groupItems.length) return null

              return (
                <div key={group.label}>
                  <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 sm:mb-2 sm:px-3">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {groupItems.map((item) => (
                      <NavItem key={item.path} item={item} onClose={onClose} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </nav>

        {settingsItem && (
          <div className="relative shrink-0 border-t border-white/[0.06] bg-slate-950/80 px-3 py-2.5 backdrop-blur-sm sm:py-3">
            <NavItem item={settingsItem} onClose={onClose} />
          </div>
        )}
      </aside>
    </>
  )
}
