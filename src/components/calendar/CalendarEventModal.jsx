import { useEffect, useState } from 'react'
import Modal, { ModalFooter } from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { CUSTOM_EVENT_TYPES } from '../../constants/calendarConstants'
import { formatClientOptionLabel } from '../../utils/format'

const emptyForm = {
  title: '',
  description: '',
  event_type: 'meeting',
  start_date: '',
  start_time: '09:00',
  end_time: '10:00',
  all_day: true,
  location: '',
  client_id: '',
}

function toFormValues(initial, defaultDate) {
  if (!initial) {
    const date = defaultDate || new Date().toISOString().split('T')[0]
    return { ...emptyForm, start_date: date }
  }

  const raw = initial.meta || initial
  const start = new Date(raw.start_at || initial.start)
  const end = new Date(raw.end_at || initial.end || raw.start_at || initial.start)

  return {
    title: initial.title || raw.title || '',
    description: initial.description || raw.description || '',
    event_type: initial.eventType || raw.event_type || 'meeting',
    start_date: start.toISOString().split('T')[0],
    start_time: start.toTimeString().slice(0, 5),
    end_time: end.toTimeString().slice(0, 5),
    all_day: initial.allDay ?? initial.all_day ?? true,
    location: initial.location || initial.meta?.location || '',
    client_id: initial.clientId || initial.client_id || '',
  }
}

function buildPayload(form) {
  let startAt
  let endAt

  if (form.all_day) {
    startAt = new Date(`${form.start_date}T00:00:00`)
    endAt = new Date(`${form.start_date}T23:59:59`)
  } else {
    startAt = new Date(`${form.start_date}T${form.start_time}:00`)
    endAt = new Date(`${form.start_date}T${form.end_time}:00`)
    if (endAt <= startAt) {
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
    }
  }

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    event_type: form.event_type,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    all_day: form.all_day,
    location: form.location.trim() || null,
    client_id: form.client_id || null,
    source: 'manual',
  }
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  defaultDate,
  clients = [],
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (isOpen) {
      setForm(toFormValues(initialEvent, defaultDate))
    }
  }, [isOpen, initialEvent, defaultDate])

  async function handleSave() {
    if (!form.title.trim()) return
    await onSave(buildPayload(form))
  }

  const clientOptions = [
    { value: '', label: 'No client linked' },
    ...clients.map((c) => ({ value: c.id, label: formatClientOptionLabel(c) })),
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialEvent?.sourceId && initialEvent?.sourceType === 'calendar_event' ? 'Edit event' : 'New calendar event'}
      footer={<ModalFooter onCancel={onClose} onSave={handleSave} saveLabel="Save event" saving={saving} />}
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Follow-up call with Mr Andreas"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Event type"
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            options={CUSTOM_EVENT_TYPES}
          />
          <Select
            label="Client (optional)"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            options={clientOptions}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              All day event
            </label>
          </div>
        </div>

        {!form.all_day && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <Input
              label="End time"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
        )}

        <Input
          label="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Office, video call, airport..."
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder="Agenda, talking points, or notes..."
          />
        </div>

      </div>
    </Modal>
  )
}
