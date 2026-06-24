import { supabase } from '../../../src/lib/supabase';
import { JobType } from './types';

export async function queueJob({ 
  type, 
  input, 
  tripId, 
  eventId, 
  userId 
}: { 
  type: JobType; 
  input: Record<string, unknown>; 
  tripId?: string; 
  eventId?: string; 
  userId: string;
}): Promise<string> {
  
  const { data, error } = await supabase.from('async_jobs').insert({
    type,
    status: 'pending',
    input,
    trip_id: tripId || null,
    event_id: eventId || null,
    user_id: userId
  }).select('id').single();

  if (error || !data) {
    throw new Error(`Failed to queue job: ${error?.message || 'No data returned'}`);
  }

  const jobId = data.id;

  // Fire and forget dispatcher
  supabase.functions.invoke('dispatcher', {
    body: { jobId }
  }).catch((err) => {
    console.warn('Dispatcher invocation failed (job remains pending):', err);
  });

  return jobId;
}
