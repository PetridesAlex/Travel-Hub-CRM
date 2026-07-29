export async function saveAgencyResendKey(session, resendApiKey) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  const res = await fetch('/api/agency/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ resend_api_key: resendApiKey || null }),
  })
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) throw new Error(data.error || raw?.slice(0, 200) || `Save failed (${res.status})`)
  return data
}

export async function getAgencyIntegrationsStatus(session) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  const res = await fetch('/api/agency/integrations', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) throw new Error(data.error || raw?.slice(0, 200) || `Request failed (${res.status})`)
  return data
}
