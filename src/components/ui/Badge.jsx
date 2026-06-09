import { STATUS_COLORS } from '../../constants/enums'

export default function Badge({ status, label, className = '' }) {
  const colorClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-800'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass} ${className}`}>
      {label || status?.replace(/_/g, ' ')}
    </span>
  )
}
