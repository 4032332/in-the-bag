import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../src/lib/supabase';
import { AsyncJob } from './types';

export function subscribeToJob(jobId: string, onUpdate: (job: AsyncJob) => void): RealtimeChannel {
  const channel = supabase
    .channel(`job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'async_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        onUpdate(payload.new as AsyncJob);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromJob(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
