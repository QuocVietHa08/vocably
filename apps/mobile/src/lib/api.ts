import * as SecureStore from 'expo-secure-store';
import type { Flashcard } from '@/src/data/flashcards';

export const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

// ─── Anonymous ID for testing ──────────────────────────────────────────

const DEVICE_ID_KEY = 'vocally_device_id';

// If a test user UUID is provided in env vars, use it directly.
// This ensures the mobile app matches the seeded DB user during dev.
const TEST_USER_ID = process.env.EXPO_PUBLIC_TEST_USER_ID;

export async function getDeviceId(): Promise<string> {
  if (TEST_USER_ID) return TEST_USER_ID;

  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── API Client ────────────────────────────────────────────────────────

export interface APIError {
  error: string;
}

export interface NextCardsResponse {
  user_id: string;
  cards: Flashcard[];
  count: number;
  remaining: number;
  queue_healthy: boolean;
}

export interface QueuePrefillResponse {
  user_id: string;
  current_depth: number;
  filling: boolean;
  message: string;
}

export interface SwipePayload {
  user_id: string;
  flashcard_id: string;
  direction: 'right' | 'left' | 'up';
  session_id?: string;
  response_time_ms: number;
}

export interface CEFRLevel {
  vocabulary_score: number;
  grammar_score: number;
  idiom_score: number;
  collocation_score: number;
}

export interface UserLevelResponse {
  user_id: string;
  cefr_level: string;
  ielts_band: number;
  confidence: number;
  breakdown: CEFRLevel;
  total_swipes: number;
  assessed_at: string;
}

class ApiClient {
  private async getUserId(): Promise<string> {
    // In the future this should prefer the Supabase Auth UserId
    return await getDeviceId();
  }

  /**
   * Fast-Path: Record a swipe immediately without waiting.
   */
  async recordSwipe(flashcardId: string, direction: 'right' | 'left' | 'up', responseTimeMs: number): Promise<void> {
    const userId = await this.getUserId();
    const payload: SwipePayload = {
      user_id: userId,
      flashcard_id: flashcardId,
      direction,
      response_time_ms: responseTimeMs,
    };

    fetch(`${BACKEND_URL}/api/swipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(console.warn); // Fire and forget
  }

  /**
   * Fast-Path: Get the next pre-computed cards.
   */
  async getNextCards(count: number = 10): Promise<NextCardsResponse> {
    const userId = await this.getUserId();
    const res = await fetch(`${BACKEND_URL}/api/cards/next/${userId}?count=${count}`);
    if (!res.ok) throw new Error('Failed to fetch next cards');
    return await res.json();
  }

  /**
   * Queue Management: Trigger backend AI queue pre-generation.
   * Call this on app start.
   */
  async prefillQueue(): Promise<QueuePrefillResponse> {
    const userId = await this.getUserId();
    const res = await fetch(`${BACKEND_URL}/api/queue/prefill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error('Failed to prefill queue');
    return await res.json();
  }

  /**
   * Slow-Path: Get user IELTS level based on swipes.
   */
  async getUserLevel(forceRecalculate = false): Promise<UserLevelResponse> {
    const userId = await this.getUserId();
    const res = await fetch(`${BACKEND_URL}/api/level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId,
        force_recalculate: forceRecalculate
      }),
    });
    if (!res.ok) throw new Error('Failed to get user level');
    return await res.json();
  }
}

export const api = new ApiClient();
