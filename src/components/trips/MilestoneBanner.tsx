import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MilestoneBannerState } from '../../types/database';

const BANNER_CONFIG: Record<MilestoneBannerState['banner_key'], {
  title: string;
  actions: Array<{ label: string; action: 'confirm' | 'dismiss' | 'save_now' | 'snooze' }>;
}> = {
  insurance_30d: {
    title: 'Have you organised travel insurance?',
    actions: [
      { label: 'Yes, sorted', action: 'confirm' },
      { label: 'Remind me later', action: 'snooze' },
    ],
  },
  visa_14d: {
    title: 'Confirm your visa and immigration requirements',
    actions: [
      { label: "I've sorted this", action: 'confirm' },
      { label: 'Not applicable', action: 'dismiss' },
    ],
  },
  esim_7d: {
    title: 'Organise an e-SIM so you are connected when you land',
    actions: [
      { label: 'Done', action: 'confirm' },
      { label: 'Remind me later', action: 'snooze' },
    ],
  },
  offline_docs_7d: {
    title: 'Save critical documents for offline access',
    actions: [
      { label: 'Save Now', action: 'save_now' },
      { label: 'Later', action: 'snooze' },
    ],
  },
  wifi_day_of: {
    title: 'Connect to airport WiFi as soon as you land',
    actions: [
      { label: 'Got it', action: 'dismiss' },
    ],
  },
};

interface Props {
  bannerKey: MilestoneBannerState['banner_key'];
  onConfirm: () => void;
  onDismiss: () => void;
  onSnooze?: () => void;
}

export function MilestoneBanner({ bannerKey, onConfirm, onDismiss, onSnooze }: Props) {
  const config = BANNER_CONFIG[bannerKey];

  function handleAction(action: 'confirm' | 'dismiss' | 'save_now' | 'snooze') {
    if (action === 'confirm' || action === 'save_now') onConfirm();
    else if (action === 'dismiss') onDismiss();
    else if (action === 'snooze') onSnooze?.();
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>{config.title}</Text>
      <View style={styles.actions}>
        {config.actions.map((a) => (
          <TouchableOpacity key={a.action} style={styles.actionBtn} onPress={() => handleAction(a.action)}>
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#fffbea', borderWidth: 1, borderColor: '#f0c040', borderRadius: 10, padding: 14, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { fontSize: 13, color: '#333' },
});
