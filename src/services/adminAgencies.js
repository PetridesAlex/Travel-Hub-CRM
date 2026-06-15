async function parseResponse(res) {
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) throw new Error(data.error || raw?.slice(0, 200) || `Request failed (${res.status})`)
  return data
}

function authHeaders(session) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

export async function listAdminAgencies(session, { search = '', status = '', page = 1 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  const res = await fetch(`/api/admin/agencies?${params}`, { headers: authHeaders(session) })
  return parseResponse(res)
}

export async function getAdminAgency(session, id) {
  const res = await fetch(`/api/admin/agency?id=${encodeURIComponent(id)}`, { headers: authHeaders(session) })
  return parseResponse(res)
}

export async function createAdminAgency(session, payload) {
  const res = await fetch('/api/admin/agencies', { method: 'POST', headers: authHeaders(session), body: JSON.stringify(payload) })
  return parseResponse(res)
}

export async function updateAdminAgency(session, id, payload) {
  const res = await fetch(`/api/admin/agency?id=${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: authHeaders(session), body: JSON.stringify({ id, ...payload }),
  })
  return parseResponse(res)
}

export async function inviteAgencyOwner(session, agencyId, email) {
  const res = await fetch('/api/admin/invite', {
    method: 'POST', headers: authHeaders(session), body: JSON.stringify({ agency_id: agencyId, email }),
  })
  return parseResponse(res)
}
