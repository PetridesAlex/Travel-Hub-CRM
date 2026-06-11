import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AuthAlert from '../../components/auth/AuthAlert'
import AuthInput from '../../components/auth/AuthInput'
import AuthLayout from '../../components/auth/AuthLayout'

export default function Register() {
  const [email, setEmail] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard')
  }, [user, authLoading, navigate])

  if (authLoading) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (!agencyName.trim()) {
      setError('Please enter your travel agency name')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, { agency_name: agencyName.trim() })
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your workspace"
      subtitle="Set up your agency in minutes. Start with a trial and scale as you grow."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-teal-400 transition-colors hover:text-teal-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthAlert variant="error">{error}</AuthAlert>}
        {success && <AuthAlert variant="success">{success}</AuthAlert>}

        <AuthInput
          label="Travel Agency Name"
          type="text"
          icon={Building2}
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          required
          placeholder="Mediterranean Voyages"
          autoComplete="organization"
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput
            label="Password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min. 6 characters"
            autoComplete="new-password"
          />
          <AuthInput
            label="Confirm"
            type="password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition-all duration-200 hover:from-teal-400 hover:to-teal-500 hover:shadow-teal-900/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
