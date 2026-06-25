import * as Notifications from 'expo-notifications'
import { Router } from 'expo-router'
import { NotificationPayload, SAVE_NOW_ACTION } from './notifications.types'

// We need a simple event emitter for TRIGGER_OFFLINE_SAVE
import { DeviceEventEmitter } from 'react-native'

export function initNotificationHandler(router: Router) {
  // Background / quit tap events
  Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response, router)
  })

  // Foreground events - display only (already default behavior with handler configuration usually)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export function handleNotificationResponse(response: Notifications.NotificationResponse, router: Router) {
  const payload = response.notification.request.content.data as NotificationPayload

  if (payload.action === 'save_offline_docs' && response.actionIdentifier === SAVE_NOW_ACTION) {
    if (payload.trip_id) {
      router.push(`/trips/${payload.trip_id}`)
      // Dispatch event after navigation settles
      setTimeout(() => {
        DeviceEventEmitter.emit('TRIGGER_OFFLINE_SAVE', payload.trip_id)
      }, 100)
    }
  } else if (payload.action === 'treasure_map_ready' && payload.trip_id) {
    router.push(`/trips/${payload.trip_id}`)
  }
}
