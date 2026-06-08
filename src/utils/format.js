import { format, parseISO, isValid } from 'date-fns'

export function formatDate(value) {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, 'dd MMM yyyy')
}

export function formatCurrency(amount, currency = 'EUR') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, 'dd MMM yyyy HH:mm')
}

export function getTodayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label ?? value
}

export function formatClientName(client) {
  if (!client) return '—'
  if (client.client_type === 'business' && client.company_name) {
    return client.company_name
  }
  return client.full_name || '—'
}

export function formatClientOptionLabel(client) {
  if (!client) return '—'
  if (client.client_type === 'business' && client.company_name) {
    return client.full_name
      ? `${client.company_name} — ${client.full_name}`
      : client.company_name
  }
  return client.full_name || '—'
}
