import { supabase } from '../lib/supabase';
import { Event } from '../types/database';

export async function createEvent(input: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'ai_generated'>): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, ai_generated: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listEventsForDay(tripDayId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('trip_day_id', tripDayId)
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function countEventsForDay(tripDayId: string): Promise<number> {
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('trip_day_id', tripDayId);
  if (error) throw error;
  return count ?? 0;
}

export async function getEvent(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}
