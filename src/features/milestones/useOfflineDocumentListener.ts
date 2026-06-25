import { useEffect, useState } from 'react'
import { DeviceEventEmitter, Alert } from 'react-native'
import { offlineDocumentDownload } from '../offline/offlineDocumentDownload'

export function useOfflineDocumentListener(tripId: string, userId: string) {
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TRIGGER_OFFLINE_SAVE', async (triggeredTripId: string) => {
      if (triggeredTripId === tripId) {
        setIsDownloading(true)
        const result = await offlineDocumentDownload(tripId, userId)
        setIsDownloading(false)
        if (result.success) {
          Alert.alert('Success', 'Documents saved for offline access')
        } else {
          Alert.alert('Error', 'Failed to save some documents: ' + result.errors.join(', '))
        }
      }
    })

    return () => {
      sub.remove()
    }
  }, [tripId, userId])

  return { isDownloading }
}
