// Shared types across web, mobile, api, and admin

export interface CapturedWord {
  word:        string;
  definition:  string;
  example?:    string;
  capturedAt:  number; // unix ms
}

export interface UserSession {
  id:         string;
  startedAt:  number;
  endedAt?:   number;
  wordCount:  number;
  messages:   ConversationMessage[];
}

export interface ConversationMessage {
  role:   'user' | 'assistant';
  text:   string;
  sentAt: number;
}
