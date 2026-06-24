// src/components/in-the-bag/EventLevelView.tsx
import React, { useCallback } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { useEventItems } from '@/hooks/useInTheBagItems';
import { addItem, togglePacked } from '@/services/inTheBagService';
import { InTheBagItemRow } from './InTheBagItem';
import { AddItemInput } from './AddItemInput';
import { AISuggestionsStub } from './AISuggestionsStub';

interface Props {
  tripId: string;
  eventId: string;
  eventTitle: string;
  isPremium: boolean;
  aiJobStatus: 'idle' | 'loading' | 'complete';
  onUpgradePress: () => void;
}

export function EventLevelView({
  tripId,
  eventId,
  eventTitle,
  isPremium,
  aiJobStatus,
  onUpgradePress,
}: Props) {
  const { items, loading } = useEventItems(eventId);

  const handleAdd = useCallback(
    (title: string) =>
      addItem(title, { kind: 'event', trip_id: tripId, event_id: eventId }),
    [tripId, eventId],
  );

  const handleToggle = useCallback(
    (ids: string[], isPacked: boolean) => togglePacked(ids, isPacked),
    [],
  );

  const aiState = !isPremium
    ? 'locked'
    : aiJobStatus === 'loading'
    ? 'loading'
    : 'ready';

  if (loading) return <Text style={styles.loadingText}>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{eventTitle}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InTheBagItemRow item={item} onTogglePacked={handleToggle} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items yet for this event.</Text>
        }
        scrollEnabled={false}
      />
      <AISuggestionsStub state={aiState} onUnlockPress={onUpgradePress} />
      <AddItemInput onAdd={handleAdd} placeholder="Add item for this event..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingText: { padding: 16, color: '#888' },
  emptyText: { padding: 16, color: '#AAA', fontSize: 14 },
});
