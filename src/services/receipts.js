import { supabase } from '../lib/supabase'
import { CLIENT_EMBED } from './clients'

export async function getReceipts(search = '', paymentMethod = '') {
  let query = supabase
    .from('receipts')
    .select(`*, clients(${CLIENT_EMBED}), invoices(invoice_number), bookings(booking_reference)`)
    .order('payment_date', { ascending: false })

  if (paymentMethod) {
    query = query.eq('payment_method', paymentMethod)
  }

  if (search) {
    query = query.or(
      `receipt_number.ilike.%${search}%,reference.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getReceipt(id) {
  const { data, error } = await supabase
    .from('receipts')
    .select(`*, clients(${CLIENT_EMBED}), invoices(invoice_number), bookings(booking_reference)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createReceipt(receipt, userId) {
  const { data, error } = await supabase
    .from('receipts')
    .insert({ ...receipt, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReceipt(id, receipt) {
  const { data, error } = await supabase
    .from('receipts')
    .update(receipt)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReceipt(id) {
  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) throw error
}
