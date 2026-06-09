/**
 * Send a plain-text message to Slack via incoming webhook.
 * Uses process.env.SLACK_WEBHOOK_URL only — never expose in frontend.
 */
export async function sendSlackNotification(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    return {
      ok: false,
      error: 'SLACK_WEBHOOK_URL is not configured on the server. Add it in Vercel → Settings → Environment Variables (Production), then redeploy. For local dev, add it to .env and run npm run dev:api:restart.',
    }
  }

  if (!message?.trim()) {
    return { ok: false, error: 'Message is required.' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message.trim() }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        ok: false,
        error: body || `Slack webhook failed (${response.status})`,
      }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message || 'Failed to reach Slack.' }
  }
}
