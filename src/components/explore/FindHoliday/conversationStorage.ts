import { storage } from '../../../lib/mmkv';
import { ConversationMessage } from '../../../types/explore';

function conversationKey(userId: string): string {
  return `explore_conversation_history_${userId}`;
}

export function loadConversation(userId: string): ConversationMessage[] {
  const raw = storage.getString(conversationKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConversationMessage[];
  } catch {
    return [];
  }
}

export function saveConversation(userId: string, messages: ConversationMessage[]): void {
  storage.set(conversationKey(userId), JSON.stringify(messages));
}

export function clearConversation(userId: string): void {
  storage.delete(conversationKey(userId));
}
