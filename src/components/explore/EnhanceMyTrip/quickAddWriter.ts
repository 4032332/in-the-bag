import { supabase } from '../../../lib/supabase';
import { ExtractionItem } from '../../../types/explore';

export interface QuickAddResult {
  tasksAdded: number;
  eventsAdded: number;
}

export async function writeTaskItems(
  tripId: string,
  items: ExtractionItem[]
): Promise<void> {
  const taskItems = items.filter((i) => i.selected && i.classification === 'Task');
  if (taskItems.length === 0) return;

  const rows = taskItems.map((item) => ({
    trip_id: tripId,
    title: item.recommendation,
    category: 'general',
    is_completed: false,
    is_suggested: false,
    is_dismissed: false,
    source: 'ai',
  }));

  const { error } = await supabase.from('trip_tasks').insert(rows);
  if (error) throw error;
}

export async function writeEventItems(
  tripId: string,
  tripDayId: string,
  items: ExtractionItem[]
): Promise<void> {
  const eventItems = items.filter((i) => i.selected && i.classification === 'Event');
  if (eventItems.length === 0) return;

  const rows = eventItems.map((item, index) => ({
    trip_id: tripId,
    trip_day_id: tripDayId,
    title: item.recommendation,
    category: 'ACTIVITY',
    ai_generated: true,
    display_order: index,
  }));

  const { error } = await supabase.from('events').insert(rows);
  if (error) throw error;
}
