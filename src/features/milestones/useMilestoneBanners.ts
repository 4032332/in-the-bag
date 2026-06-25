import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BannerKey, MilestoneBannerState, ActiveBanner } from './milestones.types'
import { offlineDocumentDownload } from '../offline/offlineDocumentDownload'

export function useMilestoneBanners(tripId: string, userId: string, departureDateISO: string) {
  const [states, setStates] = useState<Record<string, MilestoneBannerState>>({})
  const [activeBanners, setActiveBanners] = useState<ActiveBanner[]>([])
  const [mutateError, setMutateError] = useState<string | null>(null)

  const loadStates = useCallback(async () => {
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
  }, [tripId, userId])

  useEffect(() => {
    if (tripId && userId) {
      loadStates()
    }
  }, [tripId, userId, loadStates])

  useEffect(() => {
    if (!departureDateISO) return

    const now = Date.now()
    const departureDate = new Date(departureDateISO).getTime()
    const daysUntilDeparture = (departureDate - now) / (1000 * 60 * 60 * 24)

    const computedBanners: ActiveBanner[] = []

    const checkAndAdd = (key: BannerKey, maxDays: number) => {
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
    if (daysUntilDeparture <= 1 && daysUntilDeparture >= -1) {
      checkAndAdd('wifi_day_of', 1)
    }

    setActiveBanners(computedBanners)
  }, [states, departureDateISO])

  // Returns true on success, false on failure. Callers should check the return
  // value and surface mutateError to the user if false.
  const mutate = async (key: BannerKey, updates: Partial<MilestoneBannerState>): Promise<boolean> => {
    setMutateError(null)
    const { data, error } = await supabase
      .from('milestone_banner_states')
      .upsert({
        trip_id: tripId,
        user_id: userId,
        banner_key: key,
        ...updates
      }, { onConflict: 'trip_id,user_id,banner_key' })
      .select()
      .single()

    if (error) {
      setMutateError(error.message)
      return false
    }

    if (data) {
      setStates(prev => ({ ...prev, [key]: data as any as MilestoneBannerState }))
    }
    return true
  }

  const confirmBanner = (key: BannerKey) => mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'confirm' })
  const dismissBanner = (key: BannerKey) => mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'dismiss' })
  const snoozeBanner = (key: BannerKey) => {
    if (key === 'visa_14d') throw new Error('visa_14d cannot be snoozed')
    const resurface_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    return mutate(key, { resurface_at })
  }
  const saveNowBanner = async (key: BannerKey) => {
    const ok = await mutate(key, { dismissed_at: new Date().toISOString(), action_taken: 'save_now' })
    if (ok) await offlineDocumentDownload(tripId, userId)
  }

  return {
    activeBanners,
    mutateError,
    confirmBanner,
    dismissBanner,
    snoozeBanner,
    saveNowBanner
  }
}
