import { isDayAtCap } from '../freeTierCap';

describe('isDayAtCap', () => {
  it('free user with 0 events: not at cap', () => expect(isDayAtCap(0, false)).toBe(false));
  it('free user with 2 events: not at cap', () => expect(isDayAtCap(2, false)).toBe(false));
  it('free user with 3 events: AT cap', () => expect(isDayAtCap(3, false)).toBe(true));
  it('free user with 4 events: AT cap', () => expect(isDayAtCap(4, false)).toBe(true));
  it('premium user with 3 events: NOT at cap', () => expect(isDayAtCap(3, true)).toBe(false));
  it('premium user with 10 events: NOT at cap', () => expect(isDayAtCap(10, true)).toBe(false));
  it('demo mode free user with 3 events: NOT capped', () => expect(isDayAtCap(3, false, true)).toBe(false));
});
