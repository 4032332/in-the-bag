import * as Notifications from 'expo-notifications'
import { storage } from '@/lib/mmkv'
import { OFFLINE_DOCS_CATEGORY, SAVE_NOW_ACTION, LATER_ACTION } from './notifications.types'

export async function requestPermissions(): Promise<boolean> {
  const cached = storage.getBoolean('notifications_permission')
  if (cached !== undefined) return cached

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  const granted = finalStatus === 'granted'
  storage.set('notifications_permission', granted)
  return granted
}

export async function registerActionCategories() {
  await Notifications.setNotificationCategoryAsync(OFFLINE_DOCS_CATEGORY, [
    {
      identifier: SAVE_NOW_ACTION,
      buttonTitle: 'Save Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: LATER_ACTION,
      buttonTitle: 'Later',
      options: { opensAppToForeground: false },
    },
  ])
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data
    storage.set('expo_push_token', token)
    return token
  } catch (error) {
    console.error('Failed to get push token:', error)
    return null
  }
}

export async function cancelNotificationsForTrip(tripId: string) {
  const key = `trip_notif_ids_${tripId}`
  const cached = storage.getString(key)
  if (cached) {
    try {
      const ids: string[] = JSON.parse(cached)
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id)
      }
      storage.delete(key)
    } catch (err) {
      console.error('Failed to cancel notifications:', err)
    }
  }
}

export async function sendFamilyInvitationNotification(inviterName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Family Invitation',
      body: `${inviterName} has invited you to join their family on In the Bag.`,
      data: { action: 'family_invitation' },
    },
    trigger: null,
  })
}

export async function sendFamilyAcceptedNotification(inviteeName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Invitation Accepted',
      body: `${inviteeName} has joined your family on In the Bag.`,
      data: { action: 'family_accepted' },
    },
    trigger: null,
  })
}

export async function sendTreasureMapReadyNotification(tripName: string, tripId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Treasure Map Ready',
      body: `Your Treasure Map for ${tripName} is ready.`,
      data: { action: 'treasure_map_ready', trip_id: tripId },
    },
    trigger: null,
  })
}
