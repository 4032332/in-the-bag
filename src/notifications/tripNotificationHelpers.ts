import { scheduleTripNotifications, cancelTripNotifications } from './scheduleNotifications'
import { storage } from '@/lib/mmkv'

export async function onTripCreated(trip: { id: string; name: string; departure_date: string }) {
  await scheduleTripNotifications({
    id: trip.id,
    name: trip.name,
    departureDateISO: trip.departure_date,
  })
}

export async function onTripEdited(trip: { id: string; name: string; departure_date: string }) {
  await cancelTripNotifications(trip.id)
  await scheduleTripNotifications({
    id: trip.id,
    name: trip.name,
    departureDateISO: trip.departure_date,
  })
}

export async function onTripDeleted(tripId: string) {
  await cancelTripNotifications(tripId)
  storage.delete(`offline_save_done_${tripId}`)
  storage.delete(`offline_docs_${tripId}`)
}
