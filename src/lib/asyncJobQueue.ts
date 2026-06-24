import { supabase } from './supabase';
import { AsyncJob } from '../types/database';

export async function enqueueJob(input: {
  type: AsyncJob['type'];
  input: Record<string, unknown>;
  trip_id?: string;
  event_id?: string;
  user_id: string;
}): Promise<AsyncJob> {
  const { data, error } = await supabase
    .from('async_jobs')
    .insert({ ...input, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
