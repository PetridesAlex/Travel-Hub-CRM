import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AuthAlert from '../../components/auth/AuthAlert'
import AuthInput from '../../components/auth/AuthInput'
import AuthLayout from '../../components/auth/AuthLayout'
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

        <button
          type="submit"
          disabled={loading}
          className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition-all duration-200 hover:from-teal-400 hover:to-teal-500 hover:shadow-teal-900/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
