import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TripSummary {
  id: string;
  name: string;
  destinations: Array<{ city: string; country: string; start_date: string; end_date: string }>;
}

export function useTripList() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('trips')
      .select('id, name, trip_destinations(city, country, start_date, end_date)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setTrips(
            data.map((t) => ({
              id: t.id,
              name: t.name,
              destinations: (t as any).trip_destinations ?? [],
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  return { trips, loading };
}
