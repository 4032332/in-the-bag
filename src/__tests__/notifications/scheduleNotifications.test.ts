import * as Notifications from 'expo-notifications'
import { storage } from '@/lib/mmkv'
import { scheduleTripNotifications, cancelTripNotifications } from '../../notifications/scheduleNotifications'
import { NotificationPayload, SAVE_NOW_ACTION, LATER_ACTION, OFFLINE_DOCS_CATEGORY } from '../../notifications/notifications.types'

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('fake-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}))

jest.mock('@/lib/mmkv', () => ({
  storage: {
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  },
}))

describe('scheduleTripNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('schedules all 5 triggers if trip is exactly 30 days away', async () => {
    // Set 'now' to 8:59 AM local time on June 1st
    const nowLocal = new Date(2026, 5, 1, 8, 59, 0)
    jest.setSystemTime(nowLocal)

    // Departure is exactly 30 days later
    const departureDate = new Date(2026, 5, 31, 12, 0, 0) // June 31 doesn't exist, use July 1
    // Wait, June has 30 days. So June 1 + 30 days = July 1.
    const actualDeparture = new Date(2026, 6, 1, 12, 0, 0)
    const departureDateISO = actualDeparture.toISOString()

    const ids = await scheduleTripNotifications({ id: 'trip-1', name: 'Paris', departureDateISO })
    expect(ids.length).toBe(5)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(5)
  })

  it('skips 30d trigger if trip is 20 days away', async () => {
    jest.setSystemTime(new Date('2026-06-11T09:00:00Z'))
    const departureDateISO = '2026-07-01T00:00:00Z'

    const ids = await scheduleTripNotifications({ id: 'trip-1', name: 'Paris', departureDateISO })
    expect(ids.length).toBe(4) // 14d, 7d, 7d, 0d
  })

  it('schedules only 0d trigger if trip is 6 days away', async () => {
    jest.setSystemTime(new Date('2026-06-25T09:00:00Z'))
    const departureDateISO = '2026-07-01T00:00:00Z'

    const ids = await scheduleTripNotifications({ id: 'trip-1', name: 'Paris', departureDateISO })
    expect(ids.length).toBe(1)
  })

  it('schedules 0 triggers if trip is on departure day at noon', async () => {
    jest.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    const departureDateISO = '2026-07-01T00:00:00Z'

    const ids = await scheduleTripNotifications({ id: 'trip-1', name: 'Paris', departureDateISO })
    expect(ids.length).toBe(0)
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('formats offline_docs_7d trigger with correct payload and category', async () => {
    jest.setSystemTime(new Date('2026-06-01T08:00:00Z'))
    const departureDateISO = '2026-07-01T00:00:00Z'

    await scheduleTripNotifications({ id: 'trip-1', name: 'Paris', departureDateISO })

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          categoryIdentifier: OFFLINE_DOCS_CATEGORY,
          data: { action: 'save_offline_docs', trip_id: 'trip-1' },
        }),
      })
    )
  })
})
