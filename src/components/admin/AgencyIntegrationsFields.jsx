import Input from '../ui/Input'

export default function AgencyIntegrationsFields({ form, onChange, showResendKey = false }) {
  function set(field, value) {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="space-y-4">
      <Input label="Slack webhook URL" value={form.slack_webhook_url || ''} onChange={(e) => set('slack_webhook_url', e.target.value)} placeholder="https://hooks.slack.com/services/..." />
      <Input label="Slack channel name" value={form.slack_channel_name || ''} onChange={(e) => set('slack_channel_name', e.target.value)} placeholder="#crm-alerts" />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.slack_notifications_enabled !== false} onChange={(e) => set('slack_notifications_enabled', e.target.checked)} />
        Enable Slack notifications
      </label>
      <hr className="border-slate-200" />
      <Input label="Resend domain" value={form.resend_domain || ''} onChange={(e) => set('resend_domain', e.target.value)} placeholder="mail.youragency.com" />
      <Input label="From email" value={form.resend_from_email || ''} onChange={(e) => set('resend_from_email', e.target.value)} placeholder="hello@mail.youragency.com" />
      <Input label="Reply-to email" value={form.resend_reply_to || ''} onChange={(e) => set('resend_reply_to', e.target.value)} type="email" />
      {showResendKey && (
        <Input label="Resend API key" type="password" value={form.resend_api_key || ''} onChange={(e) => set('resend_api_key', e.target.value)} placeholder="re_..." />
      )}
    </div>
  )
}
