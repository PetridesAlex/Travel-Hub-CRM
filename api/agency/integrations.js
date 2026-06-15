import { verifySession } from '../../server/lib/verifySession.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { resolveUserAgency } from '../../server/lib/resolveUserAgency.js'
import { upsertResendApiKey } from '../../server/lib/agencyIntegrations.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const resolved = await resolveUserAgency(auth.supabase, auth.user.id)
  if (!resolved?.agency) {
    return res.status(404).json({ error: 'Agency not found.' })
  }
  if (resolved.role === 'agent') {
    return res.status(403).json({ error: 'Only agency owners and admins can manage integrations.' })
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) return res.status(500).json({ error: admin.error })

  try {
    const { resend_api_key } = req.body || {}
    await upsertResendApiKey(admin.supabase, resolved.agency.id, resend_api_key || null)
    return res.status(200).json({ success: true, has_resend_api_key: Boolean(resend_api_key) })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to save integrations.' })
  }
}
