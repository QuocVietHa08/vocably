import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import type { Flashcard } from '@/src/data/flashcards';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.18; // distance threshold
const FLICK_VELOCITY  = 500;              // px/s — short fast swipe also triggers
const CARD_W = SCREEN_W - 48;
const CARD_H = 420;

interface FlashCardProps {
  card:       Flashcard;
  onKnow:     () => void;
  onDontKnow: () => void;
}

export function FlashCard({ card, onKnow, onDontKnow }: FlashCardProps) {
  const t       = useTheme();
  const [flipped, setFlipped] = useState(false);

  const translateX   = useSharedValue(0);
  const translateY   = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const dragProgress = useSharedValue(0); // 0 = centre, 1 = right, -1 = left

  const flyOut = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetX = direction === 'right' ?  SCREEN_W * 1.6 : -SCREEN_W * 1.6;
    const targetY = -CARD_H * 0.15; // slight upward arc
    translateX.value = withTiming(targetX, { duration: 480, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(direction === 'right' ? onKnow : onDontKnow)();
    });
    translateY.value = withTiming(targetY, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [onKnow, onDontKnow, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      translateX.value   = e.translationX;
      translateY.value   = e.translationY * 0.12;
      dragProgress.value = e.translationX / SCREEN_W;
    })
    .onEnd((e) => {
      const isRightFlick = e.velocityX >  FLICK_VELOCITY && e.translationX > 10;
      const isLeftFlick  = e.velocityX < -FLICK_VELOCITY && e.translationX < -10;

      if (e.translationX > SWIPE_THRESHOLD || isRightFlick)       runOnJS(flyOut)('right');
      else if (e.translationX < -SWIPE_THRESHOLD || isLeftFlick)  runOnJS(flyOut)('left');
      else {
        translateX.value   = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
        translateY.value   = withSpring(0, { damping: 18, stiffness: 220 });
        dragProgress.value = withSpring(0);
      }
    });

  // Card transforms
  const cardStyle = useAnimatedStyle(() => {
    const rot    = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-22, 22]);
    const scaleX = interpolate(Math.abs(translateX.value), [0, SCREEN_W * 0.5], [1, 0.96], 'clamp');
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rot}deg` },
        { scale: scaleX },
      ],
    };
  });

  // Label opacity + scale — appear smoothly
  const knowStyle = useAnimatedStyle(() => {
    const prog = interpolate(translateX.value, [20, 90], [0, 1], 'clamp');
    return { opacity: prog, transform: [{ scale: interpolate(prog, [0, 1], [0.6, 1]) }, { rotate: '12deg' }] };
  });
  const dontKnowStyle = useAnimatedStyle(() => {
    const prog = interpolate(translateX.value, [-20, -90], [0, 1], 'clamp');
    return { opacity: prog, transform: [{ scale: interpolate(prog, [0, 1], [0.6, 1]) }, { rotate: '-12deg' }] };
  });

  // 3D flip
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const handleFlip = useCallback(() => {
    Haptics.selectionAsync();
    flipProgress.value = withTiming(flipped ? 0 : 1, {
      duration: 360,
      easing: Easing.inOut(Easing.quad),
    });
    setFlipped(!flipped);
  }, [flipped, flipProgress]);

  const diffColor = card.difficulty === 'hard' ? '#ef4444' : card.difficulty === 'medium' ? '#f59e0b' : '#22c55e';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        {/* Labels */}
        <Animated.View style={[styles.label, styles.knowLabel, knowStyle]}>
          <Text style={styles.knowText}>KNOW ✓</Text>
        </Animated.View>
        <Animated.View style={[styles.label, styles.dontKnowLabel, dontKnowStyle]}>
          <Text style={styles.dontKnowText}>AGAIN ↺</Text>
        </Animated.View>

        <Pressable onPress={handleFlip} style={styles.pressable}>
          {/* Front */}
          <Animated.View style={[styles.face, { backgroundColor: t.surface, borderColor: t.border }, frontStyle]}>
            <View style={styles.meta}>
              {card.band && (
                <View style={[styles.pill, { backgroundColor: t.subtle }]}>
                  <Text style={[styles.pillText, { color: t.muted }]}>Band {card.band}</Text>
                </View>
              )}
              <View style={[styles.pill, { backgroundColor: t.subtle }]}>
                <Text style={[styles.pillText, { color: t.muted }]}>{card.category}</Text>
              </View>
              <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            </View>

            <View style={styles.centreContent}>
              <Text style={[styles.word, { color: t.fg }]}>{card.word}</Text>
              {card.phonetic     && <Text style={[styles.phonetic, { color: t.muted }]}>{card.phonetic}</Text>}
              {card.partOfSpeech && <Text style={[styles.pos, { color: t.accent }]}>{card.partOfSpeech}</Text>}
            </View>
            <Text style={[styles.hint, { color: t.muted }]}>tap to reveal · swipe to rate</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[styles.face, { backgroundColor: t.surface, borderColor: t.border }, backStyle]}>
            <View style={styles.backContent}>
              <Text style={[styles.backWord, { color: t.fg }]}>{card.word}</Text>
              <View style={[styles.divider, { backgroundColor: t.border }]} />
              <Text style={[styles.definition, { color: t.fg }]}>{card.definition}</Text>
              <Text style={[styles.example, { color: t.muted }]}>"{card.example}"</Text>
              {card.tip && (
                <View style={[styles.tipBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
                  <Text style={[styles.tipText, { color: t.muted }]}>💡 {card.tip}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardWrapper:   { width: CARD_W, height: CARD_H, alignSelf: 'center' },
  pressable:     { flex: 1 },
  face: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1, padding: 24,
    justifyContent: 'space-between', overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  meta:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText:      { fontSize: 11, fontFamily: F.medium },
  diffDot:       { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
  centreContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  word:          { fontSize: 38, fontFamily: F.bold, letterSpacing: -1, textAlign: 'center' },
  phonetic:      { fontSize: 16, textAlign: 'center' },
  pos:           { fontSize: 13, fontFamily: F.medium, textTransform: 'lowercase' },
  hint:          { fontSize: 11, textAlign: 'center', opacity: 0.45 },
  backContent:   { flex: 1, justifyContent: 'center', gap: 12 },
  backWord:      { fontSize: 22, fontFamily: F.bold, letterSpacing: -0.5 },
  divider:       { height: 1 },
  definition:    { fontSize: 15, lineHeight: 22, fontFamily: F.medium },
  example:       { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  tipBox:        { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 4 },
  tipText:       { fontSize: 12, lineHeight: 18 },
  label: {
    position: 'absolute', top: 22, zIndex: 10,
    borderRadius: 8, borderWidth: 2,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  knowLabel:     { right: 20, borderColor: '#22c55e' },
  dontKnowLabel: { left: 20,  borderColor: '#ef4444' },
  knowText:      { color: '#22c55e', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
  dontKnowText:  { color: '#ef4444', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
});
