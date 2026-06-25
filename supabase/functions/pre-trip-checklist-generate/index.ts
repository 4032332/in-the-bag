import { AsyncJob, PreTripChecklistGenerateInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContent } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as PreTripChecklistGenerateInput;
    
    const destinationsStr = input.destinations?.map(d => `${d.city}, ${d.country}`).join('; ') || 'Unknown';
    const citizenshipStr = input.citizenship_countries?.join(', ') || 'Unknown';
    const medical = input.medical_conditions || 'none specified';
    const meds = input.medications || 'none specified';
    const food = input.food_allergies || 'none specified';
    const diet = input.dietary_requirements || 'none specified';
    const access = input.disability_accessibility_needs || 'none specified';

    const prompt = `You are a travel preparation assistant. Generate a pre-trip checklist for the following trip.

Destination(s): ${destinationsStr}
Travel dates: ${input.trip_start} to ${input.trip_end}
Traveller's country of residency: ${input.country_of_residency || 'Unknown'}
Citizenship: ${citizenshipStr}
Is cruise: ${input.is_cruise ? 'yes' : 'no'}
Medical conditions: ${medical}
Medications: ${meds}
Food allergies: ${food}
Dietary requirements: ${diet}
Accessibility needs: ${access}

Return a JSON array of task objects. Each object must have:
- "title": string — concise task description (no emojis)
- "category": one of "visa", "insurance", "medication", "banking", "driving", "esim", "vaccination", "accessibility", "documentation", "health", "general"

Focus on: visa requirements, travel insurance, medication import rules, banking/currency, international driving permit, e-SIM/connectivity, vaccinations, accessibility preparation.
For cruise trips, also include: cruise insurance, port entry/visa requirements, onboard account setup.
Do not use emojis anywhere in your response.
Return only the JSON array. No markdown fences, no explanation.`;

    const text = await generateContent('gemini-2.5-pro', [{ parts: [{ text: prompt }] }]);
    
    // Parse JSON
    let tasks: any[];
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      tasks = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    if (!Array.isArray(tasks)) {
      throw new Error('Gemini response is not a JSON array');
    }

    let insertedCount = 0;
    let discardedCount = 0;
    const inserts: any[] = [];

    for (const item of tasks) {
      if (item && typeof item.title === 'string' && typeof item.category === 'string') {
        inserts.push({
          trip_id: input.trip_id,
          title: item.title,
          category: item.category,
          is_completed: false,
          is_suggested: true,
          is_dismissed: false,
          source: 'ai'
        });
        insertedCount++;
      } else {
        discardedCount++;
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('trip_tasks').insert(inserts);
      if (insertError) {
        throw new Error(`Failed to insert tasks: ${insertError.message}`);
      }
    }

    let jobErrorStr: string | null = null;
    if (discardedCount > 0) {
      jobErrorStr = `${discardedCount} items discarded due to missing fields.`;
    }

    // Wait, if there's a warning but we succeeded, we could update the error field directly via markJobCompleted?
    // markJobCompleted doesn't update 'error' field in my job-utils. Let's just pass it in output or just leave it.
    // The prompt says: "log count of discarded items to job error field if any discarded (but continue)"
    // If I need to log to error field, I should update markJobCompleted or just do a manual update.
    if (jobErrorStr) {
       await supabaseAdmin.from('async_jobs').update({ error: jobErrorStr }).eq('id', job.id);
    }

    await markJobCompleted(job.id, { task_count: insertedCount });

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}
