import * as Notifications from 'expo-notifications'
import { storage } from '@/lib/mmkv'
import { OFFLINE_DOCS_CATEGORY } from './notifications.types'

export async function scheduleTripNotifications(trip: { id: string; name: string; departureDateISO: string }): Promise<string[]> {
  const now = Date.now()
  const departureDate = new Date(trip.departureDateISO)
  
  // Create a base date at 9:00 AM local time on the departure date
  const baseDate = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate(), 9, 0, 0)
  
  const triggers = [
    {
      daysOffset: -30,
      bannerKey: 'insurance_30d',
      title: 'Insurance',
      body: `Have you organised travel insurance for ${trip.name}?`,
    },
    {
      daysOffset: -14,
      bannerKey: 'visa_14d',
      title: 'Visa & Immigration',
      body: `Confirm your visa and immigration requirements for ${trip.name}.`,
    },
    {
      daysOffset: -7,
      bannerKey: 'esim_7d',
      title: 'Stay Connected',
      body: `Organise an e-SIM so you're online when you land for ${trip.name}.`,
    },
    {
      daysOffset: -7,
      bannerKey: 'offline_docs_7d',
      title: 'Offline Documents',
      body: `Save critical documents for ${trip.name} for offline access.`,
      categoryId: OFFLINE_DOCS_CATEGORY,
      payload: { action: 'save_offline_docs', trip_id: trip.id },
    },
    {
      daysOffset: 0,
      bannerKey: 'wifi_day_of',
      title: 'Airport WiFi',
      body: `Connect to airport WiFi as soon as you land.`,
    },
  ]

  const scheduledIds: string[] = []

  for (const trigger of triggers) {
    const triggerTime = new Date(baseDate.getTime() + trigger.daysOffset * 24 * 60 * 60 * 1000).getTime()
    
    if (triggerTime > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: trigger.title,
          body: trigger.body,
          data: trigger.payload || { action: 'trip_reminder', trip_id: trip.id },
          categoryIdentifier: trigger.categoryId,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
        },
      })
      scheduledIds.push(id)
    }
  }

  if (scheduledIds.length > 0) {
    storage.set(`trip_notif_ids_${trip.id}`, JSON.stringify(scheduledIds))
  }

  return scheduledIds
}

export async function cancelTripNotifications(tripId: string) {
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
