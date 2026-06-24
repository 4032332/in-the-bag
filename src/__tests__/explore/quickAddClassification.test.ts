import { ExtractionItem } from '../../types/explore';

function shouldShowDayPicker(items: ExtractionItem[]): boolean {
  const selected = items.filter((i) => i.selected);
  return selected.some((i) => i.classification === 'Event');
}

function toggleClassification(items: ExtractionItem[], id: string): ExtractionItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, classification: item.classification === 'Event' ? 'Task' : 'Event' }
      : item
  );
}

function makeItem(id: string, classification: 'Event' | 'Task', selected = true): ExtractionItem {
  return {
    id,
    recommendation: `Item ${id}`,
    sourceTimestamp: null,
    classification,
    originalClassification: classification,
    selected,
  };
}

describe('Quick Add classification toggle and day-picker trigger', () => {
  test('day-picker shown when at least one selected item is Event', () => {
    const items = [makeItem('1', 'Event'), makeItem('2', 'Task')];
    expect(shouldShowDayPicker(items)).toBe(true);
  });

  test('day-picker not shown when all selected items are Task', () => {
    const items = [makeItem('1', 'Task'), makeItem('2', 'Task')];
    expect(shouldShowDayPicker(items)).toBe(false);
  });

  test('toggling Event to Task removes need for day-picker when no other Events selected', () => {
    let items = [makeItem('1', 'Event'), makeItem('2', 'Task')];
    expect(shouldShowDayPicker(items)).toBe(true);
    items = toggleClassification(items, '1');
    expect(items[0].classification).toBe('Task');
    expect(shouldShowDayPicker(items)).toBe(false);
  });

  test('toggling Task to Event adds need for day-picker', () => {
    let items = [makeItem('1', 'Task'), makeItem('2', 'Task')];
    expect(shouldShowDayPicker(items)).toBe(false);
    items = toggleClassification(items, '1');
    expect(items[0].classification).toBe('Event');
    expect(shouldShowDayPicker(items)).toBe(true);
  });

  test('unselected items do not affect day-picker trigger', () => {
    const items = [makeItem('1', 'Event', false), makeItem('2', 'Task', true)];
    expect(shouldShowDayPicker(items)).toBe(false);
  });

  test('selecting all Task items — no day-picker; then toggling one to Event — day-picker appears at NEXT quick-add tap', () => {
    let items = [makeItem('1', 'Task'), makeItem('2', 'Task')];
    expect(shouldShowDayPicker(items)).toBe(false);
    items = toggleClassification(items, '1');
    expect(shouldShowDayPicker(items)).toBe(true);
  });

  test('empty selection does not trigger day-picker', () => {
    const items = [makeItem('1', 'Event', false), makeItem('2', 'Task', false)];
    expect(shouldShowDayPicker(items)).toBe(false);
  });
});
