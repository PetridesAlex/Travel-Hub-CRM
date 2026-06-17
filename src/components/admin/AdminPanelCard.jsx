export default function AdminPanelCard({ children, className = '', padding = 'p-5 sm:p-6' }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 shadow-xl shadow-black/20 backdrop-blur-sm ${padding} ${className}`}
    >
      {children}
    </div>
  )
}

export function AdminStatCard({ title, value, hint, icon: Icon, accent = 'teal' }) {
  const accents = {
    teal: 'from-teal-500/20 to-teal-600/5 text-teal-300 ring-teal-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-300 ring-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-300 ring-amber-500/20',
    violet: 'from-violet-500/20 to-violet-600/5 text-violet-300 ring-violet-500/20',
  }

  return (
    <AdminPanelCard padding="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${accents[accent] || accents.teal}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </AdminPanelCard>
  )
}
