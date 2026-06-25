export type BannerKey = 'insurance_30d' | 'visa_14d' | 'esim_7d' | 'offline_docs_7d' | 'wifi_day_of'

export type MilestoneBannerState = {
  id: string
  trip_id: string
  user_id: string
  banner_key: BannerKey
  dismissed_at: string | null
  resurface_at: string | null
  action_taken: 'confirm' | 'dismiss' | 'save_now' | null
}

export type ActiveBanner = {
  key: BannerKey
  state: MilestoneBannerState | null
}
