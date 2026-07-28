import { getDecryptedResendApiKey } from './agencyIntegrations.js'

async function postResendEmail(apiKey, payload) {
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

  return postResendEmail(apiKey, payload)
}

/**
 * Send via agency Resend, or platform RESEND_API_KEY / RESEND_FROM_EMAIL fallback.
 */
export async function sendResendEmailWithFallback(admin, agency, { to, subject, html, text }) {
  const agencyKey = agency?.id ? await getDecryptedResendApiKey(admin, agency.id) : null
  const agencyFrom = agency?.resend_from_email || null

  if (agencyKey && agencyFrom) {
    const result = await sendResendEmail(admin, agency, { to, subject, html, text })
    if (result.ok) return { ...result, via: 'agency' }
  }

  const platformKey = process.env.RESEND_API_KEY || null
  const platformFrom = process.env.RESEND_FROM_EMAIL || null
  if (platformKey && platformFrom) {
    const payload = {
      from: platformFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    }
    if (agency?.resend_reply_to || agency?.email) {
      payload.reply_to = agency.resend_reply_to || agency.email
    }
    const result = await postResendEmail(platformKey, payload)
    if (result.ok) return { ...result, via: 'platform' }
    return result
  }

  if (agencyKey && !agencyFrom) {
    return { ok: false, error: 'Resend from email is not configured for this agency (Settings → Integrations).' }
  }
  if (!agencyKey && agencyFrom) {
    return { ok: false, error: 'Resend API key is not configured for this agency (Settings → Integrations).' }
  }

  return {
    ok: false,
    error:
      'Email sending is not configured. Add Resend under Settings → Integrations, or set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.',
  }
}
