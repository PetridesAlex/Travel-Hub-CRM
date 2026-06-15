import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'
import { CLIENT_EMBED } from './clients'

export async function getBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, clients(${CLIENT_EMBED}), quotations(title, selling_price)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, clients(${CLIENT_EMBED}), quotations(title)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createBooking(booking, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, user_id: userId, agency_id: resolvedAgencyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBooking(id, booking) {
  const { data, error } = await supabase
    .from('bookings')
    .update(booking)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBooking(id) {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}
