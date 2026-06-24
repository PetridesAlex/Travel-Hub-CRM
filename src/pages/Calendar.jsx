import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, setHours, setMinutes, startOfDay } from 'date-fns'
import { Calendar as CalendarIcon, Filter, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getClients } from '../services/clients'
import { fetchCalendarEvents, getCalendarSuggestions } from '../services/calendarAggregator'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../services/calendarEvents'
import {
  rescheduleCalendarEvent,
  executeCalendarAiActions,
  parseCalendarAiResponse,
} from '../services/calendarActions'
import { updateTask, deleteTask } from '../services/tasks'
import { askCalendarAssistant } from '../services/aiAssist'
import { CALENDAR_FILTERS } from '../constants/calendarConstants'
import {
  filterEventsByClient,
  filterEventsByType,
  filterEventsInRange,
  getMonthGridDays,
  getViewRange,
  getViewTitle,
  navigateDate,
} from '../utils/calendarHelpers'
import CalendarToolbar from '../components/calendar/CalendarToolbar'
import CalendarMonthGrid from '../components/calendar/CalendarMonthGrid'
import CalendarWeekGrid from '../components/calendar/CalendarWeekGrid'
import CalendarDayGrid from '../components/calendar/CalendarDayGrid'
import CalendarAgendaView from '../components/calendar/CalendarAgendaView'
import CalendarEventDrawer from '../components/calendar/CalendarEventDrawer'
import CalendarEventModal from '../components/calendar/CalendarEventModal'
import UpcomingSidebar from '../components/calendar/UpcomingSidebar'
import AICalendarAssistant from '../components/calendar/AICalendarAssistant'
import Select from '../components/ui/Select'

export default function Calendar() {
  const { user, session } = useAuth()
  const { agency } = useAgency()

  const [view, setView] = useState('month')
  const [activeDate, setActiveDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [defaultModalDate, setDefaultModalDate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [aiOpen, setAiOpen] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReply, setAiReply] = useState('')
  const [aiError, setAiError] = useState('')
  const [dragEvent, setDragEvent] = useState(null)

  const range = useMemo(() => getViewRange(view, activeDate), [view, activeDate])

  const filteredEvents = useMemo(() => {
    let list = filterEventsInRange(events, range.start, range.end)
    list = filterEventsByType(list, typeFilter)
    list = filterEventsByClient(list, clientFilter)
    return list
  }, [events, range, typeFilter, clientFilter])

  const { suggestions, overdue } = useMemo(
    () => getCalendarSuggestions(events),
    [events],
  )

  const miniDays = useMemo(() => getMonthGridDays(activeDate), [activeDate])

  const [loadError, setLoadError] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      const data = await fetchCalendarEvents(range.start, range.end)
      setEvents(data)
    } catch (err) {
      console.error(err)
      setLoadError(err.message || 'Failed to load calendar events.')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    getClients().then(setClients).catch(console.error)
  }, [])

  function openNewEvent(date) {
    setEditingEvent(null)
    setDefaultModalDate(date || activeDate)
    setModalOpen(true)
  }

  async function handleSaveEvent(payload) {
    if (!user?.id || !agency?.id) return
    setSaving(true)
    try {
      if (editingEvent?.sourceType === 'calendar_event') {
        await updateCalendarEvent(editingEvent.sourceId, payload)
      } else {
        await createCalendarEvent(payload, user.id, agency.id)
      }
      setModalOpen(false)
      setEditingEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEvent(event) {
    if (!event.deletable) return

    const confirmMessages = {
      calendar_event: 'Delete this calendar event?',
      task: 'Delete this task? It will be removed from your task list as well.',
    }
    const message = confirmMessages[event.sourceType]
    if (!message) return
    if (!confirm(message)) return

    try {
      if (event.sourceType === 'calendar_event') {
        await deleteCalendarEvent(event.sourceId)
      } else if (event.sourceType === 'task') {
        await deleteTask(event.sourceId)
      }
      setSelectedEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleMarkComplete(event) {
    if (event.sourceType !== 'task') return
    try {
      await updateTask(event.sourceId, { status: 'completed' })
      setSelectedEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.message)
    }
  }

  function handleDragStart(event, e) {
    if (!event.draggable) return
    setDragEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDropOnDay(day) {
    if (!dragEvent?.draggable || !user?.id || !agency?.id) return
    const newStart = startOfDay(day)
    const newEnd = startOfDay(day)
    try {
      await rescheduleCalendarEvent(dragEvent, newStart, newEnd, user.id, agency.id)
      setDragEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.message)
      setDragEvent(null)
    }
  }

  async function handleDropOnSlot(day, hour) {
    if (!dragEvent?.draggable || !user?.id || !agency?.id) return
    let newStart = startOfDay(day)
    if (hour != null) {
      newStart = setMinutes(setHours(day, hour), 0)
    }
    const newEnd = dragEvent.allDay
      ? startOfDay(day)
      : new Date(newStart.getTime() + 60 * 60 * 1000)

    try {
      await rescheduleCalendarEvent(
        { ...dragEvent, allDay: hour == null && dragEvent.allDay },
        newStart,
        newEnd,
        user.id,
        agency.id,
      )
      setDragEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.message)
      setDragEvent(null)
    }
  }

  async function handleAiAsk(message) {
    if (!session?.access_token) {
      setAiError('You must be signed in to use the AI assistant.')
      return
    }

    setAiLoading(true)
    setAiError('')
    try {
      const contextEvents = events.slice(0, 50).map((e) => ({
        id: e.sourceId,
        type: e.type,
        title: e.title,
        start: e.start,
        client_id: e.clientId,
        client_name: e.clientName,
        source_type: e.sourceType,
        lead_id: e.leadId || null,
      }))

      const raw = await askCalendarAssistant({
        message,
        today: format(new Date(), 'yyyy-MM-dd'),
        agency_name: agency?.name || '',
        events: contextEvents,
        overdue: overdue.map((e) => ({
          id: e.sourceId,
          title: e.title,
          type: e.type,
          start: e.start,
          client_name: e.clientName,
          source_type: e.sourceType,
          lead_id: e.leadId || null,
        })),
        clients: clients.slice(0, 30).map((c) => ({
          id: c.id,
          name: c.full_name,
          company: c.company_name,
        })),
      }, session)

      const parsed = parseCalendarAiResponse(raw)
      let reply = parsed.reply || raw

      if (parsed.actions?.length && user?.id && agency?.id) {
        const needsConfirm = parsed.actions.length > 1
          || parsed.actions.some((a) => a.type === 'delete_event')
        if (!needsConfirm || confirm(`Apply ${parsed.actions.length} calendar change(s)?`)) {
          const results = await executeCalendarAiActions(parsed.actions, {
            userId: user.id,
            agencyId: agency.id,
          })
          await loadEvents()

          const applied = results.filter((r) => r.ok).length
          const failed = results.filter((r) => !r.ok)
          if (applied > 0) {
            reply += `\n\n✓ Applied ${applied} change${applied > 1 ? 's' : ''} to your calendar.`
          }
          if (failed.length) {
            const migrationHint = failed.some((r) => r.error?.includes('calendar_events'))
              ? ' Run migration 011_calendar.sql in Supabase to enable custom events.'
              : ''
            reply += `\n\n⚠ ${failed.length} action(s) could not be applied: ${failed.map((r) => r.error).join('; ')}.${migrationHint}`
          }
        }
      }

      setAiReply(reply)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const clientOptions = [
    { value: '', label: 'All clients' },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company_name || c.full_name,
    })),
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-200 ring-1 ring-white/10">
              <CalendarIcon className="h-3.5 w-3.5" />
              Operations
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendar</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Tasks, follow-ups, departures, payments, and custom events — with an AI assistant to schedule and summarize your week.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 shadow-inner backdrop-blur-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20">
                <CalendarIcon className="h-3.5 w-3.5 text-teal-300" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">In view</p>
                <p className="text-sm font-bold text-white">{filteredEvents.length} events</p>
              </div>
            </div>
            {overdue.length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2 backdrop-blur-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300/80">Attention</p>
                  <p className="text-sm font-bold text-red-100">{overdue.length} overdue</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CalendarToolbar
        view={view}
        title={getViewTitle(view, activeDate)}
        onViewChange={setView}
        onNavigate={(dir) => setActiveDate((d) => navigateDate(view, d, dir))}
        onToday={() => setActiveDate(new Date())}
        onNewEvent={() => openNewEvent()}
        onToggleAi={() => setAiOpen((v) => !v)}
        aiOpen={aiOpen}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50/50 px-4 py-3.5 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
          <Filter className="h-4 w-4 text-slate-500" />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={CALENDAR_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
          className="min-w-[10rem]"
        />
        <Select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          options={clientOptions}
          className="min-w-[12rem] flex-1"
        />
      </div>

      <div className={`grid gap-6 ${aiOpen ? 'lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_280px_320px]' : 'lg:grid-cols-[minmax(0,1fr)_280px]'}`}>
        <div className="min-w-0">
          {loadError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-24">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <>
              {view === 'month' && (
                <CalendarMonthGrid
                  activeDate={activeDate}
                  events={filteredEvents}
                  onSelectDay={(day) => {
                    setActiveDate(day)
                    setView('day')
                  }}
                  onSelectEvent={setSelectedEvent}
                  onDragStart={handleDragStart}
                  onDropOnDay={handleDropOnDay}
                />
              )}
              {view === 'week' && (
                <CalendarWeekGrid
                  activeDate={activeDate}
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                  onDragStart={handleDragStart}
                  onDropOnSlot={handleDropOnSlot}
                />
              )}
              {view === 'day' && (
                <CalendarDayGrid
                  activeDate={activeDate}
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                  onDragStart={handleDragStart}
                  onDropOnSlot={handleDropOnSlot}
                />
              )}
              {view === 'agenda' && (
                <CalendarAgendaView
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                />
              )}
            </>
          )}
        </div>

        <UpcomingSidebar
          events={events}
          onSelectEvent={setSelectedEvent}
          miniDays={miniDays}
          activeDate={activeDate}
          onSelectDay={setActiveDate}
        />

        {aiOpen && (
          <div className="min-h-[28rem] lg:sticky lg:top-4 lg:self-start">
            <AICalendarAssistant
              suggestions={suggestions}
              onAsk={handleAiAsk}
              loading={aiLoading}
              lastReply={aiReply}
              error={aiError}
            />
          </div>
        )}
      </div>

      <CalendarEventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setEditingEvent(event)
          setModalOpen(true)
        }}
        onDelete={handleDeleteEvent}
        onMarkComplete={handleMarkComplete}
      />

      <CalendarEventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingEvent(null)
        }}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
        defaultDate={defaultModalDate}
        clients={clients}
        saving={saving}
      />
    </div>
  )
}
