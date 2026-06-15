export async function sendEmailViaResend(session, { to, subject, html, text }) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ to, subject, html, text }),
  })
  const raw = await res.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
  if (!res.ok) throw new Error(data.error || raw?.slice(0, 200) || `Send failed (${res.status})`)
  return data
}
