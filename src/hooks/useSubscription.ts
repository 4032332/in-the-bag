import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { isDemoMode, getDemoTier } from '@/lib/demoMode'
import { readCachedStatus, cacheSubscriptionStatus } from '@/lib/subscriptionCache'

export function useSubscription() {
  const { user } = useAuth()
  
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    if (isDemoMode()) return getDemoTier() === 'premium'
    const cached = readCachedStatus()
    return cached ? cached.isPremium : false
  })
  
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refetch = useCallback(async () => {
    if (isDemoMode()) {
      setIsPremium(getDemoTier() === 'premium')
      setIsLoading(false)
      return
    }

    if (!user) {
      setIsPremium(false)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()

      // 1. Check own active subscription
      const { data: ownSub, error: subError } = await supabase
        .from('subscriptions')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .single()

      if (ownSub && !subError) {
        setIsPremium(true)
        cacheSubscriptionStatus(true, [])
        setIsLoading(false)
        return
      }

      // 2. Check sponsor logic
      // Find trips where user is NOT sponsor, trip end_date >= today, AND trip HAS a sponsor
      const today = new Date().toISOString().split('T')[0]

      const { data: sponsoredTrips, error: sponsorError } = await supabase
        .from('trip_participants')
        .select('trip_id, trips!inner(end_date)')
        .eq('user_id', user.id)
        .eq('is_premium_sponsor', false)
        .gte('trips.end_date', today)
        // Subquery via string works if supported, but typically we do a separate query or use an RPC if complex.
        // Doing the subquery correctly:
        // Actually Supabase JS doesn't easily support `.in('trip_id', supabase.from...)` directly in one call.
        // The safest approach is two queries if RPC is not used.
        // Wait, the plan suggested we can just look for trips where we are not sponsor, 
        // then verify if someone IS a sponsor.
      
      let isSponsored = false
      let sponsorIds: string[] = []

      if (sponsoredTrips && sponsoredTrips.length > 0) {
        const tripIds = (sponsoredTrips as any[]).map((tp: any) => tp.trip_id)

        // Find if any of these trips has a premium sponsor
        const { data: sponsors } = await supabase
          .from('trip_participants')
          .select('trip_id')
          .in('trip_id', tripIds)
          .eq('is_premium_sponsor', true)

        if (sponsors && sponsors.length > 0) {
          isSponsored = true
          sponsorIds = (sponsors as any[]).map((s: any) => s.trip_id)
        }
      }

      setIsPremium(isSponsored)
      cacheSubscriptionStatus(isSponsored, sponsorIds)

    } catch (err) {
      console.error('useSubscription error:', err)
      // fallback to cache or false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { isPremium, isLoading, refetch }
}
