export async function resolveSlackWebhookUrl(admin, agencyId) {
  if (!agencyId) {
    return process.env.SLACK_WEBHOOK_URL || null
  }

  try {
    const { data, error } = await admin
      .from('agencies')
      .select('slack_webhook_url, slack_notifications_enabled')
      .eq('id', agencyId)
      .maybeSingle()

    if (error && !/column|does not exist/i.test(error.message)) {
      console.warn('[slack] agency lookup failed:', error.message)
    }

    if (data?.slack_notifications_enabled === false) {
      return null
    }

    if (data?.slack_webhook_url?.trim()) {
      return data.slack_webhook_url.trim()
    }
  } catch (err) {
    console.warn('[slack] resolve webhook:', err.message)
  }

  return process.env.SLACK_WEBHOOK_URL || null
}
