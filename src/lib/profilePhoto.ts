import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from './supabase'

export type PhotoSource = 'library' | 'camera'

export async function pickAndUploadProfilePhoto(
  userId: string,
  source: PhotoSource,
): Promise<string> {
  // Request permissions
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') throw new Error('Camera permission denied')
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') throw new Error('Photo library permission denied')
  }

  // Launch picker
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })

  if (result.canceled || !result.assets?.[0]) throw new Error('No image selected')

  const asset = result.assets[0]

  // Compress and resize to max 400x400
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  )

  // Upload to Supabase Storage
  const path = `profile-photos/${userId}/${Date.now()}.jpg`
  const response = await fetch(manipulated.uri)
  const blob = await response.blob()

  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
  if (blob.size > MAX_SIZE_BYTES) throw new Error('Image is too large. Please choose a smaller photo.')

  const { error: uploadErr } = await supabase.storage
    .from('user-assets')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) throw new Error(uploadErr.message)

  const { data: { publicUrl } } = supabase.storage.from('user-assets').getPublicUrl(path)

  // Update users row
  const { error: updateErr } = await supabase
    .from('users')
    .update({ profile_photo_url: publicUrl })
    .eq('id', userId)

  if (updateErr) throw new Error(updateErr.message)

  return publicUrl
}
