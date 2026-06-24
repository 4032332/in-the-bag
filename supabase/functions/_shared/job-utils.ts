import { supabaseAdmin } from './supabase.ts';

export async function markJobProcessing(jobId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('async_jobs')
    .update({ status: 'processing' })
    .eq('id', jobId);
  
  if (error) {
    throw new Error(`Failed to mark job as processing: ${error.message}`);
  }
}

export async function markJobCompleted(jobId: string, output: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('async_jobs')
    .update({ 
      status: 'completed', 
      output,
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);
  
  if (error) {
    throw new Error(`Failed to mark job as completed: ${error.message}`);
  }
}

export async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('async_jobs')
    .update({ 
      status: 'failed', 
      error: errorMessage,
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);
  
  if (error) {
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }
}
