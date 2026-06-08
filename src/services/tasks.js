import { supabase } from '../lib/supabase'
import { CLIENT_EMBED } from './clients'

export async function getTasks(filter = 'all') {
  let query = supabase
    .from('tasks')
    .select(`*, clients(${CLIENT_EMBED}), leads(destination)`)
    .order('due_date', { ascending: true })

  if (filter === 'today') {
    const today = new Date().toISOString().split('T')[0]
    query = query.eq('due_date', today).eq('status', 'pending')
  } else if (filter === 'pending') {
    query = query.eq('status', 'pending')
  } else if (filter === 'completed') {
    query = query.eq('status', 'completed')
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTask(task, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, task) {
  const { data, error } = await supabase
    .from('tasks')
    .update(task)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTasksDueTodayCount() {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('due_date', today)
    .eq('status', 'pending')
  if (error) throw error
  return count || 0
}
