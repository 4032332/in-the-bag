import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { Event } from '../../types/database';
import { EventTile } from './EventTile';
import { EventStackedRow } from './EventStackedRow';

interface Props {
  events: Event[];
  displayStyle: 'tiles' | 'stacked';
  tripId: string;
}

export function EventList({ events, displayStyle, tripId }: Props) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No events yet — tap + to add one.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) =>
        displayStyle === 'tiles'
          ? <EventTile event={item} tripId={tripId} />
          : <EventStackedRow event={item} tripId={tripId} />
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
  list: { padding: 12 },
});
