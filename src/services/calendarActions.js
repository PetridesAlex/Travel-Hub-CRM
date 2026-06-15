import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendarEvents'
import { createTask, updateTask } from './tasks'
import { updateLead } from './leads'
import { updateBooking } from './bookings'

export async function rescheduleCalendarEvent(event, newStart, newEnd, userId, agencyId) {
  if (event.sourceType === 'calendar_event') {
    return updateCalendarEvent(event.sourceId, {
      start_at: newStart.toISOString(),
      end_at: (newEnd || newStart).toISOString(),
      all_day: event.allDay,
    })
  }

  if (event.sourceType === 'task') {
    const dueDate = newStart.toISOString().split('T')[0]
    return updateTask(event.sourceId, { due_date: dueDate })
  }

  if (event.sourceType === 'lead') {
    const followUpDate = newStart.toISOString().split('T')[0]
    return updateLead(event.sourceId, { follow_up_date: followUpDate })
  }

  if (event.sourceType === 'booking' && event.type === 'payment_due') {
    const dueDate = newStart.toISOString().split('T')[0]
    return updateBooking(event.sourceId, { due_date: dueDate })
  }

  throw new Error('This event cannot be rescheduled from the calendar.')
}

export async function executeCalendarAiActions(actions, { userId, agencyId }) {
  const results = []

  for (const action of actions || []) {
    try {
      if (action.type === 'create_event') {
        const payload = action.payload || {}
        const row = await createCalendarEvent({
          title: payload.title,
          description: payload.description || null,
          event_type: payload.event_type || 'meeting',
          source: 'ai',
          start_at: payload.start_at,
          end_at: payload.end_at || payload.start_at,
          all_day: payload.all_day ?? false,
          location: payload.location || null,
          client_id: payload.client_id || null,
          lead_id: payload.lead_id || null,
        }, userId, agencyId)
        results.push({ ok: true, type: action.type, id: row.id })
      } else if (action.type === 'update_task') {
        const row = await updateTask(action.payload.id, {
          due_date: action.payload.due_date,
          ...(action.payload.status ? { status: action.payload.status } : {}),
        })
        results.push({ ok: true, type: action.type, id: row.id })
      } else if (action.type === 'update_lead') {
        const row = await updateLead(action.payload.id, {
          follow_up_date: action.payload.follow_up_date,
          ...(action.payload.status ? { status: action.payload.status } : {}),
        })
        results.push({ ok: true, type: action.type, id: row.id })
      } else if (action.type === 'create_task') {
        const row = await createTask({
          title: action.payload.title,
          description: action.payload.description || null,
          due_date: action.payload.due_date,
          client_id: action.payload.client_id || null,
          lead_id: action.payload.lead_id || null,
          status: 'pending',
        }, userId, agencyId)
        results.push({ ok: true, type: action.type, id: row.id })
      } else if (action.type === 'delete_event') {
        await deleteCalendarEvent(action.payload.id)
        results.push({ ok: true, type: action.type })
      }
    } catch (err) {
      results.push({ ok: false, type: action.type, error: err.message })
    }
  }

  return results
}

export function parseCalendarAiResponse(raw) {
  if (!raw) return { reply: '', actions: [] }
  const trimmed = raw.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return { reply: trimmed, actions: [] }
      }
    }
    return { reply: trimmed, actions: [] }
  }
}
