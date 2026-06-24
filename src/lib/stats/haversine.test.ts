import { haversineKm } from './haversine';

describe('haversineKm', () => {
  it('London to Sydney returns approximately 16993 km', () => {
    // London: 51.5074, -0.1278 | Sydney: -33.8688, 151.2093
    const dist = haversineKm(51.5074, -0.1278, -33.8688, 151.2093);
    expect(dist).toBeGreaterThan(16983);
    expect(dist).toBeLessThan(17003);
  });

  it('same coordinates returns 0', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it('antipodal points return approximately 20015 km', () => {
    const dist = haversineKm(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(20005);
    expect(dist).toBeLessThan(20025);
  });
});
