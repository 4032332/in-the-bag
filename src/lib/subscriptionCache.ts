import { storage } from './mmkv'

export interface CachedSubscription {
  isPremium: boolean
  sponsorTripIds: string[]
  cachedAt: string
}

export function cacheSubscriptionStatus(isPremium: boolean, sponsorTripIds: string[]) {
  const data: CachedSubscription = {
    isPremium,
    sponsorTripIds,
    cachedAt: new Date().toISOString()
  }
  storage.set('sub_is_premium', isPremium)
  storage.set('sub_cached_at', data.cachedAt)
  storage.set('sub_sponsor_trip_ids', JSON.stringify(sponsorTripIds))
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function readCachedStatus(): CachedSubscription | null {
  const cachedAt = storage.getString('sub_cached_at')
  if (!cachedAt) return null

  // Treat stale cache as a miss so the caller refetches from Supabase.
  // Ensures cancelled users lose premium access within 24 hours even offline.
  if (Date.now() - new Date(cachedAt).getTime() > CACHE_TTL_MS) return null

  const isPremium = storage.getBoolean('sub_is_premium') ?? false
  const sponsorTripIdsStr = storage.getString('sub_sponsor_trip_ids')
  let sponsorTripIds: string[] = []
  try {
    if (sponsorTripIdsStr) sponsorTripIds = JSON.parse(sponsorTripIdsStr)
  } catch (e) {}

  return { isPremium, sponsorTripIds, cachedAt }
}

export function clearSubscriptionCache() {
  storage.delete('sub_is_premium')
  storage.delete('sub_cached_at')
  storage.delete('sub_sponsor_trip_ids')
}
