import { getEventFields } from '../eventFieldConfig';

const ALL_CATEGORIES = [
  'transport_air', 'transport_road', 'transport_rail', 'transport_water',
  'accommodation', 'activity', 'meal', 'rest', 'health', 'free_time', 'shore_excursion',
] as const;

describe('getEventFields', () => {
  it.each(ALL_CATEGORIES)('%s: returns at least one field with a title', (cat) => {
    const fields = getEventFields(cat);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((f) => f.name === 'title')).toBe(true);
  });

  it('transport_air includes airline and flight_number', () => {
    const fields = getEventFields('transport_air');
    const names = fields.map((f) => f.name);
    expect(names).toContain('airline');
    expect(names).toContain('flight_number');
  });

  it('shore_excursion includes operator and meeting_point', () => {
    const fields = getEventFields('shore_excursion');
    const names = fields.map((f) => f.name);
    expect(names).toContain('operator');
    expect(names).toContain('meeting_point');
  });

  it('rest has only title and notes — no address, no times', () => {
    const fields = getEventFields('rest');
    const names = fields.map((f) => f.name);
    expect(names).not.toContain('address');
    expect(names).not.toContain('start_time');
  });
});
