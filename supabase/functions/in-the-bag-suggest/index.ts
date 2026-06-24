import { AsyncJob, InTheBagSuggestInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContent } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as InTheBagSuggestInput;

    const medical = input.medical_conditions || 'none';
    const diet = input.dietary_requirements || 'none';
    const access = input.disability_accessibility_needs || 'none';
    
    let prompt = '';
    const isTripLevel = input.event_id == null;

    if (isTripLevel) {
      const destinationsStr = input.destinations?.map(d => `${d.city}, ${d.country}`).join('; ') || 'Unknown';
      const start = new Date(input.trip_start);
      const end = new Date(input.trip_end);
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      prompt = `You are a packing list assistant. Suggest general packing items for a trip.

Destination(s): ${destinationsStr}
Trip duration: ${input.trip_start} to ${input.trip_end} (${days} days)
Medical conditions: ${medical}
Dietary requirements: ${diet}
Accessibility needs: ${access}

Return a JSON array of packing item titles. Each title must be a concise item name (e.g. "Travel adaptor", "Sunscreen SPF50"). No emojis. No quantities. No explanations.
Focus on items applicable to the whole trip regardless of specific activities.
Return only the JSON array of strings.`;

    } else {
      const category = input.event_category || 'general';
      const subcategory = input.event_subcategory || 'general';
      const city = input.destination_city || 'Unknown';
      const country = input.destination_country || 'Unknown';

      prompt = `You are a packing list assistant. Suggest packing items for a specific event.

Event type: ${category} — ${subcategory}
Location: ${city}, ${country}
Trip dates: ${input.trip_start} to ${input.trip_end}
Medical conditions: ${medical}
Dietary requirements: ${diet}
Accessibility needs: ${access}

Return a JSON array of packing item titles specific to this event type (e.g. for a beach activity: "Sunscreen", "Towel", "Swimwear"). No emojis. No quantities. No explanations.
Return only the JSON array of strings.`;
    }

    const text = await generateContent('gemini-2.5-pro', [{ parts: [{ text: prompt }] }]);
    
    let items: any[];
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      items = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON array of strings');
    }

    if (!Array.isArray(items)) {
      throw new Error('Gemini response is not a JSON array');
    }

    let insertedCount = 0;
    let discardedCount = 0;
    const inserts: any[] = [];
    let scopingWarning = false;

    for (const item of items) {
      if (typeof item === 'string' && item.trim().length > 0) {
        const row = {
          trip_id: input.trip_id,
          trip_day_id: null as null, // Enforced null
          event_id: isTripLevel ? null : input.event_id,
          title: item.trim(),
          is_packed: false,
          is_ai_suggested: true
        };

        // Defensive check
        if (row.trip_day_id !== null) {
          scopingWarning = true;
          discardedCount++;
          continue;
        }

        inserts.push(row);
        insertedCount++;
      } else {
        discardedCount++;
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('in_the_bag_items').insert(inserts);
      if (insertError) {
        throw new Error(`Failed to insert packing items: ${insertError.message}`);
      }
    }

    if (scopingWarning) {
      const existingError = job.error || '';
      await supabaseAdmin.from('async_jobs').update({ error: `${existingError} | WARNING: trip_day_id was not null for some items and they were discarded.` }).eq('id', job.id);
    }

    await markJobCompleted(job.id, { item_count: insertedCount, discarded_count: discardedCount });

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}
