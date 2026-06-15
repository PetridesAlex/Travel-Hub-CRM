const LABELS = { trial: 'Trial', active: 'Active', past_due: 'Past due', cancelled: 'Cancelled' }
const COLORS = {
  trial: 'bg-amber-500/20 text-amber-200',
  active: 'bg-emerald-500/20 text-emerald-200',
  past_due: 'bg-red-500/20 text-red-200',
  cancelled: 'bg-slate-500/20 text-slate-300',
}

export default function SubscriptionBadge({ status = 'trial' }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${COLORS[status] || COLORS.trial}`}>
      {LABELS[status] || status}
    </span>
  )
}
