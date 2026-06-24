import { getTabVisibility } from '../eventTabVisibility';

describe('getTabVisibility', () => {
  it('transport_air: Details, InTheBag, Tickets, Documents', () => {
    expect(getTabVisibility('transport_air')).toEqual({ details: true, inTheBag: true, tickets: true, documents: true });
  });
  it('transport_road: Details, InTheBag, Documents only', () => {
    expect(getTabVisibility('transport_road')).toEqual({ details: true, inTheBag: true, tickets: false, documents: true });
  });
  it('transport_rail: Details, InTheBag, Tickets, Documents', () => {
    expect(getTabVisibility('transport_rail')).toEqual({ details: true, inTheBag: true, tickets: true, documents: true });
  });
  it('transport_water: Details, InTheBag, Tickets, Documents', () => {
    expect(getTabVisibility('transport_water')).toEqual({ details: true, inTheBag: true, tickets: true, documents: true });
  });
  it('accommodation: Details, InTheBag, Documents — no Tickets', () => {
    expect(getTabVisibility('accommodation')).toEqual({ details: true, inTheBag: true, tickets: false, documents: true });
  });
  it('activity: Details, InTheBag, Tickets, Documents', () => {
    expect(getTabVisibility('activity')).toEqual({ details: true, inTheBag: true, tickets: true, documents: true });
  });
  it('meal: Details, InTheBag, Documents only', () => {
    expect(getTabVisibility('meal')).toEqual({ details: true, inTheBag: true, tickets: false, documents: true });
  });
  it('rest: Details, InTheBag only', () => {
    expect(getTabVisibility('rest')).toEqual({ details: true, inTheBag: true, tickets: false, documents: false });
  });
  it('health: Details, InTheBag, Documents', () => {
    expect(getTabVisibility('health')).toEqual({ details: true, inTheBag: true, tickets: false, documents: true });
  });
  it('free_time: Details, InTheBag only', () => {
    expect(getTabVisibility('free_time')).toEqual({ details: true, inTheBag: true, tickets: false, documents: false });
  });
  it('shore_excursion: Details, InTheBag, Tickets, Documents', () => {
    expect(getTabVisibility('shore_excursion')).toEqual({ details: true, inTheBag: true, tickets: true, documents: true });
  });
});
