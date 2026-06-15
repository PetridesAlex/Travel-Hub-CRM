import { supabase } from '../lib/supabase'
import { CLIENT_EMBED } from './clients'

export async function getCalendarEvents(rangeStart, rangeEnd) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`*, clients(${CLIENT_EMBED})`)
    .gte('start_at', rangeStart.toISOString())
    .lte('start_at', rangeEnd.toISOString())
    .order('start_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCalendarEvent(event, userId, agencyId) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...event, user_id: userId, agency_id: agencyId })
    .select(`*, clients(${CLIENT_EMBED})`)
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(id, event) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(event)
    .eq('id', id)
    .select(`*, clients(${CLIENT_EMBED})`)
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(id) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}
