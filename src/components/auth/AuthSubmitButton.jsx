import { ArrowRight, Loader2 } from 'lucide-react'

export default function AuthSubmitButton({
  children,
  loading = false,
  loadingLabel = 'Please wait...',
  disabled = false,
  type = 'submit',
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`auth-submit-btn group relative mt-2 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${loading ? 'auth-submit-btn--loading' : ''}`}
    >
      <span className="auth-submit-btn-glow pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <span className="auth-submit-btn-shimmer pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <span className="auth-submit-btn-ring pointer-events-none absolute -inset-[2px] rounded-[14px]" aria-hidden />

      <span className="relative z-10 flex items-center justify-center gap-2.5">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="auth-submit-btn-text">{loadingLabel}</span>
          </>
        ) : (
          <>
            <span className="auth-submit-btn-text">{children}</span>
            <ArrowRight className="auth-submit-btn-arrow h-4 w-4" />
          </>
        )}
      </span>
    </button>
  )
}
