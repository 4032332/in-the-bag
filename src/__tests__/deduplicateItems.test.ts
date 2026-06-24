// src/__tests__/deduplicateItems.test.ts
import { buildDayViewSections } from '@/utils/deduplicateItems';
import { InTheBagItem } from '@/types/database';

function makeItem(
  overrides: Partial<InTheBagItem> & { id: string; title: string },
): InTheBagItem {
  return {
    trip_id: 'trip-1',
    trip_day_id: null,
    event_id: null,
    is_packed: false,
    is_ai_suggested: false,
    created_at: '2026-06-23T00:00:00Z',
    ...overrides,
  };
}

const eventOrder = [
  { id: 'evt-1', title: 'Beach' },
  { id: 'evt-2', title: 'Snorkelling' },
];

describe('buildDayViewSections', () => {
  it('places an item in the section of the first event that has it', () => {
    const eventItems = [
      makeItem({ id: 'i1', title: 'Sunscreen', event_id: 'evt-1' }),
      makeItem({ id: 'i2', title: 'sunscreen', event_id: 'evt-2' }), // duplicate
    ];
    const sections = buildDayViewSections(eventItems, [], eventOrder);
    const beach = sections.find((s) => s.eventId === 'evt-1')!;
    const snorkel = sections.find((s) => s.eventId === 'evt-2');
    expect(beach.items).toHaveLength(1);
    expect(beach.items[0].sourceEventIds).toContain('evt-2');
    // snorkel section empty — item was assigned to beach
    expect(snorkel).toBeUndefined();
  });

  it('deduplication is case-insensitive', () => {
    const eventItems = [
      makeItem({ id: 'i1', title: 'SUNSCREEN', event_id: 'evt-1' }),
      makeItem({ id: 'i2', title: 'Sunscreen', event_id: 'evt-2' }),
      makeItem({ id: 'i3', title: 'sunscreen', event_id: 'evt-2' }),
    ];
    const sections = buildDayViewSections(eventItems, [], eventOrder);
    const allItems = sections.flatMap((s) => s.items);
    expect(allItems).toHaveLength(1);
    expect(allItems[0].occurrences).toBe(3);
  });

  it('unique items from each event appear in their own section', () => {
    const eventItems = [
      makeItem({ id: 'i1', title: 'Hat', event_id: 'evt-1' }),
      makeItem({ id: 'i2', title: 'Mask', event_id: 'evt-2' }),
    ];
    const sections = buildDayViewSections(eventItems, [], eventOrder);
    expect(sections.find((s) => s.eventId === 'evt-1')!.items).toHaveLength(1);
    expect(sections.find((s) => s.eventId === 'evt-2')!.items).toHaveLength(1);
  });

  it('day-scoped items appear in the Day-level items section', () => {
    const dayItems = [
      makeItem({ id: 'd1', title: 'Passport', trip_day_id: 'day-1' }),
    ];
    const sections = buildDayViewSections([], dayItems, eventOrder);
    const daySection = sections.find((s) => s.eventId === null)!;
    expect(daySection.items).toHaveLength(1);
    expect(daySection.items[0].item.title).toBe('Passport');
  });

  it('day-level items are deduplicated among themselves', () => {
    const dayItems = [
      makeItem({ id: 'd1', title: 'Passport', trip_day_id: 'day-1' }),
      makeItem({ id: 'd2', title: 'passport', trip_day_id: 'day-1' }),
    ];
    const sections = buildDayViewSections([], dayItems, eventOrder);
    const daySection = sections.find((s) => s.eventId === null)!;
    expect(daySection.items).toHaveLength(1);
    expect(daySection.items[0].occurrences).toBe(2);
  });

  it('empty event sections are omitted', () => {
    const sections = buildDayViewSections([], [], eventOrder);
    const eventSections = sections.filter((s) => s.eventId !== null);
    expect(eventSections).toHaveLength(0);
  });

  it('Day-level items section is always present even when empty', () => {
    const sections = buildDayViewSections([], [], eventOrder);
    expect(sections.find((s) => s.eventId === null)).toBeDefined();
  });
});
