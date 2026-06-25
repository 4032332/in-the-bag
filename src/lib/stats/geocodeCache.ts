import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'in-the-bag-stats' });

function key(city: string, country: string): string {
  return `geocode:${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

export function getCachedCoords(city: string, country: string): { lat: number; lon: number } | null {
  const raw = storage.getString(key(city, country));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedCoords(city: string, country: string, lat: number, lon: number): void {
  storage.set(key(city, country), JSON.stringify({ lat, lon }));
}
