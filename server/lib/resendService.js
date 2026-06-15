import { getDecryptedResendApiKey } from './agencyIntegrations.js'

export async function sendResendEmail(admin, agency, { to, subject, html, text }) {
  const apiKey = await getDecryptedResendApiKey(admin, agency.id)
  if (!apiKey) {
    return { ok: false, error: 'Resend API key is not configured for this agency.' }
  }

  if (!agency.resend_from_email) {
    return { ok: false, error: 'Resend from email is not configured for this agency.' }
  }

  const payload = {
    from: agency.resend_from_email,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
  }

  if (agency.resend_reply_to) {
    payload.reply_to = agency.resend_reply_to
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { ok: false, error: data.message || data.error || `Resend failed (${response.status})` }
    }

    return { ok: true, id: data.id }
  } catch (err) {
    return { ok: false, error: err.message || 'Failed to reach Resend API.' }
  }
}
