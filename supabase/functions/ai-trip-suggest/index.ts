import { AsyncJob, AiTripSuggestInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContent, GeminiContent } from '../_shared/gemini.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as AiTripSuggestInput;

    const destinationsStr = input.trip_context.destinations?.map(d => `${d.city}, ${d.country}`).join('; ') || 'Unknown';
    const medical = input.user_profile?.medical_conditions || 'none specified';
    const diet = input.user_profile?.dietary_requirements || 'none specified';
    const access = input.user_profile?.disability_accessibility_needs || 'none specified';
    const profileSummary = `Medical: ${medical}, Diet: ${diet}, Accessibility: ${access}`;

    const systemInstruction = `You are a travel planning assistant helping a user plan events for their trip to ${destinationsStr}.
The trip runs from ${input.trip_context.trip_start} to ${input.trip_context.trip_end}.
User medical/dietary/accessibility context: ${profileSummary}.
Existing events on this trip: ${input.trip_context.existing_event_count}.
Your role: understand what the user wants, ask at most 1–2 short clarifying questions if needed,
then return 3–5 concrete event suggestions. Each suggestion must include title, category
(TRANSPORT/ACCOMMODATION/ACTIVITY/MEAL/REST/HEALTH/FREE TIME), optional subcategory, and brief notes.
Do not use emojis. Return suggestions as a JSON object with key "suggestions" containing an array.`;

    const contents: GeminiContent[] = [];
    
    // History
    if (input.conversation_history) {
      for (const msg of input.conversation_history) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        });
      }
    }

    // Current message
    contents.push({
      role: 'user',
      parts: [{ text: input.user_message }]
    });

    const text = await generateContent('gemini-2.5-pro', contents, { systemInstruction: { parts: [{ text: systemInstruction }] } });
    
    let parsed: any;
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Response JSON is missing "suggestions" array');
    }

    const suggestions = parsed.suggestions.filter((s: any) => s && typeof s.title === 'string' && typeof s.category === 'string');

    await markJobCompleted(job.id, { suggestions });

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
