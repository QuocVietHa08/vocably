import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEARNED_KEY = '@vocally/learnedWords';

/**
 * Tracks words the user has marked as "know" during flashcard sessions.
 * Persists to AsyncStorage so learned words survive app restarts.
 */
export function useLearnedWords() {
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LEARNED_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setLearnedIds(new Set(ids));
        } catch (_) {}
      }
      setLoaded(true);
    });
  }, []);

  const markLearned = useCallback(async (id: string) => {
    setLearnedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(LEARNED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const unmarkLearned = useCallback(async (id: string) => {
    setLearnedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      AsyncStorage.setItem(LEARNED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isLearned = useCallback((id: string) => learnedIds.has(id), [learnedIds]);

  const clearAll = useCallback(async () => {
    setLearnedIds(new Set());
    await AsyncStorage.removeItem(LEARNED_KEY);
  }, []);

  return { learnedIds, isLearned, markLearned, unmarkLearned, clearAll, loaded };
}
