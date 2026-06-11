export default function AuthInput({ label, icon: Icon, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          className={`w-full rounded-xl border bg-slate-950/60 py-3 text-sm text-white placeholder:text-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } ${
            error
              ? 'border-red-500/50 focus:border-red-400'
              : 'border-white/[0.08] focus:border-teal-500/50 hover:border-white/[0.12]'
          }`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  )
}
