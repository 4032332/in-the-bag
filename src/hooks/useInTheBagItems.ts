// src/hooks/useInTheBagItems.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { InTheBagItem } from '@/types/database';

/** Items scoped to the whole trip (trip_day_id null, event_id null). */
export function useTripItems(tripId: string) {
  const [items, setItems] = useState<InTheBagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      const { data } = await supabase
        .from('in_the_bag_items')
        .select('*')
        .eq('trip_id', tripId)
        .is('trip_day_id', null)
        .is('event_id', null)
        .order('created_at', { ascending: true });
      if (mounted) {
        setItems(data ?? []);
        setLoading(false);
      }
    }

    fetch();

    const channel = supabase
      .channel(`itb-trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_the_bag_items',
          filter: `trip_id=eq.${tripId}`,
        },
        () => fetch(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { items, loading };
}

/** Items scoped to a specific day: event-scoped items for that day's events + day-scoped items. */
export function useDayItems(tripId: string, tripDayId: string, eventIds: string[]) {
  const [eventItems, setEventItems] = useState<InTheBagItem[]>([]);
  const [dayItems, setDayItems] = useState<InTheBagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      const [evtRes, dayRes] = await Promise.all([
        eventIds.length > 0
          ? supabase
              .from('in_the_bag_items')
              .select('*')
              .in('event_id', eventIds)
              .is('trip_day_id', null)
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase
          .from('in_the_bag_items')
          .select('*')
          .eq('trip_day_id', tripDayId)
          .is('event_id', null)
          .order('created_at', { ascending: true }),
      ]);
      if (mounted) {
        setEventItems(evtRes.data ?? []);
        setDayItems(dayRes.data ?? []);
        setLoading(false);
      }
    }

    fetch();

    const channel = supabase
      .channel(`itb-day-${tripDayId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_the_bag_items',
          filter: `trip_id=eq.${tripId}`,
        },
        () => fetch(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [tripId, tripDayId, eventIds.join(',')]);

  return { eventItems, dayItems, loading };
}

/** Items scoped to a single event. */
export function useEventItems(eventId: string) {
  const [items, setItems] = useState<InTheBagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      const { data } = await supabase
        .from('in_the_bag_items')
        .select('*')
        .eq('event_id', eventId)
        .is('trip_day_id', null)
        .order('created_at', { ascending: true });
      if (mounted) {
        setItems(data ?? []);
        setLoading(false);
      }
    }

    fetch();

    const channel = supabase
      .channel(`itb-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_the_bag_items',
          filter: `event_id=eq.${eventId}`,
        },
        () => fetch(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { items, loading };
}
