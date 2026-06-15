import { verifySuperAdmin } from '../../server/lib/verifySuperAdmin.js'
import { getAgencyById, updateAgency } from '../../server/lib/adminAgencies.js'

export default async function handler(req, res) {
  const auth = await verifySuperAdmin(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const agencyId = url.searchParams.get('id') || req.body?.id
  if (!agencyId) {
    return res.status(400).json({ error: 'Agency id is required (query ?id= or body.id).' })
  }

  try {
    if (req.method === 'GET') {
      const agency = await getAgencyById(auth.admin, agencyId)
      if (!agency) return res.status(404).json({ error: 'Agency not found.' })
      return res.status(200).json({ agency })
    }

    if (req.method === 'PATCH') {
      const agency = await updateAgency(auth.admin, agencyId, req.body || {}, auth.user.id)
      return res.status(200).json({ agency })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : /protected|cannot/i.test(err.message) ? 403 : 500
    return res.status(status).json({ error: err.message || 'Admin agency request failed.' })
  }
}
