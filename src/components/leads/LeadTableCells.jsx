import { Link } from 'react-router-dom'
import {
  CalendarClock, Mail, Pencil, Phone, Trash2, User, FileText, ChevronRight,
} from 'lucide-react'
import Badge from '../ui/Badge'
import { LEAD_STATUSES, TRAVEL_TYPES } from '../../constants/enums'
import { formatClientName, formatCurrency, formatDate, labelFor } from '../../utils/format'
import { getTravelTypeTheme } from '../../utils/leadDisplay'

function getClientInitials(client) {
  const name = formatClientName(client)
  if (name === '—') return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function LeadClientCell({ client }) {
  if (!client) {
    return <span className="text-sm text-slate-400">Unlinked</span>
  }

  const profileUrl = `/clients/${client.id}`

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <Link
        to={profileUrl}
        onClick={(e) => e.stopPropagation()}
        className="group/avatar relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:ring-offset-2"
        aria-label={`View ${formatClientName(client)} profile`}
        title="Open client profile"
      >
        <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-[2px] transition group-hover/avatar:bg-teal-400/35" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white ring-2 ring-white shadow-sm transition group-hover/avatar:scale-105 group-hover/avatar:from-teal-600 group-hover/avatar:to-slate-900">
          {getClientInitials(client)}
        </div>
      </Link>
      <div className="min-w-0">
        <Link
          to={profileUrl}
          onClick={(e) => e.stopPropagation()}
          className="group/name block truncate font-semibold tracking-tight text-slate-900 transition hover:text-teal-700"
        >
          {formatClientName(client)}
        </Link>
        <Link
          to={profileUrl}
          onClick={(e) => e.stopPropagation()}
          className="group/hint mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 transition hover:text-teal-600"
        >
          <User className="h-3 w-3 shrink-0" />
          <span>View profile</span>
          <ChevronRight className="h-3 w-3 opacity-0 transition group-hover/hint:opacity-100" />
        </Link>
      </div>
    </div>
  )
}

export function LeadContactCell({ client }) {
  if (!client?.email && !client?.phone) {
    return (
      <span className="inline-flex rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400">
        No contact info
      </span>
    )
  }

  return (
    <div className="min-w-0 max-w-[11rem] space-y-1 sm:max-w-none sm:min-w-[9rem]">
      {client.email && (
        <a
          href={`mailto:${client.email}`}
          className="group flex items-center gap-2 rounded-lg border border-sky-100/80 bg-gradient-to-r from-sky-50/80 to-white px-2.5 py-1.5 text-xs font-medium text-sky-900 transition hover:border-sky-200 hover:shadow-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500 text-white shadow-sm shadow-sky-900/15">
            <Mail className="h-3 w-3" />
          </span>
          <span className="truncate group-hover:text-sky-700">{client.email}</span>
        </a>
      )}
      {client.phone && (
        <a
          href={`tel:${client.phone}`}
          className="group flex items-center gap-2 rounded-lg border border-teal-100/80 bg-gradient-to-r from-teal-50/80 to-white px-2.5 py-1.5 text-xs font-medium text-teal-900 transition hover:border-teal-200 hover:shadow-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500 text-white shadow-sm shadow-teal-900/15">
            <Phone className="h-3 w-3" />
          </span>
          <span className="truncate group-hover:text-teal-700">{client.phone}</span>
        </a>
      )}
    </div>
  )
}

export function LeadTravelTypeBadge({ travelType }) {
  const theme = getTravelTypeTheme(travelType)
  const label = labelFor(TRAVEL_TYPES, travelType)

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${theme.badge}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${theme.icon}`} />
      {label}
    </span>
  )
}

export function LeadBudgetCell({ budget }) {
  if (budget == null) {
    return <span className="text-sm text-slate-400">—</span>
  }

  return (
    <div className="min-w-[5.5rem]">
      <p className="text-sm font-bold tabular-nums tracking-tight text-emerald-800">
        {formatCurrency(budget)}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-600/70">Budget</p>
    </div>
  )
}

export function LeadStatusBadge({ status }) {
  return (
    <Badge
      status={status}
      label={labelFor(LEAD_STATUSES, status)}
      className="rounded-xl px-3 py-1 text-xs font-semibold shadow-sm ring-1 ring-inset ring-black/5"
    />
  )
}

export function LeadFollowUpCell({ followUpDate, status }) {
  if (!followUpDate) {
    return <span className="text-sm text-slate-400">—</span>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(followUpDate)
  due.setHours(0, 0, 0, 0)
  const isOverdue = due < today && !['confirmed', 'lost'].includes(status)
  const isToday = due.getTime() === today.getTime()

  let tone = 'border-slate-200/80 bg-slate-50 text-slate-700'
  if (isOverdue) tone = 'border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50 text-red-800'
  else if (isToday) tone = 'border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900'

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${tone}`}>
      <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span>{formatDate(followUpDate)}</span>
    </div>
  )
}

export function LeadActionsCell({ onEdit, onDelete, onCreateQuote }) {
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {onCreateQuote && (
        <button
          type="button"
          onClick={onCreateQuote}
          className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          aria-label="Create quotation"
          title="Create quotation"
        >
          <FileText className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        aria-label="Edit lead"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete lead"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
