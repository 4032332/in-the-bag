import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { EventCategory } from '../../types/database';
import { countEventsForDay, createEvent } from '../../services/events';
import { isDayAtCap } from '../../lib/freeTierCap';
import { enqueueJob } from '../../lib/asyncJobQueue';
import { getEventFields } from '../../lib/eventFieldConfig';
import { useAuth } from '../../hooks/useAuth';
import { CategoryPicker } from '../events/CategoryPicker';
import { SubcategoryPicker, hasSubcategories } from '../events/SubcategoryPicker';
import { EventDetailFields } from '../events/EventDetailFields';

type SheetStep = 'loading' | 'category' | 'subcategory' | 'detail' | 'upgrade_prompt';

interface Props {
  visible: boolean;
  tripDayId: string;
  tripId: string;
  isCruise: boolean;
  isPremium: boolean;
  isDemoMode: boolean;
  dietaryReminder?: string | null;
  onClose: () => void;
  onEventCreated: () => void;
}

export function AddToDaySheet({
  visible,
  tripDayId,
  tripId,
  isCruise,
  isPremium,
  isDemoMode,
  dietaryReminder,
  onClose,
  onEventCreated,
}: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<SheetStep>('loading');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>();

  function resetState() {
    setStep('loading');
    setCategory(null);
    setSubcategory(null);
    reset();
  }

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }
    countEventsForDay(tripDayId).then((count) => {
      if (isDayAtCap(count, isPremium, isDemoMode)) {
        setStep('upgrade_prompt');
      } else {
        setStep('category');
      }
    });
  }, [visible, tripDayId, isPremium, isDemoMode]);

  function handleCategorySelected(cat: EventCategory) {
    setCategory(cat);
    if (hasSubcategories(cat)) {
      setStep('subcategory');
    } else {
      setStep('detail');
    }
  }

  function handleSubcategorySelected(sub: string) {
    setSubcategory(sub);
    setStep('detail');
  }

  function handleBack() {
    if (step === 'subcategory') {
      setStep('category');
    } else if (step === 'detail') {
      if (category && hasSubcategories(category)) {
        setStep('subcategory');
      } else {
        setStep('category');
      }
    }
  }

  async function onSave(formData: Record<string, string>) {
    if (!user || !category) return;

    const fields = getEventFields(category, subcategory);
    const requiredFields = fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.name]?.trim()) {
        Alert.alert('Required field', `${field.label} is required.`);
        return;
      }
    }

    try {
      const newEvent = await createEvent({
        trip_day_id: tripDayId,
        trip_id: tripId,
        category,
        subcategory: subcategory ?? null,
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
        linked_transport_event_id: null,
        display_order: 0,
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

      reset();
      onEventCreated();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  }

  function headerTitle(): string {
    switch (step) {
      case 'category':
        return 'Choose category';
      case 'subcategory':
        return 'Choose type';
      case 'upgrade_prompt':
        return 'Day limit reached';
      case 'detail':
        return category
          ? category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Event details';
      default:
        return 'Loading...';
    }
  }

  const showBack = step === 'subcategory' || step === 'detail';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={resetState}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {showBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.headerSide}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSide} />
          )}
          <Text style={styles.headerTitle}>{headerTitle()}</Text>
          {step === 'detail' ? (
            isSubmitting ? (
              <View style={styles.headerSide}>
                <ActivityIndicator />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit(onSave)}
                style={styles.headerSide}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity onPress={onClose} style={styles.headerSide}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'loading' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {step === 'upgrade_prompt' ? (
          <View style={styles.upgradeContainer}>
            <Text style={styles.upgradeTitle}>Day limit reached</Text>
            <Text style={styles.upgradeText}>
              Free accounts can add up to 3 events per day. Upgrade to Premium for unlimited
              events.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => {
                /* Plan 10 */
                onClose();
              }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'category' ? (
          <CategoryPicker isCruise={isCruise} isPremium={isPremium} onSelect={handleCategorySelected} />
        ) : null}

        {step === 'subcategory' && category ? (
          <SubcategoryPicker
            category={category}
            onSelect={handleSubcategorySelected}
            onSkip={() => setStep('detail')}
          />
        ) : null}

        {step === 'detail' && category ? (
          <ScrollView contentContainerStyle={styles.detailContent}>
            <EventDetailFields
              category={category}
              subcategory={subcategory}
              control={control}
              errors={errors}
              dietaryReminder={dietaryReminder}
            />
          </ScrollView>
        ) : null}
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
  headerSide: { minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  backText: { color: '#007AFF', fontSize: 16 },
  cancelText: { color: '#007AFF', fontSize: 16, textAlign: 'right' },
  saveText: { color: '#007AFF', fontSize: 16, fontWeight: '600', textAlign: 'right' },
  upgradeContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  upgradeTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  upgradeText: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  upgradeBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  laterBtn: { padding: 12 },
  laterBtnText: { color: '#888', fontSize: 15 },
  detailContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
