import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInRight, FadeOutLeft, FadeIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ttsStop } from '@/src/lib/openaiTts';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { FlashCard, type FlashCardRef } from '@/src/components/flashcard/FlashCard';
import { ResultsScreen } from '@/src/components/flashcard/ResultsScreen';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useLearnedWords } from '@/src/hooks/useLearnedWords';
import { useUsageLimits } from '@/src/hooks/useUsageLimits';
import { useSettings } from '@/src/context/SettingsContext';
import { useT } from '@/src/i18n/useT';
import { DrawerMenu, BurgerIcon } from '@/src/components/DrawerMenu';
import { FilterTabs } from '@/src/components/FilterTabs';
import { ActionButton } from '@/src/components/ActionButton';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useFlashcardQueue } from '@/src/hooks/useFlashcardQueue';

const { width: SCREEN_W } = Dimensions.get('window');

type FilterMode = 'all' | 'favorites';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HomeScreen() {
  const t        = useTheme();
  const T        = useT();
  const router   = useRouter();
  const { nativeLanguage } = useSettings();
  const { favoriteIds, isFavorite, toggleFavorite, loaded } = useFavorites();
  const { markLearned, isLearned } = useLearnedWords();
  const { canLearnNewWord, incrementNewWords, newWordsToday, wordsLimit, isPro } = useUsageLimits();
  const flashCardRef = useRef<FlashCardRef>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Stats for the "ResultsScreen" at the end of a session
  const [known,       setKnown]       = useState(0);
  const [learning,    setLearning]    = useState(0);
  const [done,        setDone]        = useState(false);
  const [missedCards, setMissedCards] = useState<Flashcard[]>([]);

  // Local state for 'favorites' mode
  const [localFavCards, setLocalFavCards] = useState<Flashcard[]>([]);
  const [localFavIndex, setLocalFavIndex] = useState(0);

  // Network queue for 'all' mode
  const queue = useFlashcardQueue();
  const cardStartTimeRef = useRef<number>(Date.now());

  function openDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(false);
  }

  // Re-build favorites deck if filter changed to favorites
  useEffect(() => {
    if (!loaded) return;
    if (filterMode === 'favorites') {
      const source = allCards.filter(c => favoriteIds.has(c.id));
      setLocalFavCards(shuffle(source));
      setLocalFavIndex(0);
    }
    setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
  }, [filterMode, loaded]);

  // Track the time a card appears so we can measure response time
  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [filterMode === 'all' ? queue.currentCard?.id : localFavCards[localFavIndex]?.id]);

  const currentCard = filterMode === 'all' 
    ? queue.currentCard 
    : localFavCards[localFavIndex];

  const total = filterMode === 'all' 
    ? queue.totalRemaining + known + learning // Approximate total session length
    : localFavCards.length;

  const favCount = favoriteIds.size;

  const advance = useCallback((result: 'know' | 'dontknow') => {
    ttsStop();
    if (!currentCard) return;

    const isNewWord = !isLearned(currentCard.id);
    if (result === 'know') {
      if (isNewWord && !canLearnNewWord()) {
        router.push('/paywall?reason=words');
        return;
      }
      setKnown(n => n + 1);
      void markLearned(currentCard.id);
      if (isNewWord) void incrementNewWords();
    } else {
      setLearning(n => n + 1);
      setMissedCards(prev => [...prev, currentCard]);
    }

    const responseTime = Date.now() - cardStartTimeRef.current;

    if (filterMode === 'all') {
      // API powered backend queue — swipe removes card from array
      queue.swipeCard(currentCard.id, result === 'know' ? 'right' : 'left', responseTime);
      cardStartTimeRef.current = Date.now();
      // Trigger done only in local fallback when the last card is swiped
      if (queue.usingLocalFallback && queue.totalRemaining <= 1) {
        setDone(true);
      }
    } else {
      // Static favorites queue
      if (localFavIndex + 1 >= localFavCards.length) {
        setDone(true);
      } else {
        setLocalFavIndex(i => i + 1);
      }
    }
  }, [filterMode, currentCard, queue, localFavIndex, localFavCards.length, isLearned, canLearnNewWord, incrementNewWords, markLearned, router]);

  const restart = () => {
    ttsStop();
    if (filterMode === 'all') {
      queue.refetch();
    } else {
      const source = allCards.filter(c => favoriteIds.has(c.id));
      setLocalFavCards(shuffle(source));
      setLocalFavIndex(0);
    }
    setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
  };

  const retryMissed = (missed: Flashcard[]) => {
    ttsStop();
    if (filterMode === 'all') {
      // Usually the backend handles missed cards naturally through SRS
      // BUT if we want to manually retry the session's failed cards instantly:
      setFilterMode('favorites'); // Fallback trick, or we just rely on SRS in 'all' mode.
      setLocalFavCards(shuffle(missed));
      setLocalFavIndex(0);
    } else {
      setLocalFavCards(shuffle(missed));
      setLocalFavIndex(0);
    }
    setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
  };

  const handleToggleFavorite = useCallback(() => {
    if (currentCard) toggleFavorite(currentCard.id);
  }, [currentCard, toggleFavorite]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

        {/* ── Header: burger | filter tabs | counter ── */}
        <View style={styles.header}>
          <Pressable style={styles.burgerBtn} onPress={openDrawer} hitSlop={10}>
            <BurgerIcon isOpen={drawerOpen} color={t.fg} />
          </Pressable>

          <FilterTabs filterMode={filterMode} onChange={setFilterMode} />

          <View style={styles.counter}>
            <View style={[styles.dot, { backgroundColor: t.accent }]} />
            <Text style={[styles.counterNum, { color: t.fg }]}>{newWordsToday}</Text>
            <Text style={[styles.counterTotal, { color: t.muted }]}>/{wordsLimit}</Text>
          </View>
        </View>

        {/* Empty favorites message */}
        {filterMode === 'favorites' && favCount === 0 && (
          <Animated.View entering={FadeIn} style={styles.emptyFav}>
            <Text style={styles.emptyFavIcon}>🤍</Text>
            <Text style={[styles.emptyFavText, { color: t.muted }]}>{T.emptyFavText}</Text>
            <Text style={[styles.emptyFavHint, { color: t.muted }]}>{T.emptyFavHint}</Text>
          </Animated.View>
        )}

        {/* Queue loading state */}
        {filterMode === 'all' && queue.loading && !currentCard && (
           <Animated.View entering={FadeIn} style={styles.loadingContainer}>
             <ActivityIndicator size="large" color={t.accent} />
             <Text style={[styles.loadingText, { color: t.muted }]}>{queue.message ?? 'Loading recommendations...'}</Text>
           </Animated.View>
        )}

        {/* ── Flash card / results ── */}
        <View style={styles.content}>
          {done ? (
            <ResultsScreen
              known={known}
              learning={learning}
              total={filterMode === 'all' ? known + learning : total}
              allCards={filterMode === 'all' ? missedCards : localFavCards}
              onRestart={restart}
              onRetryMissed={retryMissed}
            />
          ) : currentCard && !(filterMode === 'favorites' && favCount === 0) ? (
            <Animated.View
              key={currentCard.id}
              entering={FadeInRight.duration(180)}
              exiting={FadeOutLeft.duration(180)}
            >
              <FlashCard
                ref={flashCardRef}
                card={currentCard}
                onKnow={() => advance('know')}
                onDontKnow={() => advance('dontknow')}
                isFavorite={isFavorite(currentCard.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* ── Action button bar ── */}
        {!done && currentCard && !(filterMode === 'favorites' && favCount === 0) && (
          <View style={styles.actionBar}>
            <ActionButton variant="dontknow" onPress={() => flashCardRef.current?.triggerDontKnow()} />
            <ActionButton variant="flip"     onPress={() => flashCardRef.current?.flipCard()} />
            <ActionButton variant="know"     onPress={() => flashCardRef.current?.triggerKnow()} />
          </View>
        )}

        <View style={styles.swipeHint}>
          <Text style={[styles.swipeHintText, { color: t.muted }]}>{T.swipeHint}</Text>
        </View>

      </View>
      <DrawerMenu isOpen={drawerOpen} onClose={closeDrawer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, paddingBottom: 16,
  },
  burgerBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginBottom: 2, marginRight: 2 },
  counterNum: { fontSize: 22, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  counterTotal: { fontSize: 14 },

  /* Empty favorites */
  emptyFav: { alignItems: 'center', gap: 6, paddingTop: 60 },
  emptyFavIcon: { fontSize: 32 },
  emptyFavText: { fontSize: 15, fontFamily: F.semibold },
  emptyFavHint: { fontSize: 12, opacity: 0.7 },

  /* Loading State */
  loadingContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: F.medium },

  content: { flex: 1, justifyContent: 'center' },

  /* Action button bar */
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 14,
    paddingTop: 6,
  },

  swipeHint: { paddingBottom: 24, alignItems: 'center' },
  swipeHintText: { fontSize: 12, opacity: 0.6 },
});

