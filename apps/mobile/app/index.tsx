import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
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

  function openDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(false);
  }

  const [cards,       setCards]       = useState<Flashcard[]>(() => shuffle(allCards));
  const [index,       setIndex]       = useState(0);
  const [known,       setKnown]       = useState(0);
  const [learning,    setLearning]    = useState(0);
  const [done,        setDone]        = useState(false);
  const [missedCards, setMissedCards] = useState<Flashcard[]>([]);

  // Re-build deck when filter changes
  useEffect(() => {
    if (!loaded) return;
    const source = filterMode === 'favorites'
      ? allCards.filter((c) => favoriteIds.has(c.id))
      : allCards;
    setCards(shuffle(source.length > 0 ? source : allCards));
    setIndex(0); setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
  }, [filterMode, loaded]);

  const currentCard = cards[index];
  const total       = cards.length;
  const favCount    = favoriteIds.size;

  const advance = useCallback((result: 'know' | 'dontknow') => {
    ttsStop();
    const card = cards[index];
    if (result === 'know') {
      const isNewWord = !isLearned(card.id);
      if (isNewWord && !canLearnNewWord()) {
        router.push('/paywall?reason=words');
        return;
      }
      setKnown((n) => n + 1);
      void markLearned(card.id);
      if (isNewWord) void incrementNewWords();
    } else {
      setLearning((n) => n + 1);
      setMissedCards((prev) => [...prev, card]);
    }
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total, cards, markLearned, isLearned, canLearnNewWord, incrementNewWords, router]);

  const restart = () => {
    ttsStop();
    const source = filterMode === 'favorites'
      ? allCards.filter((c) => favoriteIds.has(c.id))
      : allCards;
    setCards(shuffle(source.length > 0 ? source : allCards));
    setIndex(0); setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
  };

  const retryMissed = (missed: Flashcard[]) => {
    ttsStop();
    setCards(shuffle(missed));
    setIndex(0); setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
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

        {/* ── Flash card / results ── */}
        <View style={styles.content}>
          {done ? (
            <ResultsScreen
              known={known}
              learning={learning}
              total={total}
              allCards={cards}
              onRestart={restart}
              onRetryMissed={retryMissed}
            />
          ) : currentCard && !(filterMode === 'favorites' && favCount === 0) ? (
            <Animated.View
              key={index}
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
