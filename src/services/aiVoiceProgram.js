export async function generateVoiceProgramViaApi(
  { transcript, clientName, clientId, images },
  session,
) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to generate a program.')
  }

  const imageUrls = (images || [])
    .map((img) => img?.preview || img)
    .filter((url) => typeof url === 'string' && url.startsWith('data:image/'))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  let res
  try {
    res = await fetch('/api/ai/voice-program', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        transcript: transcript || '',
        client_name: clientName || '',
        client_id: clientId || null,
        images: imageUrls,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Generation timed out after 2 minutes. Try fewer or smaller images.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    if (res.status === 502 && !data.error) {
      throw new Error(
        'AI API unavailable. On local dev, run "npm run dev:api" in a second terminal.',
      )
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Generation failed (${res.status})`)
  }

  return data.output || ''
}
