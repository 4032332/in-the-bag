import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { getEventFields } from '../../lib/eventFieldConfig';
import { EventCategory } from '../../types/database';

interface Props {
  category: EventCategory;
  subcategory?: string | null;
  control: Control<Record<string, string>>;
  errors: FieldErrors<Record<string, string>>;
  dietaryReminder?: string | null;
}

export function EventDetailFields({ category, subcategory, control, errors, dietaryReminder }: Props) {
  const fields = getEventFields(category, subcategory);

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
          <Controller
            control={control}
            name={field.name}
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, field.type === 'textarea' && styles.textarea]}
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
