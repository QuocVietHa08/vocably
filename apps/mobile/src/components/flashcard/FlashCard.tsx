import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
// Use RNGH Pressable — it's gesture-system-aware and works correctly inside GestureDetector
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Volume2, Heart } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import type { Flashcard } from '@/src/data/flashcards';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.18;
const FLICK_VELOCITY  = 500;
const CARD_W = SCREEN_W - 48;
const CARD_H = 420;

interface FlashCardProps {
  card:              Flashcard;
  onKnow:            () => void;
  onDontKnow:        () => void;
  isFavorite?:       boolean;
  onToggleFavorite?: () => void;
  autoSpeak?:        boolean;
  voiceLang?:        string;   // e.g. 'en-US', 'en-GB'
}

/** Stop any in-progress TTS, then speak the given text */
async function ttsSpeak(text: string, slow = false, lang = 'en-US') {
  try {
    await Speech.stop();
    Speech.speak(text, { language: lang, rate: slow ? 0.75 : 0.95, pitch: 1.0 });
  } catch (_) {}
}

export function FlashCard({
  card,
  onKnow,
  onDontKnow,
  isFavorite      = false,
  onToggleFavorite,
  autoSpeak       = false,
  voiceLang       = 'en-US',
}: FlashCardProps) {
  const t       = useTheme();
  const [flipped, setFlipped] = useState(false);

  // ── Shared values ─────────────────────────────────────────────
  const translateX   = useSharedValue(0);
  const translateY   = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  // Heart animation
  const heartScale   = useSharedValue(1);
  const burstScale   = useSharedValue(1);
  const burstOpacity = useSharedValue(0);

  // ── Auto-speak word on mount / card change ─────────────────────
  useEffect(() => {
    if (autoSpeak) {
      const t = setTimeout(() => void ttsSpeak(card.word, false, voiceLang), 500);
      return () => clearTimeout(t);
    }
  }, [card.id, autoSpeak, voiceLang]);

  // ── Heart burst animation when favorited ───────────────────────
  useEffect(() => {
    if (isFavorite) {
      // Bounce the heart
      heartScale.value = withSequence(
        withSpring(1.55, { damping: 3, stiffness: 500, mass: 0.4 }),
        withSpring(1.0,  { damping: 10, stiffness: 200 }),
      );
      // Ring burst
      burstScale.value   = 1;
      burstOpacity.value = 0.6;
      burstScale.value   = withTiming(2.4, { duration: 380, easing: Easing.out(Easing.cubic) });
      burstOpacity.value = withTiming(0,   { duration: 380 });
    } else {
      // Soft shrink on un-save
      heartScale.value = withSequence(
        withTiming(0.75, { duration: 100 }),
        withSpring(1.0,  { damping: 12, stiffness: 200 }),
      );
    }
  }, [isFavorite]);

  // ── Fly-out (swipe to rate) ────────────────────────────────────
  const flyOut = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void Speech.stop();
    const targetX = direction === 'right' ? SCREEN_W * 1.6 : -SCREEN_W * 1.6;
    translateX.value = withTiming(targetX, { duration: 480, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(direction === 'right' ? onKnow : onDontKnow)();
    });
    translateY.value = withTiming(-CARD_H * 0.15, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [onKnow, onDontKnow, translateX, translateY]);

  // ── Pan gesture ────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.12;
    })
    .onEnd((e) => {
      const isRightFlick = e.velocityX >  FLICK_VELOCITY && e.translationX > 10;
      const isLeftFlick  = e.velocityX < -FLICK_VELOCITY && e.translationX < -10;
      if      (e.translationX >  SWIPE_THRESHOLD || isRightFlick) runOnJS(flyOut)('right');
      else if (e.translationX < -SWIPE_THRESHOLD || isLeftFlick)  runOnJS(flyOut)('left');
      else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  // ── Animated styles ────────────────────────────────────────────
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-22, 22])}deg` },
      { scale: interpolate(Math.abs(translateX.value), [0, SCREEN_W * 0.5], [1, 0.96], 'clamp') },
    ],
  }));

  const knowStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [20, 90], [0, 1], 'clamp');
    return { opacity: p, transform: [{ scale: interpolate(p, [0, 1], [0.6, 1]) }, { rotate: '12deg' }] };
  });
  const dontKnowStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [-20, -90], [0, 1], 'clamp');
    return { opacity: p, transform: [{ scale: interpolate(p, [0, 1], [0.6, 1]) }, { rotate: '-12deg' }] };
  });

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity:   burstOpacity.value,
  }));

  // ── Actions ────────────────────────────────────────────────────
  const handleFlip = useCallback(() => {
    Haptics.selectionAsync();
    const toFlipped = !flipped;
    flipProgress.value = withTiming(toFlipped ? 1 : 0, { duration: 360, easing: Easing.inOut(Easing.quad) });
    // Speak definition on reveal, word on flip back
    setTimeout(() => void ttsSpeak(toFlipped ? card.definition : card.word, false, voiceLang), 420);
    setFlipped(toFlipped);
  }, [flipped, flipProgress, card, voiceLang]);

  const diffColor  = card.difficulty === 'hard' ? '#ef4444' : card.difficulty === 'medium' ? '#f59e0b' : '#22c55e';
  const heartColor = isFavorite ? '#ef4444' : t.muted;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>

        {/* Swipe labels */}
        <Animated.View style={[styles.label, styles.knowLabel,     knowStyle]}     pointerEvents="none"><Text style={styles.knowText}>KNOW ✓</Text></Animated.View>
        <Animated.View style={[styles.label, styles.dontKnowLabel, dontKnowStyle]} pointerEvents="none"><Text style={styles.dontKnowText}>AGAIN ↺</Text></Animated.View>

        {/* ── FRONT face ──
            Touch priority:
              1. absoluteFill flip Pressable  (rendered first = lowest)
              2. pointerEvents="none" content (passes through)
              3. Icon buttons, position:absolute (rendered last = highest)
        */}
        <Animated.View
          style={[styles.face, { backgroundColor: t.surface, borderColor: t.border }, frontStyle]}
          pointerEvents={flipped ? 'none' : 'box-none'}
        >
          {/* 1 — Flip tap target */}
          <Pressable onPress={handleFlip} style={StyleSheet.absoluteFillObject} />

          {/* 2 — Visual content (non-interactive) */}
          <View style={styles.faceContent} pointerEvents="none">
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
              <Text style={[styles.word,     { color: t.fg }]}>{card.word}</Text>
              {card.phonetic     && <Text style={[styles.phonetic, { color: t.muted }]}>{card.phonetic}</Text>}
              {card.partOfSpeech && <Text style={[styles.pos,      { color: t.accent }]}>{card.partOfSpeech}</Text>}
            </View>

            <Text style={[styles.hint, { color: t.muted }]}>tap to reveal · swipe to rate</Text>
          </View>

          {/* 3a — Favorite button (top-right, highest touch priority) */}
          {onToggleFavorite && (
            <Pressable onPress={onToggleFavorite} style={styles.btnTopRight} hitSlop={14}>
              {/* Burst ring */}
              <Animated.View style={[styles.burstRing, { borderColor: '#ef4444' }, burstStyle]} />
              {/* Heart icon with scale animation */}
              <Animated.View style={heartAnimStyle}>
                <Heart
                  size={19}
                  color={heartColor}
                  fill={isFavorite ? '#ef4444' : 'none'}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          )}

          {/* 3b — Speak button (bottom-right) */}
          <Pressable onPress={() => void ttsSpeak(card.word, true, voiceLang)} style={styles.btnBottomRight} hitSlop={14}>
            <Volume2 size={17} color={t.muted} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* ── BACK face ── */}
        <Animated.View
          style={[styles.face, { backgroundColor: t.surface, borderColor: t.border }, backStyle]}
          pointerEvents={flipped ? 'box-none' : 'none'}
        >
          {/* 1 — Flip tap target */}
          <Pressable onPress={handleFlip} style={StyleSheet.absoluteFillObject} />

          {/* 2 — Visual content (non-interactive) */}
          <View style={styles.backContent} pointerEvents="none">
            <Text style={[styles.backWord,   { color: t.fg }]}>{card.word}</Text>
            <View style={[styles.divider,    { backgroundColor: t.border }]} />
            <Text style={[styles.definition, { color: t.fg }]}>{card.definition}</Text>
            <Text style={[styles.example,    { color: t.muted }]}>"{card.example}"</Text>
            {card.tip && (
              <View style={[styles.tipBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
                <Text style={[styles.tipText, { color: t.muted }]}>💡 {card.tip}</Text>
              </View>
            )}
            {card.synonyms && card.synonyms.length > 0 && (
              <View style={styles.synonymRow}>
                <Text style={[styles.synonymLabel, { color: t.muted }]}>≈ </Text>
                <Text style={[styles.synonymText,  { color: t.muted }]}>{card.synonyms.join(', ')}</Text>
              </View>
            )}
          </View>

          {/* 3a — Speak word (top-right) */}
          <Pressable onPress={() => void ttsSpeak(card.word, true, voiceLang)} style={styles.btnTopRight} hitSlop={14}>
            <Volume2 size={16} color={t.muted} strokeWidth={2} />
          </Pressable>

          {/* 3b — Speak example (bottom-right) */}
          <Pressable onPress={() => void ttsSpeak(card.example, true, voiceLang)} style={styles.btnBottomRight} hitSlop={14}>
            <Volume2 size={14} color={t.muted} strokeWidth={2} />
          </Pressable>
        </Animated.View>

      </Animated.View>
    </GestureDetector>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  cardWrapper: { width: CARD_W, height: CARD_H, alignSelf: 'center' },

  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },

  faceContent: {
    ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'space-between',
  },
  backContent: {
    ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'center', gap: 12,
  },

  meta:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText:     { fontSize: 11, fontFamily: F.medium },
  diffDot:      { width: 6, height: 6, borderRadius: 3 },

  centreContent:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  word:         { fontSize: 38, fontFamily: F.bold, letterSpacing: -1, textAlign: 'center' },
  phonetic:     { fontSize: 16, textAlign: 'center' },
  pos:          { fontSize: 13, fontFamily: F.medium, textTransform: 'lowercase' },
  hint:         { fontSize: 11, opacity: 0.45 },

  backWord:     { fontSize: 22, fontFamily: F.bold, letterSpacing: -0.5 },
  divider:      { height: 1 },
  definition:   { fontSize: 15, lineHeight: 22, fontFamily: F.medium },
  example:      { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  tipBox:       { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 4 },
  tipText:      { fontSize: 12, lineHeight: 18 },
  synonymRow:   { flexDirection: 'row', flexWrap: 'wrap' },
  synonymLabel: { fontSize: 12, fontFamily: F.medium },
  synonymText:  { fontSize: 12, fontStyle: 'italic' },

  /* Absolutely-positioned buttons */
  btnTopRight: {
    position: 'absolute', top: 16, right: 18,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  btnBottomRight: {
    position: 'absolute', bottom: 14, right: 18,
    padding: 6,
  },

  /* Heart burst ring */
  burstRing: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
  },

  /* Swipe labels */
  label:        { position: 'absolute', top: 22, zIndex: 20, borderRadius: 8, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 6 },
  knowLabel:    { right: 20, borderColor: '#22c55e' },
  dontKnowLabel:{ left: 20,  borderColor: '#ef4444' },
  knowText:     { color: '#22c55e', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
  dontKnowText: { color: '#ef4444', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
});
