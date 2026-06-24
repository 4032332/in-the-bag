import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Subscribes to changes on trips.treasure_map_image_url for the given trip.
 * Returns the current image URL (null until the Imagen 3 async job completes).
 */
export function useTreasureMapRealtime(tripId: string, initialUrl: string | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);

  useEffect(() => {
    const channel = supabase
      .channel(`treasure_map_image_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          const url = payload.new?.treasure_map_image_url as string | null;
          if (url && url !== imageUrl) {
            setImageUrl(url);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return imageUrl;
}
