import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { EventCategory } from '../../types/database';
import { createEvent, updateEvent } from '../../services/events';
import { enqueueJob } from '../../lib/asyncJobQueue';
import { getEventFields } from '../../lib/eventFieldConfig';
import { useAuth } from '../../hooks/useAuth';
import { EventDetailFields } from '../events/EventDetailFields';

interface Props {
  visible: boolean;
  tripDayId: string;
  tripId: string;
  category: EventCategory;
  subcategory: string | null;
  isPremium: boolean;
  isDemoMode: boolean;
  dietaryReminder?: string | null;
  /** When provided, sheet is in edit mode and calls updateEvent instead of createEvent */
  eventId?: string;
  /** Pre-populated field values for edit mode */
  initialValues?: Record<string, string>;
  onClose: () => void;
  onEventCreated: () => void;
}

export function EventDetailSheet({
  visible,
  tripDayId,
  tripId,
  category,
  subcategory,
  isPremium,
  isDemoMode,
  dietaryReminder,
  eventId,
  initialValues,
  onClose,
  onEventCreated,
}: Props) {
  const { user } = useAuth();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({ defaultValues: initialValues });

  const isEditMode = Boolean(eventId);

  useEffect(() => {
    if (visible) {
      reset(initialValues ?? {});
    }
  }, [visible, eventId]);

  async function onSave(formData: Record<string, string>) {
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }

    const fields = getEventFields(category, subcategory);
    const requiredFields = fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.name]?.trim()) {
        Alert.alert('Required field', `${field.label} is required.`);
        return;
      }
    }

    try {
      const payload = {
        title: formData.title?.trim() ?? '',
        start_time: formData.start_time ?? null,
        end_time: formData.end_time ?? null,
        address: formData.address ?? null,
        contact_name: formData.contact_name ?? null,
        contact_phone: formData.contact_phone ?? null,
        contact_email: formData.contact_email ?? null,
        confirmation_number: formData.confirmation_number ?? null,
        reservation_details: formData.reservation_details ?? null,
        notes: formData.notes ?? null,
      };

      if (isEditMode && eventId) {
        await updateEvent(eventId, payload);
      } else {
        const newEvent = await createEvent({
          trip_day_id: tripDayId,
          trip_id: tripId,
          category,
          subcategory: subcategory ?? null,
          linked_transport_event_id: null,
          display_order: 0,
          ...payload,
        });

        if (isPremium && !isDemoMode) {
          await enqueueJob({
            type: 'in_the_bag_suggest',
            input: { event_id: newEvent.id, trip_id: tripId, trip_day_id: tripDayId },
            event_id: newEvent.id,
            trip_id: tripId,
            user_id: user.id,
          });
        }
      }

      reset();
      onEventCreated();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  }

  const categoryTitle = category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <TouchableOpacity onPress={handleSubmit(onSave)}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <EventDetailFields
            category={category}
            subcategory={subcategory}
            control={control}
            errors={errors}
            dietaryReminder={dietaryReminder}
          />
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
  content: { padding: 20 },
});
