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

export function readCachedStatus(): CachedSubscription | null {
  const cachedAt = storage.getString('sub_cached_at')
  if (!cachedAt) return null

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
