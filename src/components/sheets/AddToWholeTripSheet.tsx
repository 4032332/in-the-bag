import React, { useState } from 'react';
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
import { EventCategory, TripDay } from '../../types/database';
import { countEventsForDay, createEvent } from '../../services/events';
import { isDayAtCap } from '../../lib/freeTierCap';
import { enqueueJob } from '../../lib/asyncJobQueue';
import { getEventFields } from '../../lib/eventFieldConfig';
import { formatDayTabLabel } from '../../lib/tripDays';
import { useAuth } from '../../hooks/useAuth';
import { CategoryPicker } from '../events/CategoryPicker';
import { SubcategoryPicker, hasSubcategories } from '../events/SubcategoryPicker';
import { EventDetailFields } from '../events/EventDetailFields';

type SheetStep = 'day_picker' | 'category' | 'subcategory' | 'detail' | 'upgrade_prompt';

interface Props {
  visible: boolean;
  tripId: string;
  days: TripDay[];
  isCruise: boolean;
  isPremium: boolean;
  isDemoMode: boolean;
  dietaryReminder?: string | null;
  onClose: () => void;
  onEventCreated: () => void;
}

export function AddToWholeTripSheet({
  visible,
  tripId,
  days,
  isCruise,
  isPremium,
  isDemoMode,
  dietaryReminder,
  onClose,
  onEventCreated,
}: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<SheetStep>('day_picker');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>();

  function resetState() {
    setStep('day_picker');
    setSelectedDayId(null);
    setCategory(null);
    setSubcategory(null);
    reset();
  }

  async function handleDaySelected(dayId: string) {
    setSelectedDayId(dayId);
    const count = await countEventsForDay(dayId);
    if (isDayAtCap(count, isPremium, isDemoMode)) {
      setStep('upgrade_prompt');
    } else {
      setStep('category');
    }
  }

  function handleCategorySelected(cat: EventCategory) {
    setCategory(cat);
    if (hasSubcategories(cat)) {
      setStep('subcategory');
    } else {
      setStep('detail');
    }
  }

  function handleBack() {
    if (step === 'category') {
      setStep('day_picker');
    } else if (step === 'subcategory') {
      setStep('category');
    } else if (step === 'detail') {
      if (category && hasSubcategories(category)) {
        setStep('subcategory');
      } else {
        setStep('category');
      }
    } else if (step === 'upgrade_prompt') {
      setStep('day_picker');
    }
  }

  async function onSave(formData: Record<string, string>) {
    if (!user || !category || !selectedDayId) return;

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
        trip_day_id: selectedDayId,
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
          input: { event_id: newEvent.id, trip_id: tripId, trip_day_id: selectedDayId },
          event_id: newEvent.id,
          trip_id: tripId,
          user_id: user.id,
        });
      }

      resetState();
      onEventCreated();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  }

  function headerTitle(): string {
    switch (step) {
      case 'day_picker':
        return 'Choose day';
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
    }
  }

  const isFirstStep = step === 'day_picker';
  const showSave = step === 'detail';

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
          <TouchableOpacity
            onPress={isFirstStep ? onClose : handleBack}
            style={styles.headerSide}
          >
            <Text style={styles.leftBtnText}>{isFirstStep ? 'Cancel' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle()}</Text>
          {showSave ? (
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
            <TouchableOpacity
              onPress={() => { onClose(); resetState(); }}
              style={styles.headerSide}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'day_picker' ? (
          <ScrollView contentContainerStyle={styles.dayList}>
            {days.map((day) => {
              const [dayLabel, weekday, date] = formatDayTabLabel(day);
              return (
                <TouchableOpacity
                  key={day.id}
                  style={styles.dayItem}
                  onPress={() => handleDaySelected(day.id)}
                >
                  <Text style={styles.dayItemLabel}>{dayLabel}</Text>
                  <Text style={styles.dayItemSub}>
                    {weekday} {date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

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
                resetState();
              }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={() => {
                onClose();
                resetState();
              }}
            >
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
            onSelect={(sub) => {
              setSubcategory(sub);
              setStep('detail');
            }}
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
  leftBtnText: { color: '#007AFF', fontSize: 16 },
  cancelText: { color: '#007AFF', fontSize: 16, textAlign: 'right' },
  saveText: { color: '#007AFF', fontSize: 16, fontWeight: '600', textAlign: 'right' },
  dayList: { padding: 16, gap: 8 },
  dayItem: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayItemLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  dayItemSub: { fontSize: 13, color: '#666' },
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
});
