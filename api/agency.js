import { verifySession } from '../server/lib/verifySession.js'
import { getSupabaseAdmin } from '../server/lib/supabaseAdmin.js'
import { resolveUserAgency } from '../server/lib/resolveUserAgency.js'
import { inviteTeamMember, listTeamMembers, removeTeamMember } from '../server/lib/agencyTeam.js'
import { upsertResendApiKey } from '../server/lib/agencyIntegrations.js'
import { sendResendEmail } from '../server/lib/resendService.js'
import { agencyAccessError } from '../server/lib/checkAgencyActive.js'

function resolveRoute(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const fromQuery = url.searchParams.get('route')
  if (fromQuery) return fromQuery
  if (url.pathname.includes('/team')) return 'team'
  if (url.pathname.includes('/integrations')) return 'integrations'
  if (url.pathname.includes('/email/send')) return 'email'
  return 'team'
}

async function handleTeam(req, res, auth, admin, agencyId, actorRole) {
  if (req.method === 'GET') {
    const result = await listTeamMembers(admin.supabase, agencyId)
    return res.status(200).json({ ...result, can_manage: actorRole === 'owner' || actorRole === 'admin' })
  }

  if (req.method === 'POST') {
    const { email, role, full_name: fullName } = req.body || {}
    const result = await inviteTeamMember(admin.supabase, {
      agencyId,
      email,
      role,
      fullName,
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
}

async function handleIntegrations(req, res, resolved, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (resolved.role === 'agent') {
    return res.status(403).json({ error: 'Only agency owners and admins can manage integrations.' })
  }

  const { resend_api_key } = req.body || {}
  await upsertResendApiKey(admin.supabase, resolved.agency.id, resend_api_key || null)
  return res.status(200).json({ success: true, has_resend_api_key: Boolean(resend_api_key) })
}

async function handleEmail(req, res, auth, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html, text } = req.body || {}
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required.' })
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

export default async function handler(req, res) {
  const route = resolveRoute(req)

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) return res.status(500).json({ error: admin.error })

  try {
    if (route === 'email') {
      return await handleEmail(req, res, auth, admin)
    }

    const resolved = await resolveUserAgency(auth.supabase, auth.user.id)
    if (!resolved?.agency) {
      return res.status(404).json({ error: 'Agency not found.' })
    }

    if (route === 'integrations') {
      return await handleIntegrations(req, res, resolved, admin)
    }

    if (route === 'team') {
      return await handleTeam(req, res, auth, admin, resolved.agency.id, resolved.role)
    }

    return res.status(404).json({ error: 'Unknown agency route.' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Agency request failed.' })
  }
}
