import { AsyncJob, TreasureMapGenerateInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateImage } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as TreasureMapGenerateInput;
    
    const primaryDest = input.destinations?.[0];
    const locStr = primaryDest ? `${primaryDest.city}, ${primaryDest.country}` : 'a mystical land';

    const prompt = input.is_cruise
      ? `A hand-drawn illustrated nautical map in a vintage pirate treasure map style. Ocean waves, sea monsters, compass rose, ship illustrations, aged parchment texture, warm sepia tones. No text labels. Square format.`
      : `A hand-drawn illustrated travel map of ${locStr} in a vintage parchment style. Warm sepia and aged paper tones, decorative compass rose, illustrated landmarks and terrain features, no text labels. Square format.`;

    const imageBytes = await generateImage(prompt);

    const path = `${input.trip_id}/background.png`;
    const { error: uploadError } = await supabaseAdmin.storage.from('treasure-maps').upload(path, imageBytes, {
      contentType: 'image/png',
      upsert: true
    });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('treasure-maps').getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('trips')
      .update({ treasure_map_image_url: publicUrl })
      .eq('id', input.trip_id);
      
    if (updateError) {
      throw new Error(`Failed to update trip: ${updateError.message}`);
    }

    await markJobCompleted(job.id, { treasure_map_image_url: publicUrl });

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}
