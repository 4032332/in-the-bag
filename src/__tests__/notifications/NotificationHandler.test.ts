import { handleNotificationResponse } from '../../notifications/NotificationHandler'
import { SAVE_NOW_ACTION, LATER_ACTION } from '../../notifications/notifications.types'
import { DeviceEventEmitter } from 'react-native'
import * as Notifications from 'expo-notifications'
import { Router } from 'expo-router'

describe('NotificationHandler', () => {
  let router: jest.Mocked<Router>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    router = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(),
      setParams: jest.fn(),
      navigate: jest.fn(),
    } as any
    jest.spyOn(DeviceEventEmitter, 'emit')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function makeResponse(data: any, actionId: string): Notifications.NotificationResponse {
    return {
      actionIdentifier: actionId,
      notification: {
        request: {
          content: {
            data,
          },
        },
      },
    } as any
  }

  it('navigates and emits TRIGGER_OFFLINE_SAVE on SAVE_NOW_ACTION', () => {
    const response = makeResponse({ action: 'save_offline_docs', trip_id: 'trip-1' }, SAVE_NOW_ACTION)
    handleNotificationResponse(response, router)

    expect(router.push).toHaveBeenCalledWith('/trips/trip-1')
    
    // Fast-forward 100ms
    jest.advanceTimersByTime(100)
    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('TRIGGER_OFFLINE_SAVE', 'trip-1')
  })

  it('does nothing on LATER_ACTION', () => {
    const response = makeResponse({ action: 'save_offline_docs', trip_id: 'trip-1' }, LATER_ACTION)
    handleNotificationResponse(response, router)

    expect(router.push).not.toHaveBeenCalled()
    jest.advanceTimersByTime(100)
    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled()
  })

  it('navigates on treasure_map_ready', () => {
    const response = makeResponse({ action: 'treasure_map_ready', trip_id: 'trip-1' }, Notifications.DEFAULT_ACTION_IDENTIFIER)
    handleNotificationResponse(response, router)

    expect(router.push).toHaveBeenCalledWith('/trips/trip-1')
  })

  it('ignores unknown actions safely', () => {
    const response = makeResponse({ action: 'unknown_action' }, Notifications.DEFAULT_ACTION_IDENTIFIER)
    handleNotificationResponse(response, router)

    expect(router.push).not.toHaveBeenCalled()
  })
})
