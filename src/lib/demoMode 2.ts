import { storage } from './mmkv'
import Constants from 'expo-constants'

export type DemoTier = 'free' | 'premium'

export function isDemoMode(): boolean {
  if (__DEV__ || Constants.expoConfig?.extra?.isTestFlight) {
    return storage.getString('demo_tier') !== undefined
  }
  return false
}

export function getDemoTier(): DemoTier | null {
  const tier = storage.getString('demo_tier')
  if (tier === 'free' || tier === 'premium') {
    return tier as DemoTier
  }
  return null
}

export function setDemoTier(tier: DemoTier | null): void {
  if (tier) {
    storage.set('demo_tier', tier)
  } else {
    storage.delete('demo_tier')
  }
}
