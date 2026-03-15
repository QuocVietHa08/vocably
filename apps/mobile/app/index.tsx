import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeOutLeft, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ttsStop } from '@/src/lib/openaiTts';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { FlashCard } from '@/src/components/flashcard/FlashCard';
import { ResultsScreen } from '@/src/components/flashcard/ResultsScreen';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useLearnedWords } from '@/src/hooks/useLearnedWords';
import { useSettings } from '@/src/context/SettingsContext';
import { useT } from '@/src/i18n/useT';
import { Mic, Settings2, BookOpen, RefreshCw, Dumbbell, ChevronRight } from 'lucide-react-native';
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
  const { markLearned } = useLearnedWords();

  const [filterMode,  setFilterMode]  = useState<FilterMode>('all');
  const [autoRepeat,  setAutoRepeat]  = useState(false);

  const [cards,    setCards]    = useState<Flashcard[]>(() => shuffle(allCards));
  const [index,    setIndex]    = useState(0);
  const [known,    setKnown]    = useState(0);
  const [learning, setLearning] = useState(0);
  const [done,     setDone]     = useState(false);
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
      setKnown((n) => n + 1);
      // Persist this word as learned
      void markLearned(card.id);
    } else {
      setLearning((n) => n + 1);
      setMissedCards((prev) => [...prev, card]);
    }
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total, cards, markLearned]);

  // Auto-repeat: when done, if there are missed cards and repeat is on → loop
  useEffect(() => {
    if (done && autoRepeat && missedCards.length > 0) {
      const timer = setTimeout(() => {
        setCards(shuffle(missedCards));
        setIndex(0); setKnown(0); setLearning(0); setDone(false); setMissedCards([]);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [done, autoRepeat, missedCards]);

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

  // ── Filter bar item ──
  const FilterBtn = ({ mode, label, count }: { mode: FilterMode; label: string; count?: number }) => {
    const active = filterMode === mode;
    return (
      <Pressable
        style={[styles.filterBtn, active && { backgroundColor: t.accent }]}
        onPress={() => setFilterMode(mode)}
      >
        <Text style={[styles.filterBtnText, { color: active ? '#fff' : t.muted }]}>
          {label}{count !== undefined ? ` (${count})` : ''}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.navBtns}>
            <Pressable
              style={[styles.navBtn, { borderColor: t.border }]}
              onPress={() => router.push('/practice')}
            >
              <Mic size={14} color={t.muted} strokeWidth={2.5} />
              <Text style={[styles.navBtnText, { color: t.muted }]}>{T.speakingBtn}</Text>
            </Pressable>
            <Pressable
              style={[styles.navBtn, { borderColor: t.border }]}
              onPress={() => router.push('/grammar')}
            >
              <BookOpen size={14} color={t.muted} strokeWidth={2.5} />
              <Text style={[styles.navBtnText, { color: t.muted }]}>{T.grammarBtn}</Text>
            </Pressable>
          </View>

          <View style={styles.counter}>
            <View style={[styles.dot, { backgroundColor: t.accent }]} />
            <Text style={[styles.counterNum, { color: t.fg }]}>
              {done ? total : index + 1}
            </Text>
            <Text style={[styles.counterTotal, { color: t.muted }]}>/{total}</Text>
          </View>

          <Pressable
            style={[styles.settingsBtn, { borderColor: t.border }]}
            onPress={() => router.push('/settings')}
          >
            <Settings2 size={18} color={t.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Toolbar: filter + toggles ── */}
        <View style={styles.toolbar}>
          {/* Filter pills */}
          <View style={[styles.filterBar, { backgroundColor: t.subtle, borderColor: t.border }]}>
            <FilterBtn mode="all"       label={T.filterAll} />
            <FilterBtn mode="favorites" label={T.filterSaved} count={favCount > 0 ? favCount : undefined} />
          </View>

          {/* Auto-repeat toggle */}
          <Pressable
            style={[styles.toggleBtn, { borderColor: autoRepeat ? t.accent : t.border }]}
            onPress={() => setAutoRepeat((v) => !v)}
            hitSlop={8}
          >
            <RefreshCw size={15} color={autoRepeat ? t.accent : t.muted} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ── Practice entry strip ── */}
        <Pressable
          style={[styles.practiceStrip, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => router.push('/quiz')}
        >
          <View style={[styles.practiceIconWrap, { backgroundColor: `${t.accent}18` }]}>
            <Dumbbell size={16} color={t.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.practiceInfo}>
            <Text style={[styles.practiceTitle, { color: t.fg }]}>{T.practiceTitle}</Text>
            <Text style={[styles.practiceSub, { color: t.muted }]}>{T.practiceSub}</Text>
          </View>
          <ChevronRight size={16} color={t.muted} strokeWidth={2.5} />
        </Pressable>

        {/* Empty favorites message */}
        {filterMode === 'favorites' && favCount === 0 && (
          <Animated.View entering={FadeIn} style={styles.emptyFav}>
            <Text style={[styles.emptyFavIcon]}>🤍</Text>
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
                card={currentCard}
                onKnow={() => advance('know')}
                onDontKnow={() => advance('dontknow')}
                isFavorite={isFavorite(currentCard.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* Swipe hint + repeat badge */}
        {!done && index === 0 && !(filterMode === 'favorites' && favCount === 0) && (
          <View style={styles.swipeHint}>
            <Text style={[styles.swipeHintText, { color: t.muted }]}>{T.swipeHint}</Text>
          </View>
        )}

        {/* Auto-repeat notice */}
        {autoRepeat && !done && (
          <View style={styles.repeatBadge}>
            <RefreshCw size={10} color={t.accent} strokeWidth={2.5} />
            <Text style={[styles.repeatBadgeText, { color: t.accent }]}>{T.repeatOn}</Text>
          </View>
        )}

      </View>
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
  navBtns:    { flexDirection: 'row', gap: 8 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  navBtnText: { fontSize: 13, fontFamily: F.medium },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginBottom: 2, marginRight: 2 },
  counterNum: { fontSize: 22, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  counterTotal: { fontSize: 14 },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  filterBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  filterBtnText: { fontSize: 12, fontFamily: F.semibold },
  toggleBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Practice entry strip */
  practiceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  practiceIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  practiceInfo: { flex: 1, gap: 2 },
  practiceTitle: { fontSize: 14, fontFamily: F.bold },
  practiceSub:   { fontSize: 11, fontFamily: F.medium },

  /* Empty favorites */
  emptyFav: {
    alignItems: 'center', gap: 6, paddingTop: 60,
  },
  emptyFavIcon: { fontSize: 32 },
  emptyFavText: { fontSize: 15, fontFamily: F.semibold },
  emptyFavHint: { fontSize: 12, opacity: 0.7 },

  content: { flex: 1, justifyContent: 'center' },

  swipeHint: { paddingBottom: 24, alignItems: 'center' },
  swipeHintText: { fontSize: 12, opacity: 0.6 },

  repeatBadge: {
    position: 'absolute', bottom: 28, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  repeatBadgeText: { fontSize: 10, fontFamily: F.semibold, letterSpacing: 0.4 },
});
