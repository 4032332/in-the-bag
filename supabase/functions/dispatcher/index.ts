import { supabaseAdmin } from '../_shared/supabase.ts';
import { AsyncJob } from '../_shared/types.ts';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Auth validation
    let isServiceRole = false;
    let userId: string | null = null;
    
    if (token === SERVICE_ROLE_KEY) {
      isServiceRole = true;
    } else {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      userId = data.user.id;
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (!isServiceRole && job.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (job.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Job already processed' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    const asyncJob = job as AsyncJob;

    // Route by invoking the per-job-type Edge Function directly via the admin client.
    // Each handler is its own deployed function — cross-directory dynamic imports are not
    // bundled by Supabase and fire-and-forget patterns are killed when the response is sent.
    // Invoking via supabaseAdmin.functions.invoke() sends an authenticated HTTP request to
    // the target function and awaits its completion before we return 200.
    const handlerName: Record<string, string> = {
      cover_photo_fetch: 'cover-photo-fetch',
      pre_trip_checklist_generate: 'pre-trip-checklist-generate',
      treasure_map_generate: 'treasure-map-generate',
      in_the_bag_suggest: 'in-the-bag-suggest',
      ai_trip_suggest: 'ai-trip-suggest',
      ai_day_suggest: 'ai-day-suggest',
      flight_lookup: 'flight-lookup',
      youtube_extract: 'youtube-extract',
      tiktok_extract: 'tiktok-extract',
    };

    const fnName = handlerName[asyncJob.type];
    if (!fnName) {
      return new Response(JSON.stringify({ error: 'Unrecognised job type' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const { error: invokeError } = await supabaseAdmin.functions.invoke(fnName, {
      body: { jobId: asyncJob.id },
    });

    if (invokeError) {
      return new Response(JSON.stringify({ error: `Handler invocation failed: ${invokeError.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
