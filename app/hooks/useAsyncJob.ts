import { useState, useEffect } from 'react';
import { AsyncJob } from '../lib/jobs/types';
import { subscribeToJob, unsubscribeFromJob } from '../lib/jobs/realtime';
import { supabase } from '../../src/lib/supabase';

export function useAsyncJob(jobId: string | null) {
  const [job, setJob] = useState<AsyncJob | null>(null);
  
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    // Fetch initial state
    let isMounted = true;
    supabase
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setJob(data as AsyncJob);
        }
      });

    // Subscribe to realtime updates
    const channel = subscribeToJob(jobId, (updatedJob) => {
      setJob(updatedJob);
    });

    return () => {
      isMounted = false;
      unsubscribeFromJob(channel);
    };
  }, [jobId]);

  return {
    job,
    isLoading: job?.status === 'pending' || job?.status === 'processing',
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
  };
}
