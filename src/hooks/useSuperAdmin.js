import { useAuth } from './useAuth'

export function useSuperAdmin() {
  const { user } = useAuth()
  return { isSuperAdmin: user?.app_metadata?.is_super_admin === true }
}
