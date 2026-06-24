import { getTabVisibility } from '../eventTabVisibility';

describe('getTabVisibility', () => {
  it('transport_air: Summary, Tickets, Documents — no Transport', () => {
    expect(getTabVisibility('transport_air')).toEqual({ summary: true, tickets: true, transport: false, documents: true });
  });
  it('transport_road: Summary, Documents only', () => {
    expect(getTabVisibility('transport_road')).toEqual({ summary: true, tickets: false, transport: false, documents: true });
  });
  it('transport_rail: Summary, Tickets, Documents', () => {
    expect(getTabVisibility('transport_rail')).toEqual({ summary: true, tickets: true, transport: false, documents: true });
  });
  it('transport_water: Summary, Tickets, Documents', () => {
    expect(getTabVisibility('transport_water')).toEqual({ summary: true, tickets: true, transport: false, documents: true });
  });
  it('accommodation: Summary, Documents — no Tickets, no Transport', () => {
    expect(getTabVisibility('accommodation')).toEqual({ summary: true, tickets: false, transport: false, documents: true });
  });
  it('activity: all four tabs', () => {
    expect(getTabVisibility('activity')).toEqual({ summary: true, tickets: true, transport: true, documents: true });
  });
  it('meal: Summary, Documents only', () => {
    expect(getTabVisibility('meal')).toEqual({ summary: true, tickets: false, transport: false, documents: true });
  });
  it('rest: Summary only', () => {
    expect(getTabVisibility('rest')).toEqual({ summary: true, tickets: false, transport: false, documents: false });
  });
  it('health: Summary, Documents', () => {
    expect(getTabVisibility('health')).toEqual({ summary: true, tickets: false, transport: false, documents: true });
  });
  it('free_time: Summary only', () => {
    expect(getTabVisibility('free_time')).toEqual({ summary: true, tickets: false, transport: false, documents: false });
  });
  it('shore_excursion: Summary, Tickets, Documents', () => {
    expect(getTabVisibility('shore_excursion')).toEqual({ summary: true, tickets: true, transport: false, documents: true });
  });
});
