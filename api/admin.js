import { verifySuperAdmin } from '../server/lib/verifySuperAdmin.js'
import { createAgency, getAgencyById, listAgencies, updateAgency, inviteAgencyOwner } from '../server/lib/adminAgencies.js'

function resolveRoute(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const fromQuery = url.searchParams.get('route')
  if (fromQuery) return fromQuery
  if (url.pathname.includes('/invite')) return 'invite'
  if (url.pathname.includes('/agencies')) return 'agencies'
  if (url.pathname.includes('/agency')) return 'agency'
  return 'agencies'
}

async function handleAgencies(req, res, auth) {
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
}

async function handleAgency(req, res, auth) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const agencyId = url.searchParams.get('id') || req.body?.id
  if (!agencyId) {
    return res.status(400).json({ error: 'Agency id is required (query ?id= or body.id).' })
  }

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
}

async function handleInvite(req, res, auth) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { agency_id, email } = req.body || {}
  if (!agency_id) {
    return res.status(400).json({ error: 'agency_id is required.' })
  }

  const result = await inviteAgencyOwner(auth.admin, {
    agencyId: agency_id,
    email,
    actorUserId: auth.user.id,
  })
  return res.status(200).json(result)
}

export default async function handler(req, res) {
  try {
    const auth = await verifySuperAdmin(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error })
    }

    const route = resolveRoute(req)

    if (route === 'invite') return await handleInvite(req, res, auth)
    if (route === 'agency') return await handleAgency(req, res, auth)
    return await handleAgencies(req, res, auth)
  } catch (err) {
    console.error('[api/admin]', err)
    const status = /not found/i.test(err.message || '') ? 404 : /protected|cannot/i.test(err.message || '') ? 403 : 500
    return res.status(status).json({ error: err.message || 'Admin request failed.' })
  }
}
