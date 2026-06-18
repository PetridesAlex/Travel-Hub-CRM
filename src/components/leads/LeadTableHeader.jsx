const DARK_ACCENTS = {
  slate: { icon: 'bg-white/15 text-white', text: 'text-white', dot: 'bg-white/60' },
  teal: { icon: 'bg-teal-400/25 text-teal-50', text: 'text-teal-50', dot: 'bg-teal-300' },
  sky: { icon: 'bg-sky-400/25 text-sky-50', text: 'text-sky-50', dot: 'bg-sky-300' },
  violet: { icon: 'bg-violet-400/25 text-violet-50', text: 'text-violet-50', dot: 'bg-violet-300' },
  emerald: { icon: 'bg-emerald-400/25 text-emerald-50', text: 'text-emerald-50', dot: 'bg-emerald-300' },
  amber: { icon: 'bg-amber-400/25 text-amber-50', text: 'text-amber-50', dot: 'bg-amber-300' },
  rose: { icon: 'bg-rose-400/25 text-rose-50', text: 'text-rose-50', dot: 'bg-rose-300' },
  gradient: {
    icon: 'bg-white/20 text-white',
    text: 'text-white',
    dot: 'bg-white/70',
  },
}

const LIGHT_ACCENTS = {
  slate: { icon: 'bg-slate-100 text-slate-700 ring-slate-200/80', text: 'text-slate-800', dot: 'bg-slate-400' },
  teal: { icon: 'bg-teal-100 text-teal-700 ring-teal-200/80', text: 'text-teal-900', dot: 'bg-teal-500' },
  sky: { icon: 'bg-sky-100 text-sky-700 ring-sky-200/80', text: 'text-sky-900', dot: 'bg-sky-500' },
  violet: { icon: 'bg-violet-100 text-violet-700 ring-violet-200/80', text: 'text-violet-900', dot: 'bg-violet-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-100 text-amber-800 ring-amber-200/80', text: 'text-amber-900', dot: 'bg-amber-500' },
  rose: { icon: 'bg-rose-100 text-rose-700 ring-rose-200/80', text: 'text-rose-900', dot: 'bg-rose-500' },
  gradient: {
    icon: 'bg-gradient-to-br from-teal-100 to-violet-100 text-teal-700 ring-teal-200/60',
    text: 'text-slate-800',
    dot: 'bg-gradient-to-r from-teal-500 to-violet-500',
  },
}

export default function LeadTableHeader({ icon: Icon, label, accent = 'slate', surface = 'dark' }) {
  const palette = surface === 'light' ? LIGHT_ACCENTS : DARK_ACCENTS
  const theme = palette[accent] || palette.slate

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-8 sm:w-8 ${theme.icon}`}>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} aria-hidden />
          <span className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.16em] ${theme.text}`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}

export const PREMIUM_HEADER_CLASS =
  'border-r border-slate-200/70 px-3 py-3.5 text-left last:border-r-0 sm:px-4 sm:py-4 lg:px-5'

export const PREMIUM_HEADER_CLASS_DARK =
  'border-r border-white/[0.08] px-3 py-3.5 text-left last:border-r-0 sm:px-4 sm:py-4 lg:px-5'

export const PREMIUM_CELL_CLASS =
  'px-3 py-3 align-top sm:px-4 sm:py-4 lg:px-5'
