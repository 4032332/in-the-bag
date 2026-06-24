// src/__tests__/inTheBagService.test.ts
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));
import { validateScopingRule, ScopingError } from '@/services/inTheBagService';

describe('validateScopingRule', () => {
  it('throws ScopingError when event_id and trip_day_id are both non-null', () => {
    expect(() =>
      validateScopingRule({ event_id: 'evt-1', trip_day_id: 'day-1' }),
    ).toThrow(ScopingError);
  });

  it('does not throw when event_id is set and trip_day_id is null', () => {
    expect(() =>
      validateScopingRule({ event_id: 'evt-1', trip_day_id: null }),
    ).not.toThrow();
  });

  it('does not throw when trip_day_id is set and event_id is null', () => {
    expect(() =>
      validateScopingRule({ event_id: null, trip_day_id: 'day-1' }),
    ).not.toThrow();
  });

  it('does not throw when both are null (trip-scoped)', () => {
    expect(() =>
      validateScopingRule({ event_id: null, trip_day_id: null }),
    ).not.toThrow();
  });
});
