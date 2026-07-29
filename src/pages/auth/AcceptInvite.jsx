import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AuthAlert from '../../components/auth/AuthAlert'
import AuthInput from '../../components/auth/AuthInput'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthSubmitButton from '../../components/auth/AuthSubmitButton'

function getHashParams() {
  const hash = window.location.hash?.replace(/^#/, '') || ''
  return new URLSearchParams(hash)
}

function getQueryParams() {
  return new URLSearchParams(window.location.search || '')
}

function cleanInviteParamsFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('code')
  url.hash = ''
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`)
}

export default function AcceptInvite() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('Checking your invitation…')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const hash = getHashParams()
        const query = getQueryParams()
        const err = hash.get('error_description') || query.get('error_description') || hash.get('error')
        if (err) {
          if (!cancelled) {
            setError(decodeURIComponent(String(err).replace(/\+/g, ' ')))
            setInfo('')
          }
          return
        }

        const tokenHash = query.get('token_hash')
        const otpType = query.get('type') || 'invite'
        if (tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          })
          if (otpError) throw otpError
          cleanInviteParamsFromUrl()
        } else {
          const code = query.get('code')
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) throw exchangeError
            cleanInviteParamsFromUrl()
          }

          const accessToken = hash.get('access_token')
          const refreshToken = hash.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (sessionError) throw sessionError
            cleanInviteParamsFromUrl()
          }
        }

        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session?.user) {
          await new Promise((r) => setTimeout(r, 400))
          const retry = await supabase.auth.getSession()
          session = retry.data?.session || null
        }

        if (!session?.user) {
          if (!cancelled) {
            setError(
              'This invitation link is invalid or has expired. Ask your agency admin to send a new invite from Settings → Team.',
            )
            setInfo('')
          }
          return
        }

        if (!cancelled) {
          setEmail(session.user.email || '')
          setReady(true)
          setInfo('Create a password to finish joining Honeywell Travel.')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not open this invitation.')
          setInfo('')
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not save password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Team invitation"
      title="Join your agency"
      subtitle="Set a password to access the shared Honeywell Travel workspace on Travel Hub."
      footer={
        <p className="text-center text-sm text-slate-400">
          Already set up?{' '}
          <Link to="/login" className="font-medium text-teal-300 hover:text-teal-200">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <AuthAlert variant="error">{error}</AuthAlert>}
        {!error && info && <AuthAlert variant="info">{info}</AuthAlert>}

        {ready && (
          <>
            <AuthInput
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              readOnly
              autoComplete="email"
            />
            <AuthInput
              label="Create password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <AuthInput
              label="Confirm password"
              type="password"
              icon={Lock}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat password"
              autoComplete="new-password"
            />
            <AuthSubmitButton loading={saving} loadingLabel="Saving…">
              Join workspace
            </AuthSubmitButton>
          </>
        )}

        {error && (
          <p className="text-center text-sm text-slate-400">
            <Link to="/login" className="font-medium text-teal-300 hover:text-teal-200">
              Back to sign in
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
