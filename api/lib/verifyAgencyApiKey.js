import { getSupabaseAdmin } from './supabaseAdmin.js'

function extractApiKey(req) {
  const headerKey = req.headers['x-agency-api-key'] || req.headers['X-Agency-Api-Key']
  if (headerKey) return String(headerKey).trim()

  const auth = req.headers.authorization || req.headers.Authorization || ''
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  if (bearer) return bearer

  return req.body?.api_key ? String(req.body.api_key).trim() : ''
}

export async function verifyAgencyApiKey(req) {
  const apiKey = extractApiKey(req)
  if (!apiKey) {
    return { ok: false, status: 401, error: 'Agency API key required. Send X-Agency-Api-Key header or Authorization: Bearer <key>.' }
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) {
    return { ok: false, status: 500, error: admin.error }
  }

  const { data: agency, error } = await admin.supabase
    .from('agencies')
    .select('id, name, owner_user_id, api_key')
    .eq('api_key', apiKey)
    .maybeSingle()

  if (error) {
    const message = /invalid api key/i.test(error.message)
      ? 'Supabase rejected SUPABASE_SERVICE_ROLE_KEY. In Vercel (Travel Hub CRM), use the service_role secret from project nwdyywbtbgdbdwneovme → Settings → API. Not the anon/publishable key, and not the Honeywell website project key.'
      : error.message
    return { ok: false, status: 500, error: message }
  }

  if (!agency) {
    return { ok: false, status: 401, error: 'Invalid agency API key.' }
  }

  return { ok: true, agency, supabase: admin.supabase, userId: agency.owner_user_id }
}
