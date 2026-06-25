import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { StatCard } from './StatCard';

type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'not_asked';

interface HealthData {
  totalSteps: number;
  totalKj: number;
  totalFlightsClimbed: number;
}

interface Props {
  permissionStatus: PermissionStatus;
  needsPermissionPrompt: boolean;
  healthData: HealthData | null;
  loading: boolean;
  onRequestPermission: () => void;
}

export function HealthSection({ permissionStatus, needsPermissionPrompt, healthData, loading, onRequestPermission }: Props) {
  if (permissionStatus === 'unavailable') return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Travel Health</Text>

      {needsPermissionPrompt || permissionStatus === 'not_asked' ? (
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>Connect Apple Health</Text>
          <Text style={styles.promptDesc}>
            See your step count, energy burned, and floors climbed during your trips.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={onRequestPermission} accessibilityRole="button">
            <Text style={styles.btnText}>Allow Health Access</Text>
          </TouchableOpacity>
        </View>
      ) : permissionStatus === 'denied' ? (
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>Health Access Disabled</Text>
          <Text style={styles.promptDesc}>Enable Health Access in your device Settings to see travel health stats.</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => Linking.openURL('app-settings:')}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      ) : (
        <>
          <StatCard
            label="Steps during travel"
            value={healthData ? healthData.totalSteps.toLocaleString() : '—'}
          />
          <StatCard
            label="Energy burned (kJ)"
            value={healthData ? Math.round(healthData.totalKj).toLocaleString() : '—'}
          />
          <StatCard
            label="Floors climbed during travel"
            value={healthData ? healthData.totalFlightsClimbed.toLocaleString() : '—'}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  promptCard: { backgroundColor: '#F7F7F7', borderRadius: 12, padding: 16, marginBottom: 12 },
  promptTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  promptDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 16 },
  btn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  loadingText: { color: '#666', fontSize: 14 },
});
