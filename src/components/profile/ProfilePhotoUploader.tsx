import React from 'react'
import { View, TouchableOpacity, Image, Text, ActionSheetIOS, StyleSheet, Alert, Platform } from 'react-native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { pickAndUploadProfilePhoto } from '@/lib/profilePhoto'

interface Props {
  userId: string
  currentUrl: string | null
  onUploadComplete: (url: string) => void
}

export function ProfilePhotoUploader({ userId, currentUrl, onUploadComplete }: Props) {
  const [uploading, setUploading] = React.useState(false)
  const { showActionSheetWithOptions } = useActionSheet()

  const handlePress = () => {
    const options = ['Take Photo', 'Choose from Library', 'Cancel']
    const cancelButtonIndex = 2
    
    // Use the cross-platform ActionSheetProvider hook we just added to _layout.tsx
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex === undefined) return
        const source = buttonIndex === 0 ? 'camera' : 'library'
        try {
          setUploading(true)
          const url = await pickAndUploadProfilePhoto(userId, source)
          onUploadComplete(url)
        } catch (err: any) {
          Alert.alert('Upload Error', err.message)
        } finally {
          setUploading(false)
        }
      },
    )
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} disabled={uploading}>
      {currentUrl ? (
        <Image source={{ uri: currentUrl }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
      {uploading && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Uploading...</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignSelf: 'center' },
  photo: { width: 96, height: 96 },
  placeholder: { width: 96, height: 96, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 12, color: '#888' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  overlayText: { color: '#FFF', fontSize: 12 },
})
