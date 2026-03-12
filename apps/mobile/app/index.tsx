import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { FlashCard } from '@/src/components/flashcard/FlashCard';
import { ResultsScreen } from '@/src/components/flashcard/ResultsScreen';
import { useTheme } from '@/src/theme';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();

  const [cards, setCards]       = useState<Flashcard[]>(() => shuffle(allCards));
  const [index, setIndex]       = useState(0);
  const [known, setKnown]       = useState(0);
  const [learning, setLearning] = useState(0);
  const [done, setDone]         = useState(false);

  const currentCard = cards[index];
  const total       = cards.length;

  const advance = useCallback((result: 'know' | 'dontknow') => {
    if (result === 'know') setKnown((n) => n + 1);
    else setLearning((n) => n + 1);
    if (index + 1 >= total) setDone(true);
    else setIndex((i) => i + 1);
  }, [index, total]);

  const restart = () => {
    setCards(shuffle(allCards));
    setIndex(0); setKnown(0); setLearning(0); setDone(false);
  };

  const retryMissed = (missed: Flashcard[]) => {
    setCards(shuffle(missed));
    setIndex(0); setKnown(0); setLearning(0); setDone(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.speakingBtn, { borderColor: t.border }]}
            onPress={() => router.push('/practice')}
          >
            {/* Mic icon */}
            <Text style={[styles.speakingBtnText, { color: t.muted }]}>🎙 Speaking</Text>
          </Pressable>

          <View style={styles.counter}>
            <View style={[styles.dot, { backgroundColor: t.accent }]} />
            <Text style={[styles.counterNum, { color: t.fg }]}>
              {done ? total : index + 1}
            </Text>
            <Text style={[styles.counterTotal, { color: t.muted }]}>/{total}</Text>
          </View>
        </View>

        {/* Content */}
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
          ) : currentCard ? (
            <Animated.View
              key={index}
              entering={FadeInRight.duration(180)}
              exiting={FadeOutLeft.duration(180)}
            >
              <FlashCard
                card={currentCard}
                onKnow={() => advance('know')}
                onDontKnow={() => advance('dontknow')}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* Swipe hint (shown on first card only) */}
        {!done && index === 0 && (
          <View style={styles.swipeHint}>
            <Text style={[styles.swipeHintText, { color: t.muted }]}>
              ← swipe to review · swipe to mark known →
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  speakingBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  speakingBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 2,
    marginRight: 2,
  },
  counterNum: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  counterTotal: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  swipeHint: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    opacity: 0.6,
  },
});
