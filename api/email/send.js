import { verifySession } from '../../server/lib/verifySession.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { resolveUserAgency } from '../../server/lib/resolveUserAgency.js'
import { sendResendEmail } from '../../server/lib/resendService.js'
import { agencyAccessError } from '../../server/lib/checkAgencyActive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const { to, subject, html, text } = req.body || {}
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required.' })
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) {
    return res.status(500).json({ error: admin.error })
  }

  const resolved = await resolveUserAgency(auth.supabase, auth.user.id)
  const agency = resolved?.agency

  if (!agency) {
    return res.status(404).json({ error: 'Agency not found for this user.' })
  }

  const blocked = agencyAccessError(agency)
  if (blocked) {
    return res.status(403).json({ error: blocked })
  }

  const result = await sendResendEmail(admin.supabase, agency, { to, subject, html, text })
  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  return res.status(200).json({ success: true, id: result.id })
}
