import { sendSlackNotification } from '../../server/lib/sendSlackNotification.js'
import { verifySession } from '../../server/lib/verifySession.js'
import { resolveUserAgency } from '../../server/lib/resolveUserAgency.js'

const TEST_MESSAGE = `🚀 Travel Hub CRM Connected Successfully

Workspace: Travel Hub CRM
Status: Active`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const resolved = await resolveUserAgency(auth.supabase, auth.user.id)
  const result = await sendSlackNotification(TEST_MESSAGE, { agencyId: resolved?.agency?.id })

  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  return res.status(200).json({ success: true, message: 'Test message sent to Slack.' })
}
