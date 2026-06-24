import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useDemoMode } from '../hooks/useDemoMode';

interface Props {
  size?: number;
  focused: boolean;
}

export function TabBarProfileIcon({ size = 26, focused }: Props) {
  const profile = useProfile();
  const { isDemoMode, demoTier } = useDemoMode();
  const isPremium = isDemoMode ? demoTier === 'premium' : false;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <View style={[
      styles.wrapper,
      { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 },
      isPremium && styles.goldRing,
    ]}>
      {profile?.profile_photo_url ? (
        <Image source={{ uri: profile.profile_photo_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          {initials ? (
            <Text style={styles.initials}>{initials}</Text>
          ) : (
            <Text style={styles.silhouette}>?</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  goldRing: { borderColor: '#f0c040' },
  placeholder: { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 11, fontWeight: '700', color: '#fff' },
  silhouette: { fontSize: 14, color: '#fff' },
});
