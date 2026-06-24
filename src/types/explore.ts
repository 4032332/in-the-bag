export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  timestamp: number;
  suggestionCards?: SuggestionCard[];
}

export interface SuggestionCard {
  destination: string;
  whyItSuitsYou: string;
  bestTime: string;
  roughItinerary: string;
}

export type ClassificationLabel = 'Event' | 'Task';

export interface ExtractionItem {
  id: string;
  recommendation: string;
  sourceTimestamp: string | null;
  classification: ClassificationLabel;
  originalClassification: ClassificationLabel;
  selected: boolean;
}
