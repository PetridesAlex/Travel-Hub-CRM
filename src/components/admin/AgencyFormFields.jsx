import Input from '../ui/Input'
import Select from '../ui/Select'

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function AgencyFormFields({ form, onChange, showSubscription = false }) {
  function set(field, value) {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="space-y-4">
      <Input label="Company name" value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
      <Input label="Logo URL" value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} placeholder="/logos/agency.png or https://..." />
      <Input label="Address" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        <Input label="Email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} type="email" />
      </div>
      <Input label="Website" value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Invoice footer</label>
        <textarea value={form.invoice_footer || ''} onChange={(e) => set('invoice_footer', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email signature</label>
        <textarea value={form.email_signature || ''} onChange={(e) => set('email_signature', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {showSubscription && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Subscription status" value={form.subscription_status || 'trial'} onChange={(e) => set('subscription_status', e.target.value)} options={STATUS_OPTIONS} />
            <Select label="Subscription plan" value={form.subscription_plan || 'starter'} onChange={(e) => set('subscription_plan', e.target.value)} options={PLAN_OPTIONS} />
          </div>
          <Input label="Monthly price" type="number" step="0.01" value={form.monthly_price ?? ''} onChange={(e) => set('monthly_price', e.target.value === '' ? null : Number(e.target.value))} />
          <Input label="Trial ends at" type="datetime-local" value={form.trial_ends_at ? form.trial_ends_at.slice(0, 16) : ''} onChange={(e) => set('trial_ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </>
      )}
    </div>
  )
}
