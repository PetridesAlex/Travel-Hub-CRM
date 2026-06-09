import { Menu, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'

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

export default function Header({ title, onMenuClick }) {
  const { user, signOut } = useAuth()
  const { agency } = useAgency()
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)
  const todayShort = format(new Date(), 'd MMM yyyy')
  const agencyName = agency?.name || 'My Travel Agency'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="shrink-0 rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600 sm:block">
              {agencyName}
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg lg:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <p className="hidden shrink-0 text-xs font-medium tabular-nums text-slate-500 xl:block">
            {todayShort}
          </p>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-1 shadow-sm sm:gap-1.5 sm:p-1.5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 opacity-30 blur-[2px]" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-semibold text-white ring-2 ring-white sm:h-9 sm:w-9 sm:text-sm">
                {initials}
              </div>
            </div>

            <div className="hidden min-w-0 max-w-[8rem] md:block lg:max-w-[10rem]">
              <p className="truncate text-xs font-semibold leading-tight text-slate-900 sm:text-sm">{displayName}</p>
              <p className="hidden truncate text-[11px] leading-tight text-slate-500 xl:block">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="group flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:px-2.5 sm:py-2 lg:px-3"
          >
            <LogOut className="h-4 w-4 transition group-hover:scale-105" />
            <span className="hidden text-sm font-medium lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
