async function parseResponse(res) {
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) {
    if (res.status === 502 || res.status === 504) {
      throw new Error(
        'Admin API is unavailable (bad gateway). Wait for the latest Vercel deploy to finish, then refresh. If it persists, check Vercel logs for /api/admin.',
      )
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Request failed (${res.status})`)
  }
  return data
}

function authHeaders(session) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

export async function listAdminAgencies(session, { search = '', status = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    route: 'agencies',
    page: String(page),
    pageSize: '25',
  })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  // Call /api/admin directly (avoid /api/admin/agencies rewrite, which can 502 on Vercel).
  const res = await fetch(`/api/admin?${params}`, { headers: authHeaders(session) })
  return parseResponse(res)
}

export async function getAdminAgency(session, id) {
  const res = await fetch(
    `/api/admin?route=agency&id=${encodeURIComponent(id)}`,
    { headers: authHeaders(session) },
  )
  return parseResponse(res)
}

export async function createAdminAgency(session, payload) {
  const res = await fetch('/api/admin?route=agencies', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify(payload),
  })
  return parseResponse(res)
}

export async function updateAdminAgency(session, id, payload) {
  const res = await fetch(`/api/admin?route=agency&id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(session),
    body: JSON.stringify({ id, ...payload }),
  })
  return parseResponse(res)
}

export async function inviteAgencyOwner(session, agencyId, email) {
  const res = await fetch('/api/admin?route=invite', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ agency_id: agencyId, email }),
  })
  return parseResponse(res)
}
