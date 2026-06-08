import { isSupabaseConfigured } from '../lib/supabase'

export default function SetupBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      Supabase is not configured yet. Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
      <code className="rounded bg-amber-100 px-1">.env</code> and add your project URL and anon key, then restart{' '}
      <code className="rounded bg-amber-100 px-1">npm run dev</code>.
    </div>
  )
}
