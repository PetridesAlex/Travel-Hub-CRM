async function parseResponse(res) {
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) {
    if (res.status === 404 && (data.error === 'Not found' || /not found/i.test(raw))) {
      throw new Error('Team API is not available. Deploy the latest CRM to Vercel, or run npm run dev:api:restart locally.')
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Request failed (${res.status})`)
  }
  return data
}

function authHeaders(session) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

export async function listTeamMembers(session) {
  const res = await fetch('/api/agency/team', { headers: authHeaders(session) })
  return parseResponse(res)
}

export async function inviteTeamMember(session, { email, role = 'agent' }) {
  const res = await fetch('/api/agency/team', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ email, role }),
  })
  return parseResponse(res)
}

export async function removeTeamMember(session, memberId) {
  const res = await fetch(`/api/agency/team?member_id=${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: authHeaders(session),
  })
  return parseResponse(res)
}
