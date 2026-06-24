// src/components/in-the-bag/DayLevelView.tsx
import React, { useCallback, useMemo } from 'react';
import { SectionList, Text, View, StyleSheet } from 'react-native';
import { useDayItems } from '@/hooks/useInTheBagItems';
import { addItem, togglePacked } from '@/services/inTheBagService';
import { buildDayViewSections } from '@/utils/deduplicateItems';
import { InTheBagItemRow } from './InTheBagItem';
import { AddItemInput } from './AddItemInput';
import { AISuggestionsStub } from './AISuggestionsStub';

interface EventMeta { id: string; title: string }

interface Props {
  tripId: string;
  tripDayId: string;
  events: EventMeta[];
  isPremium: boolean;
  onUpgradePress: () => void;
}

export function DayLevelView({ tripId, tripDayId, events, isPremium, onUpgradePress }: Props) {
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const { eventItems, dayItems, loading } = useDayItems(tripId, tripDayId, eventIds);

  const sections = useMemo(
    () => buildDayViewSections(eventItems, dayItems, events),
    [eventItems, dayItems, events],
  );

  const handleAdd = useCallback(
    (title: string) =>
      addItem(title, { kind: 'day', trip_id: tripId, trip_day_id: tripDayId }),
    [tripId, tripDayId],
  );

  const handleToggle = useCallback(
    (allIds: string[], isPacked: boolean) => togglePacked(allIds, isPacked),
    [],
  );

  if (loading) return <Text style={styles.loadingText}>Loading...</Text>;

  const sectionListData = sections.map((s) => ({
    title: s.eventTitle ?? 'Day-level items',
    data: s.items,
    eventId: s.eventId,
  }));

  return (
    <View style={styles.container}>
      <SectionList
        sections={sectionListData}
        keyExtractor={(item) => item.item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <InTheBagItemRow
            item={item.item}
            allIds={item.allIds}
            sourceEventTitles={
              item.sourceEventIds.length > 1
                ? item.sourceEventIds.map(
                    (id) => events.find((e) => e.id === id)?.title ?? id,
                  )
                : undefined
            }
            onTogglePacked={handleToggle}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items for today yet.</Text>
        }
        scrollEnabled={false}
      />
      <AISuggestionsStub
        state={isPremium ? 'ready' : 'locked'}
        onUnlockPress={onUpgradePress}
      />
      <AddItemInput onAdd={handleAdd} placeholder="Add day item..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loadingText: { padding: 16, color: '#888' },
  emptyText: { padding: 16, color: '#AAA', fontSize: 14 },
});
