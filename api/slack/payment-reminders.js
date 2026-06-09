import { sendSlackNotification } from '../lib/sendSlackNotification.js'
import { buildSlackMessage } from '../lib/slackMessages.js'
import { verifySession } from '../lib/verifySession.js'

/** Bookings with balance due within the next 7 days (or overdue by 1 day) */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const today = new Date()
  const pastDue = new Date(today)
  pastDue.setDate(pastDue.getDate() - 1)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 7)

  const pastDueIso = pastDue.toISOString().slice(0, 10)
  const horizonIso = horizon.toISOString().slice(0, 10)

  const { data: bookings, error } = await auth.supabase
    .from('bookings')
    .select('id, booking_reference, balance_due, due_date, clients(full_name, company_name, client_type)')
    .gt('balance_due', 0)
    .not('due_date', 'is', null)
    .gte('due_date', pastDueIso)
    .lte('due_date', horizonIso)
    .order('due_date', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!bookings?.length) {
    return res.status(200).json({ success: true, sent: 0, message: 'No payment reminders due.' })
  }

  let sent = 0
  const errors = []

  for (const booking of bookings) {
    const client = booking.clients
    const clientName = client?.client_type === 'business' && client?.company_name
      ? client.company_name
      : client?.full_name || 'Unknown client'

    const message = buildSlackMessage('payment_reminder_due', {
      client_name: clientName,
      booking_reference: booking.booking_reference || booking.id.slice(0, 8),
      balance_due: booking.balance_due,
      due_date: booking.due_date,
      currency: booking.currency || 'EUR',
    })

    const result = await sendSlackNotification(message)
    if (result.ok) {
      sent += 1
    } else {
      errors.push(result.error)
    }
  }

  if (sent === 0 && errors.length) {
    return res.status(500).json({ error: errors[0] })
  }

  return res.status(200).json({
    success: true,
    sent,
    total: bookings.length,
    message: sent ? `Sent ${sent} payment reminder(s) to Slack.` : 'No reminders sent.',
  })
}
