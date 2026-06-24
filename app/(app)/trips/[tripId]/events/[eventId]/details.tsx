import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Event } from '../../../../../../src/types/database';
import { getEventFields } from '../../../../../../src/lib/eventFieldConfig';

interface Props {
  event: Event;
  canAddTransport: boolean;
  onAddTransport: () => void;
}

export function EventDetailsTab({ event, canAddTransport, onAddTransport }: Props) {
  const fields = getEventFields(event.category, event.subcategory);

  return (
    <View style={styles.container}>
      {fields.map((field) => {
        const value = (event as Record<string, unknown>)[field.name];
        if (value == null || value === '') return null;
        return (
          <View key={field.name} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{String(value)}</Text>
          </View>
        );
      })}
      {event.notes ? (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <Text style={styles.fieldValue}>{event.notes}</Text>
        </View>
      ) : null}
      {canAddTransport && (
        <TouchableOpacity style={styles.addTransportBtn} onPress={onAddTransport}>
          <Text style={styles.addTransportText}>Add transport</Text>
        </TouchableOpacity>
      )}
      {event.linked_transport_event_id && (
        <View style={styles.linkedTransport}>
          <Text style={styles.linkedTransportText}>Transport linked</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  fieldRow: { gap: 2 },
  fieldLabel: { fontSize: 12, color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: '#1a1a2e' },
  addTransportBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  addTransportText: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
  linkedTransport: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  linkedTransportText: { fontSize: 14, color: '#555' },
});
