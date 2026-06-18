import { createClient } from '@supabase/supabase-js'

const CRM_SUPABASE_HOST = 'nwdyywbtbgdbdwneovme.supabase.co'

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && !supabaseUrl.includes(CRM_SUPABASE_HOST)) {
    return {
      ok: false,
      error: `Supabase URL must point to the CRM project (${CRM_SUPABASE_HOST}). Check SUPABASE_URL / VITE_SUPABASE_URL on Vercel.`,
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Add it in Vercel → Environment Variables.',
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { ok: true, supabase }
}

export function requireSupabaseAdmin() {
  const result = getSupabaseAdmin()
  if (!result.ok) {
    const err = new Error(result.error)
    err.status = 500
    throw err
  }
  return result.supabase
}
