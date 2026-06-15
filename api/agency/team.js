import { verifySession } from '../../server/lib/verifySession.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { resolveUserAgency } from '../../server/lib/resolveUserAgency.js'
import { inviteTeamMember, listTeamMembers, removeTeamMember } from '../../server/lib/agencyTeam.js'

export default async function handler(req, res) {
  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const resolved = await resolveUserAgency(auth.supabase, auth.user.id)
  if (!resolved?.agency) {
    return res.status(404).json({ error: 'Agency not found.' })
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) return res.status(500).json({ error: admin.error })

  const agencyId = resolved.agency.id
  const actorRole = resolved.role

  try {
    if (req.method === 'GET') {
      const result = await listTeamMembers(admin.supabase, agencyId)
      return res.status(200).json({ ...result, can_manage: actorRole === 'owner' || actorRole === 'admin' })
    }

    if (req.method === 'POST') {
      const { email, role } = req.body || {}
      const result = await inviteTeamMember(admin.supabase, {
        agencyId,
        email,
        role,
        actorUserId: auth.user.id,
        actorRole,
      })
      return res.status(200).json(result)
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const memberId = url.searchParams.get('member_id') || req.body?.member_id
      if (!memberId) return res.status(400).json({ error: 'member_id is required.' })

      const result = await removeTeamMember(admin.supabase, {
        agencyId,
        memberId,
        actorUserId: auth.user.id,
        actorRole,
      })
      return res.status(200).json(result)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Team request failed.' })
  }
}
