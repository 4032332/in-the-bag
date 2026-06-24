import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { TripDay } from '../../types/database';
import { formatDayTabLabel } from '../../lib/tripDays';

interface Props {
  days: TripDay[];
  activeDayId: string | null;
  onSelectDay: (day: TripDay) => void;
  showSummary?: boolean;
  summaryActive?: boolean;
  onSelectSummary?: () => void;
}

export function DayTabBar({ days, activeDayId, onSelectDay, showSummary = true, summaryActive = false, onSelectSummary }: Props) {
  return (
    <ScrollView style={styles.tabBar} showsVerticalScrollIndicator={false}>
      {showSummary && (
        <TouchableOpacity
          style={[styles.tab, summaryActive && styles.tabActive]}
          onPress={onSelectSummary}
          accessibilityRole="tab"
          accessibilityState={{ selected: summaryActive }}
        >
          <Text style={[styles.dayLabel, summaryActive && styles.activeText]}>Trip</Text>
          <Text style={[styles.weekday, summaryActive && styles.activeText]}>Sum-</Text>
          <Text style={[styles.date, summaryActive && styles.activeText]}>mary</Text>
        </TouchableOpacity>
      )}
      {days.map((day) => {
        const [dayLabel, weekday, date] = formatDayTabLabel(day);
        const isActive = day.id === activeDayId;
        return (
          <TouchableOpacity
            key={day.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelectDay(day)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.dayLabel, isActive && styles.activeText]}>{dayLabel}</Text>
            <Text style={[styles.weekday, isActive && styles.activeText]}>{weekday}</Text>
            <Text style={[styles.date, isActive && styles.activeText]}>{date}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: { width: 64, backgroundColor: '#f8f8f8', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#ddd' },
  tab: { paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  tabActive: { backgroundColor: '#007AFF' },
  dayLabel: { fontSize: 10, fontWeight: '700', color: '#333', textAlign: 'center' },
  weekday: { fontSize: 9, color: '#555', marginTop: 1, textAlign: 'center' },
  date: { fontSize: 9, color: '#555', marginTop: 1, textAlign: 'center' },
  activeText: { color: '#fff' },
});
