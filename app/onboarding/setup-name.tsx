import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

export default function SetupNameScreen() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleNext() {
    if (!fullName.trim()) { Alert.alert('Please enter your full name.'); return; }

    let profilePhotoUrl: string | null = null;
    if (photoUri && user) {
      const ext = photoUri.split('.').pop() ?? 'jpg';
      const path = `profile-photos/${user.id}/avatar.${ext}`;
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from('profile-photos').upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) { Alert.alert('Upload error', uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      profilePhotoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('users').update({ full_name: fullName.trim(), ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}) }).eq('id', user!.id);
    if (error) { Alert.alert('Error', error.message); return; }
    router.push('/onboarding/setup-location');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>What is your name?</Text>
      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
        <Text style={styles.photoLabel}>{photoUri ? 'Photo selected' : 'Add profile photo (optional)'}</Text>
      </TouchableOpacity>
      <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <TouchableOpacity style={styles.btn} onPress={handleNext}>
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
  heading: { fontSize: 26, fontWeight: '700' },
  photoPicker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, alignItems: 'center' },
  photoLabel: { color: '#555', fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
