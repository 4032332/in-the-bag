import { AsyncJob, CoverPhotoFetchInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContentGrounded } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as CoverPhotoFetchInput;
    
    if (!input.destinations || input.destinations.length === 0) {
      throw new Error('No destinations provided');
    }
    
    const primaryDest = input.destinations[0];
    const prompt = `Find a high-quality, visually striking photograph of ${primaryDest.city}, ${primaryDest.country} suitable for a travel app cover image.
Return only the direct URL of the best image you find. The URL must be a direct link to a JPEG or PNG image file.`;

    const { text } = await generateContentGrounded('gemini-2.5-pro', [{ parts: [{ text: prompt }] }]);
    
    // Extract URL
    const urlMatch = text.match(/https?:\/\/[^\s"']+/);
    if (!urlMatch) {
      throw new Error('Could not extract a valid URL from Gemini response');
    }
    const imageUrl = urlMatch[0];

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from ${imageUrl}: ${response.statusText}`);
    }
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type from ${imageUrl}: ${contentType}`);
    }
    const buffer = await response.arrayBuffer();

    // Upload to Storage
    const path = `${input.trip_id}/cover.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage.from('trip-covers').upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('trip-covers').getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    // Update trip
    const { error: updateError } = await supabaseAdmin
      .from('trips')
      .update({ cover_photo_url: publicUrl })
      .eq('id', input.trip_id);
      
    if (updateError) {
      throw new Error(`Failed to update trip: ${updateError.message}`);
    }

    await markJobCompleted(job.id, { cover_photo_url: publicUrl });

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}

Deno.serve(async (req) => {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { data: job, error } = await supabaseAdmin
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    await handleJob(job as AsyncJob);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
