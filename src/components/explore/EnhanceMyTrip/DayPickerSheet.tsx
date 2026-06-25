import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

interface TripDay {
  id: string;
  day_number: number;
  date: string;
}

interface Props {
  tripId: string;
  visible: boolean;
  onDaySelected: (tripDayId: string) => void;
  onCancel: () => void;
  userLocale?: string;
}

function formatDayLabel(day: TripDay, locale?: string): string {
  const d = new Date(day.date);
  const weekday = d.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Day ${day.day_number}  ${weekday}  ${dateStr}`;
}

export default function DayPickerSheet({ tripId, visible, onDaySelected, onCancel, userLocale }: Props) {
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !tripId) return;
    setLoading(true);
    supabase
      .from('trip_days')
      .select('id, day_number, date')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .then(({ data }) => {
        setDays(data ?? []);
        setLoading(false);
      });
  }, [tripId, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={styles.backdrop} onPress={onCancel} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.title}>Which day?</Text>
        <Text style={styles.subtitle}>All selected events will be added to this day.</Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={days}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => onDaySelected(item.id)}
                accessibilityRole="button"
              >
                <Text style={styles.dayLabel}>{formatDayLabel(item, userLocale)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C0C0C0',
    marginTop: 10,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  loader: { marginVertical: 32 },
  dayRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  dayLabel: { fontSize: 16, color: '#000' },
  cancelButton: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#FF3B30' },
});
