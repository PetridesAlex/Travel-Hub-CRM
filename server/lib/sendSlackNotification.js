import { getSupabaseAdmin } from './supabaseAdmin.js'
import { resolveSlackWebhookUrl } from './resolveSlackWebhook.js'

/**
 * Send a plain-text message to Slack via incoming webhook.
 * Uses per-agency slack_webhook_url when set, else process.env.SLACK_WEBHOOK_URL.
 */
export async function sendSlackNotification(message, options = {}) {
  const { agencyId } = options

  let webhookUrl = process.env.SLACK_WEBHOOK_URL || null

  if (agencyId) {
    const admin = getSupabaseAdmin()
    if (admin.ok) {
      webhookUrl = (await resolveSlackWebhookUrl(admin.supabase, agencyId)) || webhookUrl
    }
  }

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
