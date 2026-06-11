import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLoadingScreen from './loading/AppLoadingScreen'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <AppLoadingScreen
        title="Launching your workspace"
        steps={['Verifying your session', 'Clearing for takeoff', 'Opening dashboard']}
        variant="fullscreen"
        theme="rocket"
        durationMs={4000}
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
