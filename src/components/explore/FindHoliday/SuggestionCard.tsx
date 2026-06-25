import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SuggestionCard as SuggestionCardType } from '../../../types/explore';

interface Props {
  card: SuggestionCardType;
  onTap: () => void;
}

export default function SuggestionCard({ card, onTap }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.destination}>{card.destination}</Text>
      <Text style={styles.label}>Why it suits you</Text>
      <Text style={styles.body}>{card.whyItSuitsYou}</Text>
      <Text style={styles.label}>Best time to visit</Text>
      <Text style={styles.body}>{card.bestTime}</Text>
      <Text style={styles.label}>Rough itinerary</Text>
      <Text style={styles.body}>{card.roughItinerary}</Text>
      <TouchableOpacity style={styles.button} onPress={onTap} accessibilityRole="button">
        <Text style={styles.buttonText}>Plan this trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  destination: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginTop: 8 },
  body: { fontSize: 14, color: '#333', marginTop: 2 },
  button: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
