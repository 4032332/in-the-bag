import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BannerKey, MilestoneBannerState, ActiveBanner } from './milestones.types'
import { offlineDocumentDownload } from '../offline/offlineDocumentDownload'

export function useMilestoneBanners(tripId: string, userId: string, departureDateISO: string) {
  const [states, setStates] = useState<Record<string, MilestoneBannerState>>({})
  const [activeBanners, setActiveBanners] = useState<ActiveBanner[]>([])

  const loadStates = async () => {
    const { data } = await supabase
      .from('milestone_banner_states')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (data) {
      const stateMap: Record<string, MilestoneBannerState> = {}
      for (const row of (data as any[])) {
        stateMap[row.banner_key] = row as MilestoneBannerState
      }
      setStates(stateMap)
    }
  }

  useEffect(() => {
    if (tripId && userId) {
      loadStates()
    }
  }, [tripId, userId])

  useEffect(() => {
    if (!departureDateISO) return

    const now = Date.now()
    const departureDate = new Date(departureDateISO).getTime()
    const daysUntilDeparture = (departureDate - now) / (1000 * 60 * 60 * 24)

    const computedBanners: ActiveBanner[] = []

    const checkAndAdd = (key: BannerKey, maxDays: number, minDays: number = 0) => {
      // Check window: we use <= maxDays and > minDays (actually day of is 0, so >= minDays)
      // For wifi_day_of, daysUntilDeparture is between 0 and 1 (or slightly negative if within the same day)
      // We will simplify: daysUntilDeparture <= maxDays
      // Wait, if departure date is past, daysUntilDeparture is negative.
      if (daysUntilDeparture <= maxDays && daysUntilDeparture >= -1) {
        const state = states[key] || null

        let show = false
        if (!state) {
          show = true
        } else if (!state.dismissed_at) {
          if (key === 'visa_14d') {
            show = true
          } else {
            show = !state.resurface_at || new Date(state.resurface_at).getTime() <= now
          }
        }

        if (show) {
          computedBanners.push({ key, state })
        }
      }
    }

    checkAndAdd('insurance_30d', 30)
    checkAndAdd('visa_14d', 14)
    checkAndAdd('esim_7d', 7)
    checkAndAdd('offline_docs_7d', 7)
    // wifi_day_of shows only if today is the departure date (daysUntil <= 1 and >= -1)
    if (daysUntilDeparture <= 1 && daysUntilDeparture >= -1) {
      checkAndAdd('wifi_day_of', 1)
    }

    setActiveBanners(computedBanners)
  }, [states, departureDateISO])

  const mutate = async (key: BannerKey, updates: Partial<MilestoneBannerState>) => {
    const { data } = await supabase
      .from('milestone_banner_states')
      .upsert({
        trip_id: tripId,
        user_id: userId,
        banner_key: key,
        ...updates
      }, { onConflict: 'trip_id,user_id,banner_key' })
      .select()
      .single()

    if (data) {
      setStates(prev => ({ ...prev, [key]: data as any as MilestoneBannerState }))
    } else {
      // Optimistic update if needed or just reload
      loadStates()
    }
  }

  const confirmBanner = (key: BannerKey) => mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'confirm' })
  const dismissBanner = (key: BannerKey) => mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'dismiss' })
  const snoozeBanner = (key: BannerKey) => {
    if (key === 'visa_14d') throw new Error('visa_14d cannot be snoozed')
    const resurface_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    return mutate(key, { resurface_at })
  }
  const saveNowBanner = async (key: BannerKey) => {
    await mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'save_now' })
    await offlineDocumentDownload(tripId, userId)
  }

  return {
    activeBanners,
    confirmBanner,
    dismissBanner,
    snoozeBanner,
    saveNowBanner
  }
}
