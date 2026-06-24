import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ConversationMessage, SuggestionCard as SuggestionCardType } from '../../../types/explore';
import SuggestionCard from './SuggestionCard';

interface Props {
  message: ConversationMessage;
  onCardTap: (card: SuggestionCardType) => void;
}

export default function ChatBubble({ message, onCardTap }: Props) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      {message.suggestionCards && message.suggestionCards.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cards}>
          {message.suggestionCards.map((card, i) => (
            <SuggestionCard key={i} card={card} onTap={() => onCardTap(card)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, marginHorizontal: 12 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: '#007AFF' },
  assistantBubble: { backgroundColor: '#F0F0F0' },
  text: { fontSize: 15, lineHeight: 20 },
  userText: { color: '#FFFFFF' },
  assistantText: { color: '#000000' },
  cards: { marginTop: 8, width: '100%' },
});
