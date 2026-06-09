import { sendSlackNotification } from '../lib/sendSlackNotification.js'
import { buildSlackMessage, SLACK_NOTIFY_TYPES } from '../lib/slackMessages.js'
import { verifySession } from '../lib/verifySession.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const type = req.body?.type
  const data = req.body?.data || {}

  if (!type || !SLACK_NOTIFY_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid notification type. Allowed: ${SLACK_NOTIFY_TYPES.join(', ')}` })
  }

  const message = buildSlackMessage(type, data)
  if (!message) {
    return res.status(400).json({ error: 'Could not build Slack message.' })
  }

  const result = await sendSlackNotification(message)

  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  return res.status(200).json({ success: true })
}
