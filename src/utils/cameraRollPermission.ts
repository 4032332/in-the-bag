import * as MediaLibrary from 'expo-media-library'
import { Alert, Linking } from 'react-native'

export async function requestCameraRollPermission(): Promise<'granted' | 'denied' | 'blocked'> {
  const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync()
  if (status === 'granted') return 'granted'
  if (!canAskAgain) return 'blocked'
  return 'denied'
}

export function showPermissionDeniedAlert(status: 'denied' | 'blocked') {
  if (status === 'blocked') {
    Alert.alert(
      'Camera Roll Access Blocked',
      'To save photos, enable camera roll access in Settings > Privacy > Photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    )
  } else {
    Alert.alert(
      'Camera Roll Access Required',
      'Please allow In the Bag to save to your camera roll.',
      [{ text: 'OK', style: 'default' }]
    )
  }
}
