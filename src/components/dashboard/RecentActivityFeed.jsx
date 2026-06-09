import { Link } from 'react-router-dom'
import {
  Users, Target, FileText, CalendarCheck, ScrollText, Receipt,
  ArrowRight, Sparkles, Globe,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { getLeadInquiryDisplay } from '../../utils/leadDisplay'

const ACTIVITY_THEMES = {
  Client: {
    icon: Users,
    label: 'New client',
    accent: 'from-teal-400 to-teal-600',
    card: 'border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/30',
    iconWrap: 'bg-teal-100 text-teal-700 ring-teal-200/80',
    badge: 'bg-teal-600 text-white',
    to: '/clients',
  },
  Lead: {
    icon: Target,
    label: 'New lead',
    accent: 'from-sky-400 to-blue-600',
    card: 'border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/30',
    iconWrap: 'bg-sky-100 text-sky-700 ring-sky-200/80',
    badge: 'bg-sky-600 text-white',
    to: '/leads',
  },
  Quotation: {
    icon: FileText,
    label: 'Quotation',
    accent: 'from-violet-400 to-purple-600',
    card: 'border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/30',
    iconWrap: 'bg-violet-100 text-violet-700 ring-violet-200/80',
    badge: 'bg-violet-600 text-white',
    to: '/quotations',
  },
  Booking: {
    icon: CalendarCheck,
    label: 'Booking',
    accent: 'from-emerald-400 to-green-600',
    card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/30',
    iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
    badge: 'bg-emerald-600 text-white',
    to: '/bookings',
  },
  Invoice: {
    icon: ScrollText,
    label: 'Invoice',
    accent: 'from-amber-400 to-orange-600',
    card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/30',
    iconWrap: 'bg-amber-100 text-amber-700 ring-amber-200/80',
    badge: 'bg-amber-600 text-white',
    to: '/invoices',
  },
  Receipt: {
    icon: Receipt,
    label: 'Payment',
    accent: 'from-green-400 to-emerald-600',
    card: 'border-green-200/70 bg-gradient-to-br from-green-50/90 via-white to-emerald-50/30',
    iconWrap: 'bg-green-100 text-green-700 ring-green-200/80',
    badge: 'bg-green-600 text-white',
    to: '/receipts',
  },
}

function getActivityContent(item) {
  if (item.type === 'Lead') {
    const { title, origin, channel } = getLeadInquiryDisplay({
      destination: item.label,
      notes: item.notes,
    })
    const subtitle = [origin, channel !== origin ? channel : ''].filter(Boolean).join(' · ')
    return {
      title,
      subtitle: subtitle || item.subtitle || 'Website enquiry',
    }
  }

  return {
    title: item.label,
    subtitle: item.subtitle || '',
  }
}

function ActivityRow({ item, isLast }) {
  const theme = ACTIVITY_THEMES[item.type] || ACTIVITY_THEMES.Client
  const Icon = theme.icon
  const { title, subtitle } = getActivityContent(item)

  return (
    <li className="relative pl-8">
      {!isLast && (
        <span
          className="absolute left-[15px] top-12 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent"
          aria-hidden
        />
      )}
      <span
        className={`absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${theme.accent} text-white shadow-md ring-4 ring-white`}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <Link
        to={item.to || theme.to}
        className={`group mb-3 block overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${theme.card}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${theme.accent}`} aria-hidden />

        <div className="relative flex items-start gap-3 pl-1">
          <span className={`hidden shrink-0 rounded-lg p-2 ring-1 ring-inset sm:flex ${theme.iconWrap}`}>
            <Icon className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${theme.badge}`}>
                {theme.label}
              </span>
              {item.type === 'Lead' && subtitle && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                  <Globe className="h-3 w-3 text-sky-500" />
                  {subtitle}
                </span>
              )}
              {item.meta && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                  {item.meta}
                </span>
              )}
            </div>

            <p className="mt-1.5 truncate text-sm font-semibold tracking-tight text-slate-900 group-hover:text-slate-800">
              {title}
            </p>

            {item.type !== 'Lead' && subtitle && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold tabular-nums text-slate-500">
              {formatDateTime(item.date)}
            </p>
            <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

export default function RecentActivityFeed({ activity = [] }) {
  if (!activity.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
        <Sparkles className="h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">No recent activity yet</p>
        <p className="mt-1 text-xs text-slate-500">Add a client or lead, or wait for website enquiries.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{activity.length}</span> recent updates across your agency
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set(activity.map((a) => a.type))].slice(0, 4).map((type) => {
            const theme = ACTIVITY_THEMES[type]
            if (!theme) return null
            return (
              <span
                key={type}
                className={`rounded-full bg-gradient-to-r ${theme.accent} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm`}
              >
                {type}
              </span>
            )
          })}
        </div>
      </div>

      <ul className="space-y-0">
        {activity.map((item, index) => (
          <ActivityRow key={`${item.type}-${item.id || item.date}-${index}`} item={item} isLast={index === activity.length - 1} />
        ))}
      </ul>
    </div>
  )
}
