import Input from '../ui/Input'
import Select from '../ui/Select'
import { SECURITY_MODES } from '../../constants/formFields'

export default function FormSecuritySettings({ form, onChange }) {
  const gate = form.gate_config || {}
  const settings = form.settings || {}

  const updateGate = (patch) => onChange({ gate_config: { ...gate, ...patch } })
  const updateSettings = (patch) => onChange({ settings: { ...settings, ...patch } })

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-800">Security & notifications</h3>
      <Select
        label="Security mode"
        value={form.security_mode || 'link_only'}
        onChange={(e) => onChange({ security_mode: e.target.value })}
        options={SECURITY_MODES.map((m) => ({ value: m.value, label: m.label }))}
      />

      {form.security_mode === 'gate' && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Respondents must verify before seeing the form.</p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!gate.require_email}
              onChange={(e) => updateGate({ require_email: e.target.checked })}
              className="rounded text-teal-600"
            />
            Require matching email
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!gate.require_booking_ref}
              onChange={(e) => updateGate({ require_booking_ref: e.target.checked })}
              className="rounded text-teal-600"
            />
            Require valid booking reference
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!gate.require_access_code}
              onChange={(e) => updateGate({ require_access_code: e.target.checked })}
              className="rounded text-teal-600"
            />
            Require access code
          </label>
        </div>
      )}

      <Input
        label="Notification emails (comma-separated)"
        value={(settings.notification_emails || []).join(', ')}
        onChange={(e) =>
          updateSettings({
            notification_emails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
          })
        }
        placeholder="info@youragency.com, manager@youragency.com"
      />
      <p className="text-xs text-slate-500">
        You receive a summary email here when a traveler submits. If empty, we use the agency owner&apos;s login email.
      </p>
      <Input
        label="Thank you message"
        value={settings.thank_you_message || ''}
        onChange={(e) => updateSettings({ thank_you_message: e.target.value })}
      />
    </div>
  )
}
