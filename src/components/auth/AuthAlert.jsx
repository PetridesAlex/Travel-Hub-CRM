export default function AuthAlert({ children, variant = 'error' }) {
  const styles = {
    error: 'border-red-500/20 bg-red-500/10 text-red-200',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  )
}
