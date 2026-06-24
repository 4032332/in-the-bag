import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Event } from '../../../../../../src/types/database';
import { getEvent, deleteEvent } from '../../../../../../src/services/events';
import { getTabVisibility } from '../../../../../../src/lib/eventTabVisibility';
import { EventTabBar } from '../../../../../../src/components/events/EventTabBar';
import { EventDetailSheet } from '../../../../../../src/components/sheets/EventDetailSheet';
import { AddTransportInlineSheet } from '../../../../../../src/components/sheets/AddTransportInlineSheet';
import { useDemoMode } from '../../../../../../src/hooks/useDemoMode';
import { EventDetailsTab } from './details';

type EventTab = 'details' | 'inTheBag' | 'documents' | 'tickets';

const TRANSPORT_ADDABLE_CATEGORIES = ['activity', 'meal', 'accommodation', 'shore_excursion'];

export default function EventScreen() {
  const { eventId, tripId, tripDayId, readOnly } = useLocalSearchParams<{
    eventId: string;
    tripId: string;
    tripDayId: string;
    readOnly?: string;
  }>();
  const router = useRouter();
  const { isDemoMode, demoTier } = useDemoMode();
  const isPremium = demoTier === 'premium';
  const isReadOnly = readOnly === 'true';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EventTab>('details');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showTransportSheet, setShowTransportSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!eventId) return;
      async function loadEvent() {
        try {
          const data = await getEvent(eventId as string);
          setEvent(data);
        } catch {
          Alert.alert('Error', 'Failed to load event.');
        } finally {
          setLoading(false);
        }
      }
      loadEvent();
    }, [eventId]),
  );

  if (!eventId || !tripId || !tripDayId) return null;

  async function handleDelete() {
    Alert.alert('Delete event', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(eventId!);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete event.');
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (!event) return <View style={styles.center}><Text>Event not found.</Text></View>;

  const visibility = getTabVisibility(event.category);
  const canAddTransport = !isReadOnly && TRANSPORT_ADDABLE_CATEGORIES.includes(event.category);

  return (
    <View style={styles.container}>
      {!isReadOnly && (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowEditSheet(true)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, styles.destructiveText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <EventTabBar activeTab={activeTab} visibility={visibility} onSelectTab={setActiveTab} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'details' && (
          <EventDetailsTab
            event={event}
            canAddTransport={canAddTransport}
            onAddTransport={() => setShowTransportSheet(true)}
          />
        )}
        {activeTab === 'inTheBag' && (
          <View style={styles.tabPlaceholder}>
            <Text style={styles.placeholderText}>In the Bag suggestions will appear here.</Text>
          </View>
        )}
        {activeTab === 'documents' && (
          <View style={styles.tabPlaceholder}>
            <Text style={styles.placeholderText}>Documents will appear here.</Text>
          </View>
        )}
        {activeTab === 'tickets' && (
          <View style={styles.tabPlaceholder}>
            <Text style={styles.placeholderText}>Tickets will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <EventDetailSheet
        visible={showEditSheet}
        tripDayId={tripDayId!}
        tripId={tripId!}
        category={event.category}
        subcategory={event.subcategory}
        isPremium={isPremium}
        isDemoMode={isDemoMode}
        eventId={event.id}
        initialValues={{
          title: event.title ?? '',
          start_time: event.start_time ?? '',
          end_time: event.end_time ?? '',
          address: event.address ?? '',
          contact_name: event.contact_name ?? '',
          contact_phone: event.contact_phone ?? '',
          contact_email: event.contact_email ?? '',
          confirmation_number: event.confirmation_number ?? '',
          reservation_details: event.reservation_details ?? '',
          notes: event.notes ?? '',
        }}
        onClose={() => setShowEditSheet(false)}
        onEventCreated={() => {
          setShowEditSheet(false);
          loadEvent();
        }}
      />

      <AddTransportInlineSheet
        visible={showTransportSheet}
        tripDayId={tripDayId!}
        tripId={tripId!}
        parentEventId={eventId!}
        onClose={() => setShowTransportSheet(false)}
        onTransportCreated={() => {
          setShowTransportSheet(false);
          loadEvent();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 16, color: '#007AFF' },
  destructiveText: { color: '#dc3545' },
  content: { flex: 1 },
  contentInner: { flexGrow: 1 },
  tabPlaceholder: { flex: 1, padding: 20 },
  placeholderText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 40 },
});
