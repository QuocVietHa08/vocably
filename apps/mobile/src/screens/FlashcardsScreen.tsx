import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ttsStop } from '@/src/lib/openaiTts';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { SwipeDeck, type SwipeDeckHandle } from '@/src/components/flashcard/SwipeDeck';
import { ResultsScreen } from '@/src/components/flashcard/ResultsScreen';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useLearnedWords } from '@/src/hooks/useLearnedWords';
import { useUsageLimits } from '@/src/hooks/useUsageLimits';
import { useT } from '@/src/i18n/useT';
import { ActionButton } from '@/src/components/ActionButton';
import { DrawerMenu, BurgerIcon } from '@/src/components/DrawerMenu';
import { FilterTabs, type FilterMode } from '@/src/components/FilterTabs';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useFlashcardQueue } from '@/src/hooks/useFlashcardQueue';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type FlashcardsScreenProps = {
  initialFilterMode?: FilterMode;
};

export function FlashcardsScreen({ initialFilterMode = 'all' }: FlashcardsScreenProps) {
  const t        = useTheme();
  const T        = useT();
  const router   = useRouter();
  const { favoriteIds, isFavorite, toggleFavorite, loaded } = useFavorites();
  const { markLearned, isLearned } = useLearnedWords();
  const { canLearnNewWord, incrementNewWords, newWordsToday, wordsLimit } = useUsageLimits();
  const deckRef = useRef<SwipeDeckHandle>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode);
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

  const favoritesEmpty = filterMode === 'favorites' && loaded && localFavCards.length === 0;

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
      setFilterMode('favorites');
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

  function openDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(false);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

        {/* ── Header: menu | filter | counter ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.burgerBtn} onPress={openDrawer} hitSlop={10}>
              <BurgerIcon isOpen={drawerOpen} color={t.fg} />
            </Pressable>
          </View>

          <View style={styles.headerFilter}>
            <FilterTabs filterMode={filterMode} onChange={setFilterMode} />
          </View>

          <View style={styles.counter}>
            <View style={[styles.dot, { backgroundColor: t.accent }]} />
            <Text style={[styles.counterNum, { color: t.fg }]}>{newWordsToday}</Text>
            <Text style={[styles.counterTotal, { color: t.muted }]}>/{wordsLimit}</Text>
          </View>
        </View>

        {/* Empty favorites message */}
        {favoritesEmpty && (
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
          ) : currentCard && !favoritesEmpty ? (
            <SwipeDeck
              ref={deckRef}
              cards={filterMode === 'all'
                ? queue.cards
                : localFavCards.slice(localFavIndex)}
              onSwipe={(_card, direction) => {
                console.log('[Home] deck swipe:', direction, _card.id);
                advance(direction === 'right' ? 'know' : 'dontknow');
              }}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : null}
        </View>

        {/* ── Action button bar ── */}
        {!done && currentCard && !favoritesEmpty && (
          <Animated.View entering={FadeIn} style={styles.actionCluster}>
            <View style={styles.decisionRow}>
              <ActionButton
                variant="dontknow"
                size="decision"
                onPress={() => deckRef.current?.swipeLeft()}
              />
              <ActionButton
                variant="know"
                size="decision"
                onPress={() => deckRef.current?.swipeRight()}
              />
            </View>

            <View style={styles.utilityRow}>
              <ActionButton
                variant="favorite"
                size="utility"
                label="Love"
                active={isFavorite(currentCard.id)}
                onPress={handleToggleFavorite}
              />
              <ActionButton
                variant="flip"
                size="utility"
                label="Flip"
                onPress={() => deckRef.current?.flip()}
              />
              <ActionButton
                variant="voice"
                size="utility"
                label="Voice"
                onPress={() => deckRef.current?.speak()}
              />
            </View>
          </Animated.View>
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
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 14, paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  burgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFilter: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
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

  content: { flex: 1, justifyContent: 'center', paddingBottom: 8 },

  /* Action cluster */
  actionCluster: {
    gap: 8,
    paddingTop: 0,
    paddingBottom: 10,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
    marginTop: -12,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  swipeHint: { paddingBottom: 20, alignItems: 'center' },
  swipeHintText: { fontSize: 12, opacity: 0.6 },
});
