function line(label, value) {
  if (value == null || value === '') return null
  return `${label}: ${value}`
}

function formatMoney(value, currency = 'EUR') {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

export function buildSlackMessage(type, data = {}) {
  switch (type) {
    case 'lead_created':
      return [
        '🔥 New Lead Created',
        line('Client', data.client_name),
        line('Destination', data.destination),
        line('Budget', formatMoney(data.budget, data.currency)),
        line('Status', data.status),
      ].filter(Boolean).join('\n')

    case 'client_created':
      return [
        '👤 New Client Created',
        line('Name', data.full_name),
        line('Email', data.email),
        line('Phone', data.phone),
      ].filter(Boolean).join('\n')

    case 'ai_generation_created':
      return [
        '🤖 AI Generation Created',
        line('Agent', data.agent_name),
        line('Category', data.category),
        line('Client', data.client_name),
      ].filter(Boolean).join('\n')

    case 'quotation_created':
      return [
        '💼 New Quotation Created',
        line('Client', data.client_name),
        line('Destination', data.destination),
        line('Selling Price', formatMoney(data.selling_price, data.currency)),
        line('Profit', formatMoney(data.profit, data.currency)),
      ].filter(Boolean).join('\n')

    case 'payment_reminder_due':
      return [
        '💰 Payment Reminder Due',
        line('Client', data.client_name),
        line('Booking Reference', data.booking_reference),
        line('Balance Due', formatMoney(data.balance_due, data.currency)),
        line('Due Date', formatDate(data.due_date)),
      ].filter(Boolean).join('\n')

    default:
      return null
  }
}

export const SLACK_NOTIFY_TYPES = [
  'lead_created',
  'client_created',
  'ai_generation_created',
  'quotation_created',
  'payment_reminder_due',
]
