export async function extractFlightFieldsFromImages(imageUrls, session) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to analyse screenshots.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

  let res
  try {
    res = await fetch('/api/ai/extract-flight-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ images: imageUrls }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Screenshot analysis timed out. Try fewer or smaller images.')
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
    throw new Error(data.error || raw?.slice(0, 200) || `Extraction failed (${res.status})`)
  }

  return data.fields || {}
}
