import { supabase } from '../lib/supabase';
import { TripDay } from '../types/database';

export async function createTripDays(tripId: string, days: Omit<TripDay, 'id'>[]): Promise<TripDay[]> {
  const { data, error } = await supabase.from('trip_days').insert(days).select();
  if (error) throw error;
  return data ?? [];
}

export async function listTripDays(tripId: string): Promise<TripDay[]> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
