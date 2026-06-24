import { AsyncJob, VideoExtractInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContent } from '../_shared/gemini.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as VideoExtractInput;

    const prompt = `You are a travel content extraction assistant. Analyse the TikTok video at the following URL and extract all named places, activities, restaurants, hotels, and practical travel tips mentioned in the video or caption.

URL: ${input.url}

Return a JSON array of items. Each item must have:
- "type": "event" or "task"
- "label": string — the place or action name
- "timestamp": string or null — approximate video timestamp where mentioned, or null if unknown
- "classification": string — category label (e.g. "restaurant", "attraction", "hotel", "tip", "activity")

Do not use emojis anywhere in your response.
Return only the JSON array. No markdown fences, no explanation.`;

    const text = await generateContent('gemini-2.5-pro', [{ parts: [{ text: prompt }] }]);
    
    let parsedItems: any[];
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedItems = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    if (!Array.isArray(parsedItems)) {
      throw new Error('Response JSON is not an array');
    }

    const items = parsedItems.filter(item => 
      item && 
      (item.type === 'event' || item.type === 'task') &&
      typeof item.label === 'string' &&
      (typeof item.timestamp === 'string' || item.timestamp === null) &&
      typeof item.classification === 'string'
    );

    await markJobCompleted(job.id, { items });

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
