import {
  Menu, LogOut, CalendarDays,
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt, Sparkles, Bot, FileStack, History,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
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
  const agencyName = agency?.name || 'My Travel Agency'
  const PageIcon = pageIcon ? ICONS[pageIcon] : LayoutDashboard

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/90 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-16 top-0 h-24 w-48 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:gap-4 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 transition hover:border-teal-400/30 hover:bg-teal-500/10 hover:text-teal-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/20 sm:h-10 sm:w-10">
                <PageIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
                  {agencyName}
                </p>
                <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                  {title}
                </h1>
              </div>
            </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-slate-400 md:flex">
            <CalendarDays className="h-3.5 w-3.5 text-teal-400/80" />
            <span className="text-xs font-medium tabular-nums tracking-wide">{todayShort}</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 sm:gap-1.5 sm:p-1.5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-teal-400/40 blur-[3px]" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-[11px] font-bold text-white ring-2 ring-slate-950 sm:h-9 sm:w-9 sm:text-xs">
                {initials}
              </div>
            </div>

            <div className="hidden min-w-0 max-w-[7.5rem] md:block lg:max-w-[9rem]">
              <p className="truncate text-xs font-semibold leading-tight text-white">{displayName}</p>
              <p className="hidden truncate text-[10px] leading-tight text-slate-500 xl:block">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="group flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300 sm:px-2.5 sm:py-2 lg:px-3"
          >
            <LogOut className="h-4 w-4 transition group-hover:scale-105" />
            <span className="hidden text-sm font-medium lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
