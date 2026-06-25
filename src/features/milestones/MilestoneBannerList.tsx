import React from 'react'
import { View } from 'react-native'
import { useMilestoneBanners } from './useMilestoneBanners'
import { Insurance30dBanner } from './banners/Insurance30dBanner'
import { Visa14dBanner } from './banners/Visa14dBanner'
import { ESim7dBanner } from './banners/ESim7dBanner'
import { OfflineDocs7dBanner } from './banners/OfflineDocs7dBanner'
import { WifiDayOfBanner } from './banners/WifiDayOfBanner'

export function MilestoneBannerList({ tripId, userId, departureDateISO }: { tripId: string, userId: string, departureDateISO: string }) {
  const { activeBanners, confirmBanner, dismissBanner, snoozeBanner, saveNowBanner } = useMilestoneBanners(tripId, userId, departureDateISO)

  if (activeBanners.length === 0) return null

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {activeBanners.map(({ key }) => {
        switch (key) {
          case 'insurance_30d':
            return <Insurance30dBanner key={key} onConfirm={() => confirmBanner(key)} onSnooze={() => snoozeBanner(key)} onDismiss={() => dismissBanner(key)} />
          case 'visa_14d':
            return <Visa14dBanner key={key} onConfirm={() => confirmBanner(key)} onDismiss={() => dismissBanner(key)} />
          case 'esim_7d':
            return <ESim7dBanner key={key} onConfirm={() => confirmBanner(key)} onSnooze={() => snoozeBanner(key)} onDismiss={() => dismissBanner(key)} />
          case 'offline_docs_7d':
            return <OfflineDocs7dBanner key={key} onSaveNow={() => saveNowBanner(key)} onSnooze={() => snoozeBanner(key)} onDismiss={() => dismissBanner(key)} />
          case 'wifi_day_of':
            return <WifiDayOfBanner key={key} onDismiss={() => dismissBanner(key)} onSnooze={() => snoozeBanner(key)} />
          default:
            return null
        }
      })}
    </View>
  )
}
