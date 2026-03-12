import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import type { Flashcard } from '@/src/data/flashcards';

const { width: SCREEN_W } = Dimensions.get('window');

interface ResultsScreenProps {
  known:    number;
  learning: number;
  total:    number;
  allCards: Flashcard[];
  onRestart:     () => void;
  onRetryMissed: (missed: Flashcard[]) => void;
}

export function ResultsScreen({ known, learning, total, allCards, onRestart, onRetryMissed }: ResultsScreenProps) {
  const t = useTheme();
  const pct = total > 0 ? Math.round((known / total) * 100) : 0;
  const missedCards = allCards.slice(known); // approximate missed

  const barWidth = useSharedValue(0);
  const fade     = useSharedValue(0);

  useEffect(() => {
    fade.value     = withTiming(1, { duration: 300 });
    barWidth.value = withDelay(200, withTiming(pct / 100, { duration: 700 }));
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 16 }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Score circle */}
      <View style={[styles.scoreCircle, { borderColor: t.accent }]}>
        <Text style={[styles.scoreNumber, { color: t.fg }]}>{pct}%</Text>
        <Text style={[styles.scoreLabel, { color: t.muted }]}>known</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.statNum, { color: '#22c55e' }]}>{known}</Text>
          <Text style={[styles.statLbl, { color: t.muted }]}>Know it</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{learning}</Text>
          <Text style={[styles.statLbl, { color: t.muted }]}>Learning</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.statNum, { color: t.fg }]}>{total}</Text>
          <Text style={[styles.statLbl, { color: t.muted }]}>Total</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.barBg, { backgroundColor: t.subtle }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: t.accent }, barStyle]} />
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {learning > 0 && (
          <Pressable
            style={[styles.btn, styles.btnPrimary, { backgroundColor: t.accent }]}
            onPress={() => onRetryMissed(missedCards)}
          >
            <Text style={styles.btnPrimaryText}>Retry missed ({learning})</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.btn, styles.btnSecondary, { borderColor: t.border }]}
          onPress={onRestart}
        >
          <Text style={[styles.btnSecondaryText, { color: t.fg }]}>Start over</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 28,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    width: SCREEN_W - 48,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  barBg: {
    width: SCREEN_W - 48,
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  buttons: {
    width: SCREEN_W - 48,
    gap: 10,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimary: {},
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontWeight: '500',
    fontSize: 15,
  },
});
