import { MMKV } from 'react-native-mmkv';
import { DEMO_TIER_KEY, DemoTier } from './constants';

export const storage = new MMKV();

export function getDemoTier(): DemoTier | null {
  const v = storage.getString(DEMO_TIER_KEY);
  if (v === 'free' || v === 'premium') return v;
  return null;
}

export function setDemoTier(tier: DemoTier): void {
  storage.set(DEMO_TIER_KEY, tier);
}
