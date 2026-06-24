import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ExtractionItem } from '../../../types/explore';

interface Props {
  selectedItems: ExtractionItem[];
  onQuickAdd: () => void;
  disabled: boolean;
}

export default function QuickAddButton({ selectedItems, onQuickAdd, disabled }: Props) {
  const count = selectedItems.filter((i) => i.selected).length;
  const isDisabled = disabled || count === 0;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onQuickAdd}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`Quick Add ${count} item${count !== 1 ? 's' : ''}`}
    >
      <Text style={styles.text}>
        {count === 0 ? 'Select items to add' : `Add ${count} item${count !== 1 ? 's' : ''}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    margin: 16,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#B0C4DE' },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
