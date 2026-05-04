import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
// Use RNGH Pressable — it's gesture-system-aware and works correctly inside GestureDetector
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withRepeat, withDelay,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Volume2, Share2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import type { Flashcard } from '@/src/data/flashcards';
import { ttsSpeak, ttsStop, ttsPrefetch } from '@/src/lib/openaiTts';
import { captureAndShare } from '@/src/lib/share';
import { useSettings } from '@/src/context/SettingsContext';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.18;
const FLICK_VELOCITY  = 500;
const CARD_W = SCREEN_W - 48;
const CARD_H = 420;

// Share card dimensions — rendered off-screen for clean share images
const SHARE_W = 360;
const SHARE_H = 480;

export interface FlashCardRef {
  triggerKnow:     () => void;
  triggerDontKnow: () => void;
  flipCard:        () => void;
  speakCard:       () => void;
}

interface FlashCardProps {
  card:              Flashcard;
  onKnow:            () => void;
  onDontKnow:        () => void;
  isFavorite?:       boolean;
  onToggleFavorite?: () => void;
  /** When false, FlashCard does not own a pan gesture and hides its swipe labels. Taps/flip/heart/share still work. Default true. */
  draggable?:        boolean;
}

/* ─── Off-screen share card ────────────────────────────────────── */
// Renders a beautiful, minimal card image suitable for social sharing.
// Positioned far off-screen so it never appears in the UI.

function ShareCardView({
  card,
  shareRef,
}: {
  card: Flashcard;
  shareRef: React.RefObject<any>;
}) {
  const example = card.examples?.[0] ?? card.example;

  return (
    <View
      ref={shareRef}
      collapsable={false}
      style={shareStyles.root}
      pointerEvents="none"
    >
      {/* Top brand strip */}
      <View style={shareStyles.brandBar}>
        <View style={shareStyles.brandDot} />
        <Text style={shareStyles.brandName}>Vocally</Text>
        <Text style={shareStyles.brandSub}>IELTS Vocabulary</Text>
      </View>

      {/* Word + phonetic */}
      <View style={shareStyles.wordBlock}>
        <Text style={shareStyles.word}>{card.word}</Text>
        {card.phonetic && (
          <Text style={shareStyles.phonetic}>{card.phonetic}</Text>
        )}
        {card.partOfSpeech && (
          <Text style={shareStyles.pos}>{card.partOfSpeech}</Text>
        )}
      </View>

      {/* Divider */}
      <View style={shareStyles.divider} />

      {/* Definition */}
      <Text style={shareStyles.definition}>{card.definition}</Text>

      {/* Example */}
      {example ? (
        <View style={shareStyles.exampleBox}>
          <Text style={shareStyles.exampleQuote}>"</Text>
          <Text style={shareStyles.exampleText}>{example}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={shareStyles.footer}>
        <Text style={shareStyles.footerTag}>#IELTS</Text>
        <Text style={shareStyles.footerTag}>#Vocabulary</Text>
        <Text style={shareStyles.footerApp}>vocally</Text>
      </View>
    </View>
  );
}

const shareStyles = StyleSheet.create({
  root: {
    // Off-screen — never visible in the app UI
    position: 'absolute',
    left: -SHARE_W - 100,
    top: 0,
    width: SHARE_W,
    height: SHARE_H,
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    padding: 32,
    gap: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f4511e',
  },
  brandName: {
    fontSize: 14,
    fontFamily: F.bold,
    color: '#f5f5f5',
    letterSpacing: 0.8,
  },
  brandSub: {
    fontSize: 11,
    fontFamily: F.medium,
    color: '#666666',
    letterSpacing: 0.4,
  },
  wordBlock: {
    gap: 6,
    marginBottom: 20,
  },
  word: {
    fontSize: 44,
    fontFamily: F.bold,
    color: '#f5f5f5',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  phonetic: {
    fontSize: 16,
    color: '#888888',
    fontFamily: F.medium,
  },
  pos: {
    fontSize: 12,
    color: '#f4511e',
    fontFamily: F.semibold,
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#222222',
    marginVertical: 20,
  },
  definition: {
    fontSize: 16,
    lineHeight: 26,
    color: '#d0d0d0',
    fontFamily: F.medium,
    marginBottom: 20,
  },
  exampleBox: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  exampleQuote: {
    fontSize: 32,
    color: '#f4511e',
    fontFamily: F.bold,
    lineHeight: 36,
    marginTop: -4,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#888888',
    fontStyle: 'italic',
    fontFamily: F.medium,
    paddingTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  footerTag: {
    fontSize: 11,
    color: '#444444',
    fontFamily: F.medium,
  },
  footerApp: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#444444',
    fontFamily: F.bold,
    letterSpacing: 1,
  },
});

/* ─── Animated speak button ────────────────────────────────────── */

function SpeakButton({
  onSpeak,
  size = 17,
  style,
}: {
  onSpeak: () => void;
  size?: number;
  style?: any;
}) {
  const t = useTheme();
  const scale    = useSharedValue(1);
  const playing  = useSharedValue(0); // 0 = idle, 1 = playing
  const ring1    = useSharedValue(0);
  const ring2    = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 0.5, 1], [0.5, 0.2, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2.2]) }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 0.5, 1], [0.4, 0.15, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.6]) }],
  }));

  const iconColorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(playing.value, [0, 1], [0.6, 1]),
  }));

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce
    scale.value = withSequence(
      withTiming(0.75, { duration: 80 }),
      withSpring(1.15, { damping: 4, stiffness: 400, mass: 0.3 }),
      withSpring(1.0,  { damping: 10, stiffness: 200 }),
    );

    // Ripple rings
    ring1.value = 0;
    ring2.value = 0;
    ring1.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    ring2.value = withDelay(120, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    // Glow while "playing"
    playing.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(1200, withTiming(0, { duration: 400 })),
    );

    onSpeak();
  }

  return (
    <Pressable onPress={handlePress} style={[styles.speakBtn, style]} hitSlop={14}>
      {/* Ripple rings */}
      <Animated.View style={[styles.speakRing, { borderColor: t.accent }, ring1Style]} />
      <Animated.View style={[styles.speakRing, { borderColor: t.accent }, ring2Style]} />
      {/* Icon */}
      <Animated.View style={[animStyle]}>
        <Animated.View style={iconColorStyle}>
          <Volume2 size={size} color={t.accent} strokeWidth={2.2} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* ─── Animated share button ─────────────────────────────────────── */

const SHARE_BLUE = '#3b82f6';

function ShareButton({
  shareRef,
  style,
}: {
  shareRef: React.RefObject<any>;
  style?: any;
}) {
  const scale   = useSharedValue(1);
  const rotate  = useSharedValue(0);
  const ring1   = useSharedValue(0);
  const ring2   = useSharedValue(0);
  const glow    = useSharedValue(0);
  const [busy, setBusy] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale:  scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: interpolate(glow.value, [0, 1], [0.7, 1]),
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 0.4, 1], [0.55, 0.2, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2.1]) }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 0.4, 1], [0.4, 0.12, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.6]) }],
  }));

  async function handlePress() {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Bounce + small tilt
    scale.value = withSequence(
      withTiming(0.72, { duration: 75 }),
      withSpring(1.18, { damping: 4, stiffness: 420, mass: 0.3 }),
      withSpring(1.0,  { damping: 10, stiffness: 200 }),
    );
    rotate.value = withSequence(
      withTiming(-18, { duration: 80 }),
      withSpring(0,   { damping: 5, stiffness: 350 }),
    );

    // Ripple rings
    ring1.value = 0;
    ring2.value = 0;
    ring1.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    ring2.value = withDelay(130, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));

    // Glow pulse
    glow.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 350 })),
    );

    setBusy(true);
    try {
      await captureAndShare(shareRef);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={handlePress} style={[styles.shareBtn, style]} hitSlop={14} disabled={busy}>
      {/* Ripple rings */}
      <Animated.View style={[styles.shareRing, { borderColor: SHARE_BLUE }, ring1Style]} />
      <Animated.View style={[styles.shareRing, { borderColor: SHARE_BLUE }, ring2Style]} />
      {/* Icon */}
      <Animated.View style={animStyle}>
        <Share2 size={16} color={SHARE_BLUE} strokeWidth={2.2} />
      </Animated.View>
    </Pressable>
  );
}

/* ─── FlashCard ────────────────────────────────────────────────── */

export const FlashCard = forwardRef<FlashCardRef, FlashCardProps>(function FlashCard({
  card,
  onKnow,
  onDontKnow,
  isFavorite      = false,
  onToggleFavorite,
  draggable       = true,
}: FlashCardProps, ref) {
  const t       = useTheme();
  const { ttsVoice } = useSettings();
  const [flipped, setFlipped] = useState(false);

  // ── Shared values ─────────────────────────────────────────────
  const translateX   = useSharedValue(0);
  const translateY   = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  // Heart animation
  const heartScale   = useSharedValue(1);
  const burstScale   = useSharedValue(1);
  const burstOpacity = useSharedValue(0);

  // Pre-warm TTS for this card as soon as it becomes active
  useEffect(() => {
    ttsPrefetch([card.word], ttsVoice, 0.85);
  }, [card.word, ttsVoice]);

  // ── Heart burst animation when favorited ───────────────────────
  useEffect(() => {
    if (isFavorite) {
      heartScale.value = withSequence(
        withSpring(1.55, { damping: 3, stiffness: 500, mass: 0.4 }),
        withSpring(1.0,  { damping: 10, stiffness: 200 }),
      );
      burstScale.value   = 1;
      burstOpacity.value = 0.6;
      burstScale.value   = withTiming(2.4, { duration: 380, easing: Easing.out(Easing.cubic) });
      burstOpacity.value = withTiming(0,   { duration: 380 });
    } else {
      heartScale.value = withSequence(
        withTiming(0.75, { duration: 100 }),
        withSpring(1.0,  { damping: 12, stiffness: 200 }),
      );
    }
  }, [isFavorite]);

  // ── Fly-out (swipe to rate) ────────────────────────────────────
  const flyOut = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void ttsStop();
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
    setFlipped(toFlipped);
  }, [flipped, flipProgress]);

  const handleSpeak = useCallback(() => {
    if (!flipped) {
      void ttsSpeak(card.word, ttsVoice, 0.85);
      return;
    }

    const exampleText = card.examples?.length ? card.examples.join('. ') : card.example;
    const text = [card.word, card.definition, exampleText].filter(Boolean).join('. ');
    void ttsSpeak(text, ttsVoice, 0.85);
  }, [card.definition, card.example, card.examples, card.word, flipped, ttsVoice]);

  // Expose imperative actions so the parent's button bar can trigger card animations
  useImperativeHandle(ref, () => ({
    triggerKnow:     () => flyOut('right'),
    triggerDontKnow: () => flyOut('left'),
    flipCard:        handleFlip,
    speakCard:       handleSpeak,
  }), [flyOut, handleFlip, handleSpeak]);

  const diffColor  = card.difficulty === 'hard' ? '#ef4444' : card.difficulty === 'medium' ? '#f59e0b' : '#22c55e';

  // ── Render ─────────────────────────────────────────────────────
  const cardBody = (
    <Animated.View style={[styles.cardWrapper, draggable ? cardStyle : undefined]}>

      {/* Swipe labels — only shown when FlashCard owns the gesture */}
      {draggable && (
        <>
          <Animated.View style={[styles.label, styles.knowLabel,     knowStyle]}     pointerEvents="none"><Text style={styles.knowText}>KNOW ✓</Text></Animated.View>
          <Animated.View style={[styles.label, styles.dontKnowLabel, dontKnowStyle]} pointerEvents="none"><Text style={styles.dontKnowText}>AGAIN ↺</Text></Animated.View>
        </>
      )}

      {/* ── FRONT face ── */}
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

              {/* Examples */}
              {card.examples && card.examples.length > 0 ? (
                <View style={styles.examplesBlock}>
                  {card.examples.map((ex, i) => (
                    <Text key={i} style={[styles.example, { color: t.muted }]}>
                      {i + 1}. "{ex}"
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={[styles.example, { color: t.muted }]}>"{card.example}"</Text>
              )}

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
          </Animated.View>

    </Animated.View>
  );

  return (
    <>
      {draggable ? (
        <GestureDetector gesture={panGesture}>{cardBody}</GestureDetector>
      ) : (
        cardBody
      )}
    </>
  );
});

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
  examplesBlock:{ gap: 4 },
  example:      { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  tipBox:       { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 4 },
  tipText:      { fontSize: 12, lineHeight: 18 },
  synonymRow:   { flexDirection: 'row', flexWrap: 'wrap' },
  synonymLabel: { fontSize: 12, fontFamily: F.medium },
  synonymText:  { fontSize: 12, fontStyle: 'italic' },

  /* ── Top-right cluster: share + heart side by side ── */
  topRightCluster: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  heartBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Absolutely-positioned buttons (speak buttons) */
  btnTopRight: {
    position: 'absolute', top: 16, right: 18,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  btnBottomRight: {
    position: 'absolute', bottom: 14, right: 18,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },

  /* Speak button */
  speakBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36,
  },
  speakRing: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
  },

  /* Share button */
  shareBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36,
  },
  shareRing: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
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
