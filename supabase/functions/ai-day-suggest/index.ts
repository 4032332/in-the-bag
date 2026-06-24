import { AsyncJob, AiDaySuggestInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContent, GeminiContent } from '../_shared/gemini.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as AiDaySuggestInput;

    const destinationsStr = input.trip_context.destinations?.map(d => `${d.city}, ${d.country}`).join('; ') || 'Unknown';
    const medical = input.user_profile?.medical_conditions || 'none specified';
    const diet = input.user_profile?.dietary_requirements || 'none specified';
    const access = input.user_profile?.disability_accessibility_needs || 'none specified';
    const profileSummary = `Medical: ${medical}, Diet: ${diet}, Accessibility: ${access}`;

    const existingEventsStr = input.existing_day_events && input.existing_day_events.length > 0
      ? input.existing_day_events.map(e => `${e.category} - ${e.title} (${e.start_time || 'no time'})`).join('; ')
      : 'none';

    const systemInstruction = `You are a travel planning assistant helping a user plan events for day ${input.day_date} of their trip to ${destinationsStr}.
Events already on this day: ${existingEventsStr}.
User medical/dietary/accessibility context: ${profileSummary}.
Your role: understand what the user wants, ask at most 1–2 clarifying questions if needed, then return
3–5 concrete event suggestions for this day. Each suggestion must include title, category, optional subcategory,
optional start_time (HH:MM 24hr), and brief notes. Do not use emojis.
Return a JSON object with keys "reply" (string — your conversational response) and "suggestions" (array).`;

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

    if (!parsed.reply || !parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Response JSON is missing "reply" string or "suggestions" array');
    }

    const suggestions = parsed.suggestions.filter((s: any) => s && typeof s.title === 'string' && typeof s.category === 'string');

    await markJobCompleted(job.id, { reply: parsed.reply, suggestions });

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}
