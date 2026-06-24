import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch, ActivityIndicator, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { createTrip, insertTripDestinations, insertTripParticipant } from '../../../src/services/trips';
import { createTripDays } from '../../../src/services/tripDays';
import { generateTripDays } from '../../../src/lib/tripDays';
import { enqueueJob } from '../../../src/lib/asyncJobQueue';
import { useAuth } from '../../../src/hooks/useAuth';
import { useDemoMode } from '../../../src/hooks/useDemoMode';

type Step = 1 | 2 | 3 | 4;

interface DestinationInput {
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  display_order: number;
}

const step1Schema = z.object({ name: z.string().min(1, 'Trip name is required') });

function computeTreasureMapLayout(): Record<string, unknown> {
  const seed = Math.random().toString(36).slice(2);
  return { seed, tiles: [], paths: [] };
}

export default function CreateTripScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { demoTier } = useDemoMode();
  const isPremium = demoTier === 'premium';

  const [step, setStep] = useState<Step>(1);
  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<DestinationInput[]>([
    { city: '', country: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: format(new Date(), 'yyyy-MM-dd'), display_order: 0 }
  ]);
  const [isCruise, setIsCruise] = useState(false);
  const [cruiseDetails, setCruiseDetails] = useState({ company: '', ship: '', departurePort: '', arrivalPort: '', stops: '', inclusions: '' });
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{ destIndex: number; field: 'start_date' | 'end_date' } | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: tripName },
  });

  function handleStep1(data: { name: string }) {
    setTripName(data.name);
    setStep(2);
  }

  function updateDestination(index: number, field: keyof DestinationInput, value: string) {
    setDestinations(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function addDestination() {
    setDestinations(prev => [...prev, { city: '', country: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: format(new Date(), 'yyyy-MM-dd'), display_order: prev.length }]);
  }

  function canProceedStep2(): boolean {
    return destinations.every(d => d.city.trim() && d.country.trim() && d.start_date && d.end_date);
  }

  async function handleCreateTrip() {
    if (!user) { Alert.alert('Session expired', 'Please sign in again.'); return; }
    setSaving(true);
    try {
      const layout = computeTreasureMapLayout();
      const trip = await createTrip({
        name: tripName,
        is_cruise: isCruise,
        cruise_details: isCruise ? {
          company: cruiseDetails.company,
          ship: cruiseDetails.ship,
          departure_port: cruiseDetails.departurePort,
          arrival_port: cruiseDetails.arrivalPort,
          stops: cruiseDetails.stops,
          inclusions: cruiseDetails.inclusions,
        } : undefined,
        treasure_map_layout: layout,
        owner_user_id: user.id,
      });

      await insertTripDestinations(trip.id, destinations);
      await insertTripParticipant(trip.id, user.id);

      const sortedDests = [...destinations].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const overallStart = sortedDests[0].start_date;
      const overallEnd = sortedDests[sortedDests.length - 1].end_date;
      const days = generateTripDays(trip.id, overallStart, overallEnd);
      await createTripDays(trip.id, days);

      await enqueueJob({ type: 'cover_photo_fetch', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });

      if (isPremium) {
        await enqueueJob({ type: 'pre_trip_checklist_generate', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
        await enqueueJob({ type: 'treasure_map_generate', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
        await enqueueJob({ type: 'in_the_bag_suggest', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
      }

      router.replace(`/trips/${trip.id}` as any);
    } catch (e) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Step 1: Name */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What is your trip called?</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. Paris Summer 2027"
                value={value}
                onChangeText={onChange}
                autoFocus
              />
            )}
          />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit(handleStep1)}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Destinations + dates */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Where are you going?</Text>
          {destinations.map((dest, i) => (
            <View key={i} style={styles.destBlock}>
              {destinations.length > 1 && (
                <Text style={styles.destLabel}>Destination {i + 1}</Text>
              )}
              <TextInput style={styles.input} placeholder="City" value={dest.city} onChangeText={(v) => updateDestination(i, 'city', v)} />
              <TextInput style={styles.input} placeholder="Country" value={dest.country} onChangeText={(v) => updateDestination(i, 'country', v)} />
              <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker({ destIndex: i, field: 'start_date' })}>
                <Text style={styles.datePickerText}>Start: {dest.start_date}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker({ destIndex: i, field: 'end_date' })}>
                <Text style={styles.datePickerText}>End: {dest.end_date}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {showDatePicker && (
            <DateTimePicker
              value={new Date(destinations[showDatePicker.destIndex][showDatePicker.field])}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, date) => {
                if (date && showDatePicker) {
                  updateDestination(showDatePicker.destIndex, showDatePicker.field, format(date, 'yyyy-MM-dd'));
                }
                setShowDatePicker(null);
              }}
            />
          )}
          <TouchableOpacity style={styles.addDestBtn} onPress={addDestination}>
            <Text style={styles.addDestBtnText}>+ Add another destination</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !canProceedStep2() && styles.disabledBtn]}
              onPress={() => { if (canProceedStep2()) setStep(3); }}
              disabled={!canProceedStep2()}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Family members (stub — full invitation flow is Plan 7) */}
      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Who is coming?</Text>
          <Text style={styles.subtext}>Add family members and friends to your trip. Invitation management is available in your Profile.</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(4)}>
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 4: Cruise toggle */}
      {step === 4 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Is this a cruise?</Text>
          <View style={styles.cruiseToggleRow}>
            <Text style={styles.cruiseToggleLabel}>Cruise trip</Text>
            <Switch value={isCruise} onValueChange={setIsCruise} />
          </View>
          {isCruise && (
            <View style={styles.cruiseFields}>
              <TextInput style={styles.input} placeholder="Cruise company" value={cruiseDetails.company} onChangeText={(v) => setCruiseDetails(p => ({ ...p, company: v }))} />
              <TextInput style={styles.input} placeholder="Ship name" value={cruiseDetails.ship} onChangeText={(v) => setCruiseDetails(p => ({ ...p, ship: v }))} />
              <TextInput style={styles.input} placeholder="Departure port" value={cruiseDetails.departurePort} onChangeText={(v) => setCruiseDetails(p => ({ ...p, departurePort: v }))} />
              <TextInput style={styles.input} placeholder="Arrival port" value={cruiseDetails.arrivalPort} onChangeText={(v) => setCruiseDetails(p => ({ ...p, arrivalPort: v }))} />
              <TextInput style={[styles.input, styles.textarea]} placeholder="Stops (optional)" value={cruiseDetails.stops} onChangeText={(v) => setCruiseDetails(p => ({ ...p, stops: v }))} multiline />
              <TextInput style={[styles.input, styles.textarea]} placeholder="Package inclusions (optional)" value={cruiseDetails.inclusions} onChangeText={(v) => setCruiseDetails(p => ({ ...p, inclusions: v }))} multiline />
            </View>
          )}
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(3)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.disabledBtn]}
              onPress={handleCreateTrip}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create trip</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 16 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#007AFF' },
  stepDotText: { fontSize: 13, fontWeight: '600', color: '#999' },
  stepDotTextActive: { color: '#fff' },
  stepContainer: { gap: 12 },
  stepTitle: { fontSize: 22, fontWeight: '700' },
  subtext: { fontSize: 14, color: '#666', lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: '#fafafa' },
  textarea: { height: 80, textAlignVertical: 'top' },
  error: { color: '#c00', fontSize: 13 },
  primaryBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#333', fontSize: 16, fontWeight: '500' },
  disabledBtn: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: 12 },
  destBlock: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, backgroundColor: '#fafafa' },
  destLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  datePicker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  datePickerText: { fontSize: 14, color: '#333' },
  addDestBtn: { alignItems: 'center', padding: 12 },
  addDestBtnText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
  cruiseToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  cruiseToggleLabel: { fontSize: 16 },
  cruiseFields: { gap: 10 },
});
