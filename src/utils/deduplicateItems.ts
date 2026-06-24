// src/utils/deduplicateItems.ts
import { InTheBagItem } from '@/types/database';

export interface DedupedItem {
  /** Canonical row (the first occurrence by created_at). */
  item: InTheBagItem;
  /** All item IDs (including duplicates) collapsed into this row — used to batch-update is_packed. */
  allIds: string[];
  /** All event_ids that contributed this title (empty for day-scoped items). */
  sourceEventIds: string[];
  /** Count of duplicate entries collapsed into this row (1 = no duplicates). */
  occurrences: number;
}

export interface DayViewSection {
  /** null means the "Day-level items" section. */
  eventId: string | null;
  eventTitle: string | null;
  items: DedupedItem[];
}

/**
 * Builds the grouped, deduplicated section list for the day-level view.
 *
 * @param eventItems  All event-scoped items for the day (event_id set, trip_day_id null).
 * @param dayItems    All day-scoped items (trip_day_id set, event_id null).
 * @param eventOrder  Ordered list of { id, title } for the day's events (determines section order).
 */
export function buildDayViewSections(
  eventItems: InTheBagItem[],
  dayItems: InTheBagItem[],
  eventOrder: { id: string; title: string }[],
): DayViewSection[] {
  // --- 1. Deduplicate event items across ALL events on the day ---
  // Key: normalised title. Value: first item seen + all contributing event IDs.
  const globalDedup = new Map<
    string,
    { item: InTheBagItem; allIds: string[]; sourceEventIds: string[]; occurrences: number }
  >();

  for (const item of eventItems) {
    const key = item.title.trim().toLowerCase();
    const existing = globalDedup.get(key);
    if (existing) {
      existing.allIds.push(item.id);
      if (item.event_id && !existing.sourceEventIds.includes(item.event_id)) {
        existing.sourceEventIds.push(item.event_id);
      }
      existing.occurrences += 1;
    } else {
      globalDedup.set(key, {
        item,
        allIds: [item.id],
        sourceEventIds: item.event_id ? [item.event_id] : [],
        occurrences: 1,
      });
    }
  }

  // --- 2. Build one section per event, placing deduplicated items ---
  // Each deduplicated item appears only in the section of its *first* contributing event.
  const assignedKeys = new Set<string>();
  const eventSections: DayViewSection[] = eventOrder.map((evt) => {
    const items: DedupedItem[] = [];
    for (const item of eventItems.filter((i) => i.event_id === evt.id)) {
      const key = item.title.trim().toLowerCase();
      if (!assignedKeys.has(key)) {
        assignedKeys.add(key);
        const deduped = globalDedup.get(key)!;
        items.push(deduped);
      }
    }
    return { eventId: evt.id, eventTitle: evt.title, items };
  });

  // --- 3. Day-level items section (deduplicated among themselves) ---
  const dayDedup = new Map<string, DedupedItem>();
  for (const item of dayItems) {
    const key = item.title.trim().toLowerCase();
    if (!dayDedup.has(key)) {
      dayDedup.set(key, { item, allIds: [item.id], sourceEventIds: [], occurrences: 1 });
    } else {
      dayDedup.get(key)!.allIds.push(item.id);
      dayDedup.get(key)!.occurrences += 1;
    }
  }

  const daySection: DayViewSection = {
    eventId: null,
    eventTitle: 'Day-level items',
    items: Array.from(dayDedup.values()),
  };

  // Filter out empty event sections, always include day section
  return [...eventSections.filter((s) => s.items.length > 0), daySection];
}
