import { verifySession } from './verifySession.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

export function isSuperAdminUser(user) {
  return user?.app_metadata?.is_super_admin === true
}

export async function verifySuperAdmin(req) {
  const session = await verifySession(req)
  if (!session.ok) return session

  if (!isSuperAdminUser(session.user)) {
    return { ok: false, status: 403, error: 'Super admin access required.' }
  }

  const admin = getSupabaseAdmin()
  if (!admin.ok) {
    return { ok: false, status: 500, error: admin.error }
  }

  return {
    ok: true,
    user: session.user,
    token: session.token,
    supabase: session.supabase,
    admin: admin.supabase,
  }
}
