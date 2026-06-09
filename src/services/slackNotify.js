/** Call server-side Slack API — webhook URL never touches the browser. */

async function parseResponse(res) {
  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    throw new Error(data.error || raw?.slice(0, 200) || `Slack request failed (${res.status})`)
  }
  return data
}

export async function testSlackConnection(session) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to test Slack.')
  }

  const res = await fetch('/api/slack/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  return parseResponse(res)
}

/**
 * Send a CRM event notification to Slack (fire-and-forget safe).
 * Types: lead_created, client_created, ai_generation_created, quotation_created, payment_reminder_due
 */
export async function notifySlack(session, type, data = {}) {
  if (!session?.access_token) return

  try {
    const res = await fetch('/api/slack/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, data }),
    })

    if (!res.ok) {
      const raw = await res.text()
      console.warn('[Slack]', raw)
    }
  } catch (err) {
    console.warn('[Slack]', err.message)
  }
}

/** Check bookings with upcoming due dates and post reminders to Slack (once per day). */
export async function checkPaymentRemindersSlack(session) {
  if (!session?.access_token) return

  const today = new Date().toISOString().slice(0, 10)
  const storageKey = `slack_payment_reminders_${today}`
  if (sessionStorage.getItem(storageKey)) return

  try {
    const res = await fetch('/api/slack/payment-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (res.ok) {
      sessionStorage.setItem(storageKey, '1')
    }
  } catch (err) {
    console.warn('[Slack payment reminders]', err.message)
  }
}
