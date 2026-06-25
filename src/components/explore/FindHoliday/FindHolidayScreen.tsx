import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { loadConversation, saveConversation, clearConversation } from './conversationStorage';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import { ConversationMessage, SuggestionCard } from '../../../types/explore';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function FindHolidayScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  const [messages, setMessages] = useState<ConversationMessage[]>(() => loadConversation(userId));
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    clearConversation(userId);
    setMessages([]);
  }, [userId]);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveConversation(userId, updatedMessages);
    setLoading(true);

    try {
      const historyForBackend = updatedMessages.map(({ role, content }) => ({ role, content }));

      const { data, error } = await supabase.functions.invoke('ai_trip_suggest', {
        body: { message: text, conversationHistory: historyForBackend },
      });

      if (error) throw error;

      const { reply, suggestionCards } = data as {
        reply: string;
        suggestionCards?: SuggestionCard[];
      };

      const assistantMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        suggestionCards: suggestionCards ?? [],
      };

      const withAssistant = [...updatedMessages, assistantMessage];
      setMessages(withAssistant);
      saveConversation(userId, withAssistant);
    } catch {
      const errorMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      const withError = [...updatedMessages, errorMessage];
      setMessages(withError);
      saveConversation(userId, withError);
    } finally {
      setLoading(false);
    }
  }, [messages, userId]);

  const handleCardTap = useCallback((card: SuggestionCard) => {
    router.push({ pathname: '/create-trip', params: { destination: card.destination } });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Holiday</Text>
        <TouchableOpacity onPress={handleNewConversation} accessibilityRole="button">
          <Text style={styles.newConvoButton}>New Conversation</Text>
        </TouchableOpacity>
      </View>

      {messages.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Describe what kind of holiday you are looking for and get personalised destination suggestions.
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} onCardTap={handleCardTap} />
        )}
        contentContainerStyle={styles.listContent}
        onLayout={scrollToBottom}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.typingText}>Thinking...</Text>
        </View>
      )}

      <ChatInput onSend={handleSend} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  newConvoButton: { fontSize: 15, color: '#007AFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 22 },
  listContent: { paddingVertical: 8 },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: { fontSize: 14, color: '#888' },
});
