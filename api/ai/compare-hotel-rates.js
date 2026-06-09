import { createClient } from '@supabase/supabase-js'
import { extractOpenAiText } from '../lib/buildAiPrompt.js'
import {
  buildCompareHotelRatesInstructions,
  buildCompareHotelRatesUserMessage,
  buildComparisonView,
  computeHotelQuoteFields,
  parseCompareHotelRatesJson,
} from '../lib/compareHotelRatesPrompt.js'

function filterImages(images) {
  return Array.isArray(images)
    ? images.filter((url) => typeof url === 'string' && url.startsWith('data:image/'))
    : []
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const openAiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!openAiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase environment variables are not configured.' })
  }

  const token = (req.headers.authorization || req.headers.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  const supplierImages = filterImages(req.body?.supplierImages)
  const bookingImages = filterImages(req.body?.bookingImages)
  const marginPercent = req.body?.marginPercent ?? 15

  if (!supplierImages.length && !bookingImages.length) {
    return res.status(400).json({ error: 'Upload at least one supplier or booking screenshot.' })
  }
  if (supplierImages.length > 3 || bookingImages.length > 3) {
    return res.status(400).json({ error: 'Maximum 3 images per side (supplier and booking).' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  const userMessage = buildCompareHotelRatesUserMessage(supplierImages.length, bookingImages.length)
  const content = [{ type: 'input_text', text: userMessage }]

  if (supplierImages.length) {
    content.push({ type: 'input_text', text: '--- SUPPLIER PLATFORM IMAGES (net/wholesale rates) ---' })
    supplierImages.forEach((url) => content.push({ type: 'input_image', image_url: url }))
  }
  if (bookingImages.length) {
    content.push({ type: 'input_text', text: '--- BOOKING PAGE IMAGES (public/retail rates) ---' })
    bookingImages.forEach((url) => content.push({ type: 'input_image', image_url: url }))
  }

  let openAiResponse
  try {
    openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions: buildCompareHotelRatesInstructions(),
        input: [{ role: 'user', content }],
        temperature: 0.1,
      }),
    })
  } catch (err) {
    return res.status(502).json({ error: `OpenAI request failed: ${err.message}` })
  }

  if (!openAiResponse.ok) {
    const errBody = await openAiResponse.json().catch(() => ({}))
    return res.status(502).json({
      error: errBody?.error?.message || `OpenAI request failed (${openAiResponse.status})`,
    })
  }

  const openAiData = await openAiResponse.json()
  const raw = extractOpenAiText(openAiData)
  const extracted = parseCompareHotelRatesJson(raw)

  if (!Object.keys(extracted).length) {
    return res.status(422).json({ error: 'Could not read hotel rates from the images. Try clearer screenshots.' })
  }

  const fields = computeHotelQuoteFields(extracted, marginPercent)
  const comparison = buildComparisonView(extracted, marginPercent)

  return res.status(200).json({ fields, comparison, extracted })
}
