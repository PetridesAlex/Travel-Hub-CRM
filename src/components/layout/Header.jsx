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
  const today = format(new Date(), 'EEE, d MMM yyyy')
  const agencyName = agency?.name || 'My Travel Agency'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">
              {agencyName}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden text-right md:block">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Today</p>
            <p className="text-sm font-medium text-slate-700">{today}</p>
          </div>

          <div className="hidden h-10 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent md:block" />

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-1.5 pl-1.5 pr-2 shadow-sm sm:gap-3 sm:pr-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 opacity-30 blur-[2px]" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-semibold text-white ring-2 ring-white">
                {initials}
              </div>
            </div>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight text-slate-900">{displayName}</p>
              <p className="truncate text-xs leading-tight text-slate-500">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="group flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 transition group-hover:scale-105" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
