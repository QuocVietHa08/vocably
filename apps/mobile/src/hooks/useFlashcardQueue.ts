import { useState, useCallback, useEffect, useRef } from 'react';
import type { Flashcard } from '@/src/data/flashcards';
import { allCards } from '@/src/data/flashcards';
import { api, BACKEND_URL } from '@/src/lib/api';

const QUEUE_THRESHOLD = 5;
const FETCH_COUNT = 10;

function shuffleSlice<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// Map API card shape (snake_case) to the Flashcard interface
function apiCardToFlashcard(c: Record<string, any>): Flashcard {
  return {
    id: c.flashcard_id ?? c.id,
    word: c.word,
    phonetic: c.phonetic,
    partOfSpeech: c.part_of_speech,
    definition: c.definition,
    example: c.example,
    examples: c.examples,
    difficulty: c.difficulty ?? 'medium',
    category: c.category ?? 'vocabulary',
    band: c.band,
    synonyms: c.synonyms,
    tip: c.tip,
  };
}

export function useFlashcardQueue() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const isFetchingRef = useRef(false);
  const usedLocalIdsRef = useRef<Set<string>>(new Set());

  // ── Fetch from backend ────────────────────────────────────────
  const fetchNextBatch = useCallback(async (): Promise<boolean> => {
    if (isFetchingRef.current) return false;
    isFetchingRef.current = true;
    try {
      const res = await api.getNextCards(FETCH_COUNT);
      if (res.cards && res.cards.length > 0) {
        const mapped = (res.cards as Record<string, any>[]).map(apiCardToFlashcard);
        setCards((prev) => {
          const newCards = mapped.filter((c) => !prev.some((p) => p.id === c.id));
          return [...prev, ...newCards];
        });
        setUsingLocalFallback(false);
        return true;
      }
      return false;
    } catch (e) {
      // Backend unreachable — silently fall through (initializeQueue handles fallback)
      console.warn('[Queue] Failed to fetch batch from backend:', e);
      return false;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // ── Local fallback: load from bundled card data ───────────────
  const loadLocalFallback = useCallback(() => {
    const unused = allCards.filter((c) => !usedLocalIdsRef.current.has(c.id));
    const batch = shuffleSlice(unused.length > 0 ? unused : allCards, FETCH_COUNT);
    batch.forEach((c) => usedLocalIdsRef.current.add(c.id));
    setCards((prev) => {
      const newCards = batch.filter((c) => !prev.some((p) => p.id === c.id));
      return [...prev, ...newCards];
    });
    setUsingLocalFallback(true);
    setMessage('Showing local cards — backend is offline');
  }, []);

  // ── Initialize ────────────────────────────────────────────────
  const initializeQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!BACKEND_URL) {
      // No backend URL configured at all — go straight to local
      loadLocalFallback();
      setLoading(false);
      return;
    }

    try {
      // Trigger background prefill (non-blocking failure OK)
      const prefillRes = await api.prefillQueue();
      if (prefillRes.message) setMessage(prefillRes.message);

      // We poll up to 3 times for the queue to generate cards
      let retries = 3;
      while (retries > 0) {
        const gotCards = await fetchNextBatch();
        if (gotCards) break;
        
        await new Promise((resolve) => setTimeout(resolve, 1500));
        retries--;
      }
      
      // If still empty after polling, fall back to local (only if backend is truly failing to produce cards)
      setCards((prev) => {
        if (prev.length === 0) {
          loadLocalFallback();
        }
        return prev;
      });
    } catch (e) {
      console.warn('[Queue] Backend unavailable, using local cards:', e);
      loadLocalFallback();
    } finally {
      setLoading(false);
    }
  }, [fetchNextBatch, loadLocalFallback]);

  // Initial load
  useEffect(() => {
    void initializeQueue();
  }, [initializeQueue]);

  // Auto-refill when running low
  useEffect(() => {
    if (loading || cards.length === 0) return;
    if (cards.length < QUEUE_THRESHOLD) {
      if (usingLocalFallback) {
        loadLocalFallback();
      } else {
        void fetchNextBatch();
      }
    }
  }, [cards.length, loading, usingLocalFallback, fetchNextBatch, loadLocalFallback]);

  const swipeCard = useCallback(
    (cardId: string, direction: 'right' | 'left' | 'up', responseTimeMs: number) => {
      if (!usingLocalFallback) {
        void api.recordSwipe(cardId, direction, responseTimeMs);
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    },
    [usingLocalFallback],
  );

  return {
    cards,
    currentCard: cards.length > 0 ? cards[0] : null,
    totalRemaining: cards.length,
    loading,
    error,
    message,
    usingLocalFallback,
    swipeCard,
    refetch: initializeQueue,
  };
}
