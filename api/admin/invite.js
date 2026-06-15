import { verifySuperAdmin } from '../../server/lib/verifySuperAdmin.js'
import { inviteAgencyOwner } from '../../server/lib/adminAgencies.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifySuperAdmin(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const { agency_id, email } = req.body || {}
  if (!agency_id) {
    return res.status(400).json({ error: 'agency_id is required.' })
  }

  try {
    const result = await inviteAgencyOwner(auth.admin, {
      agencyId: agency_id,
      email,
      actorUserId: auth.user.id,
    })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to invite agency owner.' })
  }
}
