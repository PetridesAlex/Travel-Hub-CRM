import { createClient } from '@supabase/supabase-js'

export function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  return { supabaseUrl, supabaseAnonKey }
}

export async function verifySession(req) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Supabase environment variables are not configured.' }
  }

  const token = (req.headers.authorization || req.headers.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session.' }
  }

  return { ok: true, user: data.user, supabase, token }
}
