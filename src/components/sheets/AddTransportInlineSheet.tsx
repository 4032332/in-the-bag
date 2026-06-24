import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Event, EventCategory } from '../../types/database';
import { createEvent, updateEvent } from '../../services/events';
import { useAuth } from '../../hooks/useAuth';

const TRANSPORT_OPTIONS: { category: EventCategory; label: string }[] = [
  { category: 'transport_road', label: 'Road' },
  { category: 'transport_air', label: 'Air' },
  { category: 'transport_rail', label: 'Rail' },
  { category: 'transport_water', label: 'Water' },
];

interface Props {
  visible: boolean;
  tripDayId: string;
  tripId: string;
  parentEventId: string;
  onClose: () => void;
  onTransportCreated: (transportEvent: Event) => void;
}

export function AddTransportInlineSheet({
  visible,
  tripDayId,
  tripId,
  parentEventId,
  onClose,
  onTransportCreated,
}: Props) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [provider, setProvider] = useState('');
  const [pickup, setPickup] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [route, setRoute] = useState('');
  const [startTime, setStartTime] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setSelectedCategory(null);
    setProvider('');
    setPickup('');
    setAirline('');
    setFlightNumber('');
    setOperator('');
    setRoute('');
    setStartTime('');
  }

  async function handleSave() {
    if (!selectedCategory || !user) return;

    let title: string;
    if (selectedCategory === 'transport_air') {
      title = `${airline} ${flightNumber}`.trim() || 'Flight';
    } else if (selectedCategory === 'transport_road') {
      title = provider || 'Road transport';
    } else {
      title = `${operator} ${route}`.trim() || 'Transport';
    }

    setSaving(true);
    try {
      const transportEvent = await createEvent({
        trip_day_id: tripDayId,
        trip_id: tripId,
        category: selectedCategory,
        subcategory: null,
        title,
        start_time: startTime || null,
        end_time: null,
        address: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        confirmation_number: null,
        reservation_details: null,
        notes: null,
        linked_transport_event_id: null,
        display_order: 99,
      });

      await updateEvent(parentEventId, { linked_transport_event_id: transportEvent.id });

      resetForm();
      onTransportCreated(transportEvent);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to create transport event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
      onDismiss={resetForm}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add transport</Text>
          <TouchableOpacity onPress={handleSave} disabled={!selectedCategory || saving}>
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.saveText, !selectedCategory && styles.disabledText]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Transport type</Text>
          <View style={styles.typeGrid}>
            {TRANSPORT_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t.category}
                style={[
                  styles.typeBtn,
                  selectedCategory === t.category && styles.typeBtnActive,
                ]}
                onPress={() => setSelectedCategory(t.category)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    selectedCategory === t.category && styles.typeBtnTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCategory === 'transport_road' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Provider"
                value={provider}
                onChangeText={setProvider}
              />
              <TextInput
                style={styles.input}
                placeholder="Pickup location"
                value={pickup}
                onChangeText={setPickup}
              />
              <TextInput
                style={styles.input}
                placeholder="Pickup time (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
              />
            </>
          ) : null}

          {selectedCategory === 'transport_air' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Airline"
                value={airline}
                onChangeText={setAirline}
              />
              <TextInput
                style={styles.input}
                placeholder="Flight number"
                value={flightNumber}
                onChangeText={setFlightNumber}
              />
              <TextInput
                style={styles.input}
                placeholder="Departure time (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
              />
            </>
          ) : null}

          {selectedCategory === 'transport_rail' || selectedCategory === 'transport_water' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Operator"
                value={operator}
                onChangeText={setOperator}
              />
              <TextInput
                style={styles.input}
                placeholder="Route"
                value={route}
                onChangeText={setRoute}
              />
              <TextInput
                style={styles.input}
                placeholder="Departure time (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  cancelText: { color: '#007AFF', fontSize: 16 },
  saveText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.4 },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  typeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeBtnText: { fontSize: 14, color: '#333' },
  typeBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
});
