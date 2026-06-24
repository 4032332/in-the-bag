import { supabase } from '../lib/supabase';
import { Trip, TripDestination, TripParticipant } from '../types/database';

export async function createTrip(input: {
  name: string;
  is_cruise: boolean;
  cruise_details?: Record<string, unknown>;
  treasure_map_layout: Record<string, unknown>;
  owner_user_id: string;
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      ...input,
      display_style: 'tiles',
      cover_photo_url: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getUserTripIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.trip_id);
}

async function getTripMaxEndDates(tripIds: string[]): Promise<Map<string, string>> {
  if (tripIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('trip_destinations')
    .select('trip_id, end_date')
    .in('trip_id', tripIds);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const current = map.get(row.trip_id);
    if (!current || row.end_date > current) map.set(row.trip_id, row.end_date);
  }
  return map;
}

export async function listActiveTrips(userId: string): Promise<(Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] })[]> {
  const today = new Date().toISOString().split('T')[0];
  const tripIds = await getUserTripIds(userId);
  if (tripIds.length === 0) return [];
  const maxEndDates = await getTripMaxEndDates(tripIds);
  const activeTripIds = tripIds.filter((id) => {
    const maxEnd = maxEndDates.get(id);
    return maxEnd !== undefined && maxEnd >= today;
  });
  if (activeTripIds.length === 0) return [];
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_destinations(*), trip_participants(*)')
    .in('id', activeTripIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] })[];
}

export async function listPastTrips(userId: string): Promise<(Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] })[]> {
  const today = new Date().toISOString().split('T')[0];
  const tripIds = await getUserTripIds(userId);
  if (tripIds.length === 0) return [];
  const maxEndDates = await getTripMaxEndDates(tripIds);
  const pastTripIds = tripIds.filter((id) => {
    const maxEnd = maxEndDates.get(id);
    return maxEnd !== undefined && maxEnd < today;
  });
  if (pastTripIds.length === 0) return [];
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_destinations(*), trip_participants(*)')
    .in('id', pastTripIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] })[];
}

export async function getTrip(tripId: string): Promise<Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] }> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_destinations(*), trip_participants(*)')
    .eq('id', tripId)
    .single();
  if (error) throw error;
  return data as Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tripId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertTripDestinations(tripId: string, destinations: Omit<TripDestination, 'id' | 'trip_id'>[]): Promise<TripDestination[]> {
  const rows = destinations.map((d, i) => ({ ...d, trip_id: tripId, display_order: i }));
  const { data, error } = await supabase.from('trip_destinations').insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function insertTripParticipant(tripId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('trip_participants').insert({ trip_id: tripId, user_id: userId, is_premium_sponsor: false });
  if (error) throw error;
}
