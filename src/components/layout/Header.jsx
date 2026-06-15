import {
  Menu, LogOut, CalendarDays,
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History, Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'

const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Calendar, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History,
}

function getUserDisplayName(user) {
  if (user?.user_metadata?.full_name) return user.user_metadata.full_name
  const email = user?.email || ''
  const local = email.split('@')[0] || 'User'
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getUserInitials(user) {
  const name = getUserDisplayName(user)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Header({ title, pageIcon, onMenuClick }) {
  const { user, signOut } = useAuth()
  const { agency } = useAgency()
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)
  const todayShort = format(new Date(), 'EEE, d MMM yyyy')
  const timeNow = format(new Date(), 'HH:mm')
  const agencyName = agency?.name || 'My Travel Agency'
  const PageIcon = ICONS[pageIcon] || LayoutDashboard

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="app-header-mesh pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/25 to-transparent" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-32 w-64 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex h-[4.25rem] items-center justify-between gap-3 px-3 sm:gap-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="header-glass-btn shrink-0 p-2.5 text-slate-300 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="header-icon-halo relative shrink-0">
              <div className="header-icon-ring absolute inset-0 rounded-2xl" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-teal-300 shadow-[0_0_24px_-4px_rgba(45,212,191,0.45)] sm:h-12 sm:w-12">
                <PageIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
              </span>
            </div>

            <div className="min-w-0 border-l border-white/[0.06] pl-3 sm:pl-4">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                  {agencyName}
                </p>
                <span className="hidden items-center gap-1 rounded-full border border-teal-400/20 bg-teal-500/10 px-2 py-0.5 sm:inline-flex">
                  <Zap className="h-2.5 w-2.5 text-teal-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-teal-300/90">Live</span>
                </span>
              </div>
              <h1 className="truncate bg-gradient-to-r from-white via-slate-100 to-teal-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
                {title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div className="header-glass-panel hidden items-center gap-3 px-3.5 py-2 md:flex">
            <div className="flex items-center gap-2">
              <span className="header-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <CalendarDays className="h-3.5 w-3.5 text-cyan-400/90" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Today</p>
              <p className="text-xs font-semibold tabular-nums tracking-wide text-slate-200">{todayShort}</p>
            </div>
            <div className="h-8 w-px bg-white/[0.08]" />
            <p className="font-mono text-sm font-bold tabular-nums tracking-wider text-teal-300/90">{timeNow}</p>
          </div>

          <div className="header-glass-panel flex items-center gap-2 p-1.5 pl-2 sm:gap-2.5 sm:pl-2.5">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-teal-400/50 to-cyan-500/30 blur-sm" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 text-[11px] font-bold text-white ring-2 ring-slate-950/80 sm:h-10 sm:w-10 sm:text-xs">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="max-w-[8rem] truncate text-xs font-semibold leading-tight text-white lg:max-w-[10rem]">
                {displayName}
              </p>
              <p className="max-w-[8rem] truncate text-[10px] leading-tight text-slate-500 lg:max-w-[10rem]">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="header-glass-btn group flex items-center gap-2 px-2.5 py-2 text-slate-400 sm:px-3"
          >
            <LogOut className="h-4 w-4 transition group-hover:-translate-x-0.5 group-hover:text-red-300" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] group-hover:text-red-300 lg:inline">
              Exit
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
