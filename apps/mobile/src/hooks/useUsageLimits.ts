import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePurchases } from '@/src/context/PurchasesContext';
import { useSettings } from '@/src/context/SettingsContext';

const STORAGE_KEY = '@vocally/usageLimits';

export const NEW_WORDS_LIMIT = 5;
export const GRAMMAR_LESSONS_LIMIT = 3;
export const QUIZ_SESSIONS_LIMIT = 3;
export const VOICE_SESSIONS_LIMIT = 3;

interface DailyData {
  date: string;
  newWords: number;
  grammarLessons: number;
  quizSessions: number;
  voiceSessions: number;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadData(): Promise<DailyData> {
  const today = getToday();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data: DailyData = JSON.parse(raw);
      if (data.date === today) {
        return {
          date: today,
          newWords: data.newWords ?? 0,
          grammarLessons: data.grammarLessons ?? 0,
          quizSessions: data.quizSessions ?? 0,
          voiceSessions: data.voiceSessions ?? 0,
        };
      }
    } catch {}
  }
  return { date: today, newWords: 0, grammarLessons: 0, quizSessions: 0, voiceSessions: 0 };
}

export function useUsageLimits() {
  const { isPro } = usePurchases();
  const { dailyGoal } = useSettings();
  const wordsLimit = isPro ? dailyGoal : NEW_WORDS_LIMIT;
  const [data, setData] = useState<DailyData>({
    date: getToday(),
    newWords: 0,
    grammarLessons: 0,
    quizSessions: 0,
    voiceSessions: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: DailyData) => {
    setData(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const canLearnNewWord = useCallback(
    () => data.newWords < wordsLimit,
    [data.newWords, wordsLimit],
  );

  const canDoGrammarLesson = useCallback(
    () => isPro || data.grammarLessons < GRAMMAR_LESSONS_LIMIT,
    [isPro, data.grammarLessons],
  );

  const canDoQuiz = useCallback(
    () => isPro || data.quizSessions < QUIZ_SESSIONS_LIMIT,
    [isPro, data.quizSessions],
  );

  const canUseVoiceSession = useCallback(
    () => isPro || data.voiceSessions < VOICE_SESSIONS_LIMIT,
    [isPro, data.voiceSessions],
  );

  const incrementNewWords = useCallback(async () => {
    const current = await loadData();
    const next = { ...current, newWords: current.newWords + 1 };
    await persist(next);
  }, [persist]);

  const incrementGrammarLessons = useCallback(async () => {
    const current = await loadData();
    const next = { ...current, grammarLessons: current.grammarLessons + 1 };
    await persist(next);
  }, [persist]);

  const incrementQuizSessions = useCallback(async () => {
    const current = await loadData();
    const next = { ...current, quizSessions: current.quizSessions + 1 };
    await persist(next);
  }, [persist]);

  const incrementVoiceSessions = useCallback(async () => {
    const current = await loadData();
    const next = { ...current, voiceSessions: current.voiceSessions + 1 };
    await persist(next);
  }, [persist]);

  return {
    newWordsToday: data.newWords,
    wordsLimit,
    grammarLessonsToday: data.grammarLessons,
    quizSessionsToday: data.quizSessions,
    voiceSessionsToday: data.voiceSessions,
    voiceSessionsLimit: VOICE_SESSIONS_LIMIT,
    canLearnNewWord,
    canDoGrammarLesson,
    canDoQuiz,
    canUseVoiceSession,
    incrementNewWords,
    incrementGrammarLessons,
    incrementQuizSessions,
    incrementVoiceSessions,
    isPro,
    loaded,
  };
}
