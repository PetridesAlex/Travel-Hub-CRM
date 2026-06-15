import { Loader2 } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useSuperAdmin } from '../../hooks/useSuperAdmin'

export default function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth()
  const { isSuperAdmin } = useSuperAdmin()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
  return children
}
