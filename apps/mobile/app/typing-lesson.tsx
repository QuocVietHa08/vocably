import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withSpring, withDelay, withRepeat,
  FadeIn, FadeInDown, FadeOut, ZoomIn,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Eye, RotateCcw, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { useLearnedWords } from '@/src/hooks/useLearnedWords';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_ATTEMPTS = 3;

/* ─── Helpers ────────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Split a sentence into [before, word, after] around the first occurrence of `word`. */
function splitSentence(sentence: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  const match = regex.exec(sentence);
  if (!match) return { before: sentence, found: false, after: '' };
  return {
    before: sentence.slice(0, match.index),
    found: true,
    after: sentence.slice(match.index + match[0].length),
  };
}

/** Clean input to only valid word characters */
function sanitize(text: string) {
  return text.toLowerCase().replace(/[^a-z'\-]/g, '');
}

/* ─── Letter boxes ───────────────────────────────────────────── */

function LetterBoxes({
  word,
  typed,
  shakeX,
  status,
}: {
  word:   string;
  typed:  string;
  shakeX: { value: number };
  status: 'idle' | 'correct' | 'wrong' | 'revealed' | string;
}) {
  const t = useTheme();
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[styles.letterRow, shakeStyle]}>
      {word.split('').map((char, i) => {
        const typedChar  = typed[i] ?? '';
        const isFilled   = i < typed.length;
        const isCorrect  = status === 'correct' || status === 'revealed';
        const isWrong    = status === 'wrong' && isFilled;
        const isCursor   = status === 'idle' && i === typed.length;

        let boxBg     = t.subtle;
        let charColor = t.muted;
        if (isCorrect)    { boxBg = '#22c55e20'; charColor = '#22c55e'; }
        else if (isWrong) { boxBg = '#ef444420'; charColor = '#ef4444'; }
        else if (isFilled){ boxBg = t.surface;   charColor = t.fg; }

        return (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(i * 30).duration(160)}
            style={[
              styles.letterBox,
              { backgroundColor: boxBg, borderColor: isCursor ? t.accent : isCorrect ? '#22c55e' : isWrong ? '#ef4444' : t.border },
            ]}
          >
            <Text style={[styles.letterChar, { color: charColor }]}>
              {isCorrect || status === 'revealed'
                ? word[i].toUpperCase()
                : typedChar.toUpperCase()}
            </Text>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

/* ─── Attempt dots ───────────────────────────────────────────── */

function AttemptDots({ attempts, max }: { attempts: number; max: number }) {
  const t = useTheme();
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i < attempts ? '#ef4444' : i === attempts ? t.border : t.subtle },
          ]}
        />
      ))}
    </View>
  );
}

/* ─── Confetti burst (pure RN, no library) ──────────────────── */

function ConfettiBurst() {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      angle: (360 / 12) * i,
      color: ['#f4511e','#22c55e','#3b82f6','#f59e0b','#a855f7','#ec4899'][i % 6],
    }))
  , []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => (
        <ConfettiParticle key={i} angle={p.angle} color={p.color} delay={i * 18} />
      ))}
    </View>
  );
}

function ConfettiParticle({ angle, color, delay }: { angle: number; color: string; delay: number }) {
  const rad     = (angle * Math.PI) / 180;
  const tx      = Math.cos(rad) * 90;
  const ty      = Math.sin(rad) * 90;
  const x       = useSharedValue(0);
  const y       = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1,   { duration: 80 }),
      withDelay(260,  withTiming(0, { duration: 220 })),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 8, stiffness: 300 }),
      withDelay(260, withTiming(0, { duration: 220 })),
    ));
    x.value = withDelay(delay, withTiming(tx, { duration: 420, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withTiming(ty, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        width: 8, height: 8, borderRadius: 4, backgroundColor: color,
      }, style]}
    />
  );
}

/* ─── Results screen ─────────────────────────────────────────── */

function TypingResults({
  score,
  total,
  onRestart,
  onBack,
}: {
  score:     number;
  total:     number;
  onRestart: () => void;
  onBack:    () => void;
}) {
  const t   = useTheme();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.resultsWrap}>
      <Text style={styles.resultsEmoji}>{emoji}</Text>
      <Text style={[styles.resultsPct, { color: t.fg }]}>{pct}%</Text>
      <Text style={[styles.resultsLabel, { color: t.muted }]}>
        {score} / {total} correct
      </Text>

      <Text style={[styles.resultsMessage, { color: t.muted }]}>
        {pct >= 80
          ? 'Excellent! Your vocabulary is strong.'
          : pct >= 50
          ? 'Good effort! Keep practising to improve.'
          : 'Keep going — repetition is the key to retention.'}
      </Text>

      <View style={styles.resultsButtons}>
        <Pressable
          style={[styles.resultsBtn, { backgroundColor: t.accent }]}
          onPress={onRestart}
        >
          <RotateCcw size={15} color="#fff" strokeWidth={2.5} />
          <Text style={styles.resultsBtnText}>Practice again</Text>
        </Pressable>
        <Pressable
          style={[styles.resultsBtn, styles.resultsBtnSecondary, { borderColor: t.border }]}
          onPress={onBack}
        >
          <Text style={[styles.resultsBtnTextSecondary, { color: t.fg }]}>Back to cards</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/* ─── Main screen ────────────────────────────────────────────── */

export default function TypingLessonScreen() {
  const t                              = useTheme();
  const router                         = useRouter();
  const { learnedIds, loaded }         = useLearnedWords();

  // Build deck: learned words, fallback to all if < 5 learned
  const deck = useMemo(() => {
    if (!loaded) return [];
    const learned = allCards.filter((c) => learnedIds.has(c.id));
    return shuffle(learned.length >= 5 ? learned : allCards);
  }, [loaded, learnedIds]);

  const [index,    setIndex]    = useState(0);
  const [typed,    setTyped]    = useState('');
  const [attempts, setAttempts] = useState(0);
  const [score,    setScore]    = useState(0);
  const [status,   setStatus]   = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [done,     setDone]     = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const inputRef  = useRef<TextInput>(null);
  const shakeX    = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  const card = deck[index];

  // Split example sentence around the target word
  const sentence      = card?.examples?.[0] ?? card?.example ?? '';
  const { before, found, after } = useMemo(
    () => (card ? splitSentence(sentence, card.word) : { before: sentence, found: false, after: '' }),
    [card, sentence],
  );

  // Focus input on mount and on card change
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [index]);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 55 }),
      withTiming(10,  { duration: 55 }),
      withTiming(-8,  { duration: 55 }),
      withTiming(8,   { duration: 55 }),
      withTiming(-4,  { duration: 55 }),
      withTiming(0,   { duration: 55 }),
    );
  }, [shakeX]);

  const advanceCard = useCallback(() => {
    // Fade out
    cardOpacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(() => {
        if (index + 1 >= deck.length) {
          setDone(true);
        } else {
          setIndex((i) => i + 1);
          setTyped('');
          setAttempts(0);
          setStatus('idle');
          setShowConfetti(false);
        }
        cardOpacity.value = withTiming(1, { duration: 220 });
      })();
    });
  }, [index, deck.length, cardOpacity]);

  const handleCorrect = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('correct');
    setScore((s) => s + 1);
    setShowConfetti(true);

    cardScale.value = withSequence(
      withSpring(1.04, { damping: 5,  stiffness: 300 }),
      withSpring(1.0,  { damping: 14, stiffness: 200 }),
    );

    const timer = setTimeout(advanceCard, 950);
    return () => clearTimeout(timer);
  }, [advanceCard, cardScale]);

  const handleWrong = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setStatus('wrong');
    triggerShake();

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Clear typed after shake
    const timer = setTimeout(() => {
      setTyped('');
      setStatus('idle');
    }, 400);
    return () => clearTimeout(timer);
  }, [attempts, triggerShake]);

  const handleReveal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('revealed');
    setTyped(card?.word ?? '');
    const timer = setTimeout(advanceCard, 1100);
    return () => clearTimeout(timer);
  }, [card, advanceCard]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advanceCard();
  }, [advanceCard]);

  // Handle text input change
  const handleTextChange = useCallback((text: string) => {
    if (!card || status === 'correct' || status === 'revealed') return;

    const clean = sanitize(text);
    const word  = card.word.toLowerCase();

    // Limit to word length
    const capped = clean.slice(0, word.length);
    setTyped(capped);
    setStatus('idle');

    if (capped.length === word.length) {
      if (capped === word) {
        handleCorrect();
      } else {
        handleWrong();
      }
    }
  }, [card, status, handleCorrect, handleWrong]);

  const restart = useCallback(() => {
    setIndex(0);
    setTyped('');
    setAttempts(0);
    setScore(0);
    setStatus('idle');
    setDone(false);
    setShowConfetti(false);
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity:   cardOpacity.value,
  }));

  const useFallback = loaded && learnedIds.size < 5;
  const total       = deck.length;

  if (!loaded || deck.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        <View style={styles.centreLoading}>
          <Text style={[styles.loadingText, { color: t.muted }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={t.fg} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.fg }]}>Typing Lesson</Text>
          {!done && (
            <Text style={[styles.headerSub, { color: t.muted }]}>
              {index + 1} / {total}
            </Text>
          )}
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── Progress bar ── */}
      {!done && (
        <View style={[styles.progressBg, { backgroundColor: t.subtle }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: t.accent, width: `${((index) / total) * 100}%` },
            ]}
          />
        </View>
      )}

      {done ? (
        <TypingResults
          score={score}
          total={total}
          onRestart={restart}
          onBack={() => router.back()}
        />
      ) : (
        <View style={styles.content}>

          {/* Fallback notice */}
          {useFallback && index === 0 && (
            <Animated.View entering={FadeIn} style={[styles.notice, { backgroundColor: t.subtle, borderColor: t.border }]}>
              <Text style={[styles.noticeText, { color: t.muted }]}>
                💡 Practising all words — swipe right on cards to build a personal lesson
              </Text>
            </Animated.View>
          )}

          {/* ── Card ── */}
          <Animated.View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, cardAnimStyle]}>

            {/* Confetti */}
            {showConfetti && <ConfettiBurst />}

            {/* Category + difficulty pill */}
            <View style={styles.cardMeta}>
              <View style={[styles.pill, { backgroundColor: t.subtle }]}>
                <Text style={[styles.pillText, { color: t.muted }]}>{card.category}</Text>
              </View>
              {card.band && (
                <View style={[styles.pill, { backgroundColor: t.subtle }]}>
                  <Text style={[styles.pillText, { color: t.muted }]}>Band {card.band}</Text>
                </View>
              )}
            </View>

            {/* Instruction */}
            <Text style={[styles.instruction, { color: t.muted }]}>Complete the sentence</Text>

            {/* Sentence with blank */}
            <View style={styles.sentenceBlock}>
              <Text style={[styles.sentence, { color: t.fg }]}>
                "{before}
                <Text style={{ color: status === 'correct' ? '#22c55e' : status === 'revealed' ? '#f59e0b' : t.accent }}>
                  {status === 'correct' || status === 'revealed'
                    ? card.word
                    : '_'.repeat(card.word.length)}
                </Text>
                {after}"
              </Text>
            </View>

            {/* Hint: pos + phonetic */}
            <Text style={[styles.hint, { color: t.muted }]}>
              {[card.partOfSpeech, card.phonetic].filter(Boolean).join('  ·  ')}
            </Text>

            {/* Letter boxes */}
            <LetterBoxes
              word={card.word}
              typed={typed}
              shakeX={shakeX}
              status={status}
            />

            {/* Correct tick */}
            {status === 'correct' && (
              <Animated.View entering={ZoomIn.duration(200)} style={styles.correctTick}>
                <CheckCircle2 size={22} color="#22c55e" strokeWidth={2.2} />
                <Text style={[styles.correctText, { color: '#22c55e' }]}>Correct!</Text>
              </Animated.View>
            )}

            {/* Revealed message */}
            {status === 'revealed' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.revealedMsg}>
                <Text style={[styles.revealedText, { color: '#f59e0b' }]}>The word was: {card.word}</Text>
              </Animated.View>
            )}

          </Animated.View>

          {/* ── Bottom controls ── */}
          <View style={styles.controls}>
            {/* Attempt dots */}
            <AttemptDots attempts={attempts} max={MAX_ATTEMPTS} />

            <View style={styles.controlBtns}>
              {/* Reveal button — shown after (MAX_ATTEMPTS - 1) fails */}
              {attempts >= MAX_ATTEMPTS - 1 && status === 'idle' && (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <Pressable
                    style={[styles.revealBtn, { borderColor: '#f59e0b' }]}
                    onPress={handleReveal}
                  >
                    <Eye size={14} color="#f59e0b" strokeWidth={2.2} />
                    <Text style={[styles.revealBtnText, { color: '#f59e0b' }]}>Reveal</Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Skip button */}
              <Pressable
                style={[styles.skipBtn, { borderColor: t.border }]}
                onPress={handleSkip}
              >
                <Text style={[styles.skipBtnText, { color: t.muted }]}>Skip</Text>
                <ChevronRight size={14} color={t.muted} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {/* Hidden text input — keyboard driver */}
          <TextInput
            ref={inputRef}
            value={typed}
            onChangeText={handleTextChange}
            style={styles.hiddenInput}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            returnKeyType="done"
            blurOnSubmit={false}
            // Keep keyboard visible
            onSubmitEditing={() => inputRef.current?.focus()}
          />

          {/* Tap-to-type overlay (re-focuses input if keyboard dismissed) */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => inputRef.current?.focus()}
            pointerEvents="box-none"
          />
        </View>
      )}

    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 16, fontFamily: F.bold },
  headerSub:   { fontSize: 12, fontFamily: F.medium },

  /* Progress bar */
  progressBg: {
    height: 3,
    marginHorizontal: 20,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },

  /* Content */
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 20,
  },

  /* Notice */
  notice: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  noticeText: { fontSize: 12, lineHeight: 18, fontFamily: F.medium },

  /* Card */
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  },

  cardMeta: { flexDirection: 'row', gap: 6 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontFamily: F.medium },

  instruction: { fontSize: 12, fontFamily: F.medium, letterSpacing: 0.3 },

  sentenceBlock: { minHeight: 64, justifyContent: 'center' },
  sentence: { fontSize: 17, lineHeight: 28, fontFamily: F.medium },

  hint: { fontSize: 13, fontFamily: F.medium },

  /* Letter boxes */
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  letterBox: {
    width: 36, height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterChar: {
    fontSize: 18,
    fontFamily: F.bold,
    letterSpacing: 0,
  },

  /* Correct/revealed feedback */
  correctTick: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, justifyContent: 'center',
  },
  correctText: { fontSize: 15, fontFamily: F.bold },
  revealedMsg: { alignItems: 'center' },
  revealedText: { fontSize: 14, fontFamily: F.medium },

  /* Bottom controls */
  controls: {
    gap: 14,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row', gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  controlBtns: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  revealBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  revealBtnText: { fontSize: 13, fontFamily: F.semibold },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  skipBtnText: { fontSize: 13, fontFamily: F.medium },

  /* Hidden input */
  hiddenInput: {
    position: 'absolute',
    width: 1, height: 1,
    opacity: 0,
    left: -100, top: -100,
  },

  /* Loading */
  centreLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15 },

  /* Results */
  resultsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  resultsEmoji:   { fontSize: 52 },
  resultsPct:     { fontSize: 52, fontFamily: F.bold, letterSpacing: -2 },
  resultsLabel:   { fontSize: 16, fontFamily: F.medium },
  resultsMessage: {
    fontSize: 14, lineHeight: 22, textAlign: 'center',
    marginTop: 4, marginBottom: 16,
  },
  resultsButtons: { width: '100%', gap: 10 },
  resultsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  resultsBtnText: { color: '#fff', fontFamily: F.semibold, fontSize: 15 },
  resultsBtnSecondary: { borderWidth: 1 },
  resultsBtnTextSecondary: { fontFamily: F.medium, fontSize: 15 },
});
