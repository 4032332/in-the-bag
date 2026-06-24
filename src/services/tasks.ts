import { supabase } from '../lib/supabase';
import { TripTask } from '../types/database';

export async function listMyTasks(tripId: string): Promise<TripTask[]> {
  const { data, error } = await supabase
    .from('trip_tasks')
    .select('*')
    .eq('trip_id', tripId)
    .eq('is_suggested', false)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addManualTask(tripId: string, title: string): Promise<TripTask> {
  const { data, error } = await supabase
    .from('trip_tasks')
    .insert({ trip_id: tripId, title, is_suggested: false, is_dismissed: false, is_completed: false, source: 'user' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTaskComplete(taskId: string, is_completed: boolean): Promise<void> {
  const { error } = await supabase.from('trip_tasks').update({ is_completed }).eq('id', taskId);
  if (error) throw error;
}
