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

    // Route by job.type
    // Handlers will be invoked dynamically or imported. Since Deno allows dynamic imports, we can invoke the handler function directly.
    // However, Deno deploy Edge Functions might prefer dynamic import or static. We'll use Deno's async execution without awaiting so we can return 200 immediately, 
    // but the prompt says: "Return 200 { success: true } after invoking the handler; handler is responsible for updating job status." 
    // Actually, edge functions terminate when response is sent. We must await the handler, or the function terminates.
    // Let's await the handler.

    switch (asyncJob.type) {
      case 'cover_photo_fetch':
        import('../cover-photo-fetch/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'pre_trip_checklist_generate':
        import('../pre-trip-checklist-generate/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'treasure_map_generate':
        import('../treasure-map-generate/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'in_the_bag_suggest':
        import('../in-the-bag-suggest/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'ai_trip_suggest':
        import('../ai-trip-suggest/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'ai_day_suggest':
        import('../ai-day-suggest/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'flight_lookup':
        import('../flight-lookup/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'youtube_extract':
        import('../youtube-extract/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      case 'tiktok_extract':
        import('../tiktok-extract/index.ts').then(m => m.handleJob(asyncJob)).catch(console.error);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unrecognised job type' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
