import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AuthAlert from '../../components/auth/AuthAlert'
import AuthInput from '../../components/auth/AuthInput'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthSubmitButton from '../../components/auth/AuthSubmitButton'
import AppLoadingScreen from '../../components/loading/AppLoadingScreen'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [launching, setLaunching] = useState(false)
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user && !launching) navigate('/dashboard')
  }, [user, authLoading, launching, navigate])

  if (authLoading) return null

  if (launching) {
    return (
      <AppLoadingScreen
        title="Launching your workspace"
        steps={['Verifying credentials', 'Clearing for takeoff', 'Opening dashboard']}
        variant="fullscreen"
        theme="rocket"
        durationMs={4000}
      />
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      setLoading(false)
      setLaunching(true)
      await new Promise((resolve) => setTimeout(resolve, 4000))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Access your agency workspace — leads, bookings, and AI tools, all in one elegant place."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <AuthAlert variant="error">{error}</AuthAlert>}

        <AuthInput
          label="Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@agency.com"
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          type="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <AuthSubmitButton loading={loading} loadingLabel="Signing in...">
          Sign In
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  )
}
