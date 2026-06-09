export async function compareHotelRatesFromImages({
  supplierImages,
  bookingImages,
  marginPercent,
}, session) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to compare hotel rates.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  let res
  try {
    res = await fetch('/api/ai/compare-hotel-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ supplierImages, bookingImages, marginPercent }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Rate comparison timed out. Try fewer or smaller images.')
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
    if (res.status === 404) {
      throw new Error('Compare API not found. Restart the local API: npm run dev:api:restart')
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Comparison failed (${res.status})`)
  }

  return {
    fields: data.fields || {},
    comparison: data.comparison || null,
    extracted: data.extracted || {},
  }
}
