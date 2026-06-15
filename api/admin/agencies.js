import { verifySuperAdmin } from '../../server/lib/verifySuperAdmin.js'
import { createAgency, listAgencies } from '../../server/lib/adminAgencies.js'

export default async function handler(req, res) {
  const auth = await verifySuperAdmin(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const result = await listAgencies(auth.admin, {
        search: url.searchParams.get('search') || '',
        status: url.searchParams.get('status') || '',
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 25),
      })
      return res.status(200).json(result)
    }

    if (req.method === 'POST') {
      const agency = await createAgency(auth.admin, req.body || {}, auth.user.id)
      return res.status(201).json({ agency })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Admin agencies request failed.' })
  }
}
