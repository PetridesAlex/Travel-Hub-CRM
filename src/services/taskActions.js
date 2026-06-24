import { createTask, updateTask } from './tasks'
import { differenceInDays, parseISO } from 'date-fns'
import { formatClientName } from '../utils/format'

export function parseTaskAiResponse(raw) {
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

export async function executeTaskAiActions(actions, { userId, agencyId }) {
  const results = []

  for (const action of actions || []) {
    try {
      if (action.type === 'create_task') {
        const payload = action.payload || {}
        if (!payload.title?.trim()) {
          throw new Error('Task title is required.')
        }
        const row = await createTask({
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          due_date: payload.due_date || null,
          client_id: payload.client_id || null,
          lead_id: payload.lead_id || null,
          status: 'pending',
        }, userId, agencyId)
        results.push({ ok: true, type: action.type, id: row.id, title: row.title })
      } else if (action.type === 'update_task') {
        const payload = action.payload || {}
        if (!payload.id) throw new Error('Task id is required for update.')
        const updates = {}
        if (payload.title) updates.title = payload.title.trim()
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null
        if (payload.due_date !== undefined) updates.due_date = payload.due_date || null
        if (payload.status) updates.status = payload.status
        const row = await updateTask(payload.id, updates)
        results.push({ ok: true, type: action.type, id: row.id, title: row.title })
      } else if (action.type === 'complete_task') {
        const payload = action.payload || {}
        if (!payload.id) throw new Error('Task id is required to complete.')
        const row = await updateTask(payload.id, { status: 'completed' })
        results.push({ ok: true, type: action.type, id: row.id, title: row.title })
      } else {
        throw new Error(`Unknown action type: ${action.type}`)
      }
    } catch (err) {
      results.push({ ok: false, type: action.type, error: err.message })
    }
  }

  return results
}

export function getTaskSuggestions(tasks, today) {
  const suggestions = []

  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false
    return differenceInDays(parseISO(t.due_date), new Date()) < 0
  })

  const dueToday = tasks.filter((t) => t.due_date === today && t.status === 'pending')

  if (overdue.length) {
    suggestions.push({
      id: 'overdue',
      label: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} — summarize & prioritize`,
      prompt: 'Summarize my overdue tasks by client and urgency, and suggest what to tackle first today.',
    })
  }

  if (dueToday.length) {
    suggestions.push({
      id: 'today',
      label: `${dueToday.length} due today — review schedule`,
      prompt: 'List my tasks due today with client names and suggest an efficient order to complete them.',
    })
  }

  const pending = tasks.filter((t) => t.status === 'pending')
  if (pending.length >= 3 && !overdue.length) {
    suggestions.push({
      id: 'pending',
      label: 'Review pending follow-ups',
      prompt: 'Give me a brief overview of my pending follow-ups and flag any that need a due date.',
    })
  }

  suggestions.push({
    id: 'create',
    label: 'Add a follow-up task',
    prompt: 'I need to schedule a client follow-up call — ask me for the client name and due date.',
  })

  return suggestions.slice(0, 4)
}

export function buildTaskAiContext(tasks, clients, leads, today) {
  const taskContext = tasks.slice(0, 60).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || null,
    due_date: t.due_date,
    status: t.status,
    client_id: t.client_id || null,
    client_name: formatClientName(t.clients),
    lead_id: t.lead_id || null,
    lead_destination: t.leads?.destination || null,
  }))

  const overdue = taskContext.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false
    return differenceInDays(parseISO(t.due_date), new Date()) < 0
  })

  const dueToday = taskContext.filter((t) => t.due_date === today && t.status === 'pending')

  return {
    tasks: taskContext,
    overdue,
    due_today: dueToday,
    clients: clients.slice(0, 40).map((c) => ({
      id: c.id,
      name: c.full_name,
      company: c.company_name,
    })),
    leads: leads.slice(0, 40).map((l) => ({
      id: l.id,
      destination: l.destination,
      client_id: l.client_id,
      status: l.status,
    })),
  }
}
