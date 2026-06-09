const ACCENTS = {
  slate: { icon: 'bg-white/10 text-slate-200', text: 'text-slate-200', dot: 'bg-slate-400' },
  teal: { icon: 'bg-teal-500/20 text-teal-300', text: 'text-teal-100', dot: 'bg-teal-400' },
  sky: { icon: 'bg-sky-500/20 text-sky-300', text: 'text-sky-100', dot: 'bg-sky-400' },
  violet: { icon: 'bg-violet-500/20 text-violet-300', text: 'text-violet-100', dot: 'bg-violet-400' },
  emerald: { icon: 'bg-emerald-500/20 text-emerald-300', text: 'text-emerald-100', dot: 'bg-emerald-400' },
  amber: { icon: 'bg-amber-500/20 text-amber-300', text: 'text-amber-100', dot: 'bg-amber-400' },
  rose: { icon: 'bg-rose-500/20 text-rose-300', text: 'text-rose-100', dot: 'bg-rose-400' },
  gradient: {
    icon: 'bg-gradient-to-br from-teal-500/30 to-violet-500/30 text-white',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-violet-200 to-rose-200',
    dot: 'bg-gradient-to-r from-teal-400 to-violet-400',
  },
}

export default function LeadTableHeader({ icon: Icon, label, accent = 'slate' }) {
  const theme = ACCENTS[accent] || ACCENTS.slate

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10 sm:h-7 sm:w-7 ${theme.icon}`}>
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className={`hidden h-1 w-1 shrink-0 rounded-full sm:inline ${theme.dot}`} aria-hidden />
          <span className={`truncate text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px] sm:tracking-[0.18em] ${theme.text}`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}

export const PREMIUM_HEADER_CLASS =
  'border-r border-white/[0.06] px-3 py-3 text-left last:border-r-0 first:rounded-tl-2xl last:rounded-tr-2xl sm:px-4 sm:py-4 lg:px-5'

export const PREMIUM_CELL_CLASS =
  'px-3 py-3 align-top sm:px-4 sm:py-4 lg:px-5'
