// src/services/inTheBagService.ts
import { supabase } from '@/lib/supabase';
import { InTheBagScope } from '@/types/database';

export class ScopingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopingError';
  }
}

function buildScopedRow(
  title: string,
  scope: InTheBagScope,
  isAiSuggested = false,
) {
  if (scope.kind === 'event') {
    // event-scoped: trip_day_id MUST be null
    return {
      trip_id: scope.trip_id,
      trip_day_id: null,
      event_id: scope.event_id,
      title,
      is_packed: false,
      is_ai_suggested: isAiSuggested,
    };
  }
  if (scope.kind === 'day') {
    // day-scoped: event_id MUST be null
    return {
      trip_id: scope.trip_id,
      trip_day_id: scope.trip_day_id,
      event_id: null,
      title,
      is_packed: false,
      is_ai_suggested: isAiSuggested,
    };
  }
  // trip-scoped: both null
  return {
    trip_id: scope.trip_id,
    trip_day_id: null,
    event_id: null,
    title,
    is_packed: false,
    is_ai_suggested: isAiSuggested,
  };
}

export async function addItem(title: string, scope: InTheBagScope) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Item title cannot be empty');
  const row = buildScopedRow(trimmed, scope);
  const { data, error } = await supabase
    .from('in_the_bag_items')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePacked(itemIds: string[], isPacked: boolean) {
  // Accepts all duplicate item IDs for a deduplicated item so that packed state
  // is updated for every row sharing the same title within the same day scope.
  // Per spec: "Packed state is per-item, not per-event — checking off 'sunscreen'
  // marks it packed for the whole day."
  const { error } = await supabase
    .from('in_the_bag_items')
    .update({ is_packed: isPacked })
    .in('id', itemIds);
  if (error) throw error;
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase
    .from('in_the_bag_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

/** Validate a row before writing (used by Edge Function output writer and tests). */
export function validateScopingRule(row: {
  trip_day_id: string | null;
  event_id: string | null;
}): void {
  if (row.event_id !== null && row.trip_day_id !== null) {
    throw new ScopingError(
      'event-scoped items must have trip_day_id = null; ' +
        `got trip_day_id="${row.trip_day_id}"`,
    );
  }
}
