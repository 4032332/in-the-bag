import { useState, RefObject } from 'react'
import * as MediaLibrary from 'expo-media-library'
import { requestCameraRollPermission, showPermissionDeniedAlert } from '../utils/cameraRollPermission'
import { SkiaView } from '@shopify/react-native-skia'

export function useSocialPostCreator() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performSave = async (canvasRef: RefObject<SkiaView>) => {
    if (!canvasRef.current) return

    setIsSaving(true)
    setError(null)

    try {
      const permission = await requestCameraRollPermission()
      if (permission !== 'granted') {
        showPermissionDeniedAlert(permission)
        setIsSaving(false)
        return
      }

      // Snapshot the canvas
      const image = canvasRef.current.makeImageSnapshot()
      if (!image) throw new Error('Failed to create snapshot')

      // Encode as Base64 PNG
      const base64Data = image.encodeToBase64()
      if (!base64Data) throw new Error('Failed to encode image')

      // Save to temporary file first (expo-media-library needs a local URI)
      const FileSystem = require('expo-file-system')
      const tempUri = FileSystem.cacheDirectory + 'in-the-bag-post-' + Date.now() + '.png'
      await FileSystem.writeAsStringAsync(tempUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Save to library
      await MediaLibrary.saveToLibraryAsync(tempUri)
      
    } catch (e: any) {
      console.error('Failed to save post', e)
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const savePostcard = async (trip: any, day: any, canvasRef: RefObject<SkiaView>) => {
    await performSave(canvasRef)
  }

  const saveStatsCard = async (trip: any, day: any, healthKitData: any, canvasRef: RefObject<SkiaView>) => {
    await performSave(canvasRef)
  }

  return { savePostcard, saveStatsCard, isSaving, error }
}
