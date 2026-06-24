import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Control, Controller, FieldErrors, useWatch } from 'react-hook-form';
import { getEventFields } from '../../lib/eventFieldConfig';
import { EventCategory } from '../../types/database';

interface Props {
  category: EventCategory;
  subcategory?: string | null;
  control: Control<Record<string, string>>;
  errors: FieldErrors<Record<string, string>>;
  dietaryReminder?: string | null;
  onLookupFlight?: (flightNumber: string) => void;
  flightLookupLoading?: boolean;
}

export function EventDetailFields({ category, subcategory, control, errors, dietaryReminder, onLookupFlight, flightLookupLoading }: Props) {
  const fields = getEventFields(category, subcategory);
  const currentFlightNumber = useWatch({ control, name: 'flight_number' });

  return (
    <View>
      {category === 'meal' && dietaryReminder ? (
        <View style={styles.dietaryBanner}>
          <Text style={styles.dietaryText}>Reminder: {dietaryReminder}</Text>
        </View>
      ) : null}
      {fields.map((field) => (
        <View key={field.name} style={styles.fieldRow}>
          <Text style={styles.label}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          <View style={field.name === 'flight_number' ? styles.flightNumberRow : undefined}>
            <Controller
              control={control}
              name={field.name}
              defaultValue=""
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, field.type === 'textarea' && styles.textarea, field.name === 'flight_number' && styles.flightInput]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder={field.placeholder ?? ''}
                  multiline={field.type === 'textarea'}
                  numberOfLines={field.type === 'textarea' ? 3 : 1}
                  keyboardType={
                    field.type === 'phone'
                      ? 'phone-pad'
                      : field.type === 'email'
                      ? 'email-address'
                      : 'default'
                  }
                />
              )}
            />
            {field.name === 'flight_number' && onLookupFlight && (
              <TouchableOpacity 
                style={styles.lookupBtn} 
                onPress={() => currentFlightNumber && onLookupFlight(currentFlightNumber)}
                disabled={!currentFlightNumber || flightLookupLoading}
              >
                {flightLookupLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.lookupBtnText}>Lookup</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {errors[field.name] ? (
            <Text style={styles.error}>{errors[field.name]?.message}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dietaryBanner: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  dietaryText: { fontSize: 13, color: '#5d4037' },
  fieldRow: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
  flightNumberRow: { flexDirection: 'row', gap: 8 },
  flightInput: { flex: 1 },
  lookupBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  error: { color: '#c00', fontSize: 12, marginTop: 2 },
});
