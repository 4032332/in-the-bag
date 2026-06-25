import { useGlobalNotifications } from '@/hooks/useGlobalNotifications'
import { useAppLaunchNotifications } from '../notifications/useAppLaunchNotifications'

export function GlobalNotificationListener() {
  useGlobalNotifications()
  useAppLaunchNotifications()
  return null
}
