import { supabase } from '../lib/supabase';
import { MilestoneBannerState } from '../types/database';

export async function getVisibleBanners(tripId: string, userId: string): Promise<MilestoneBannerState[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('milestone_banner_states')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (error) throw error;
  const states: MilestoneBannerState[] = data ?? [];

  return states.filter((b) => {
    if (b.dismissed_at !== null) return false;
    if (b.banner_key === 'visa_14d') return true;
    if (b.resurface_at !== null && b.resurface_at > now) return false;
    return true;
  });
}

export async function dismissBanner(
  tripId: string,
  userId: string,
  bannerKey: MilestoneBannerState['banner_key'],
  actionTaken: 'confirm' | 'dismiss' | 'save_now'
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('milestone_banner_states').upsert(
    { trip_id: tripId, user_id: userId, banner_key: bannerKey, dismissed_at: now, action_taken: actionTaken },
    { onConflict: 'trip_id,user_id,banner_key' }
  );
}

export async function snoozeBanner(
  tripId: string,
  userId: string,
  bannerKey: MilestoneBannerState['banner_key']
): Promise<void> {
  const resurface = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('milestone_banner_states').upsert(
    { trip_id: tripId, user_id: userId, banner_key: bannerKey, resurface_at: resurface },
    { onConflict: 'trip_id,user_id,banner_key' }
  );
}
