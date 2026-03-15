/**
 * Comprehensive vocabulary practice screen.
 * Four quiz modes, randomly distributed across the user's learned words:
 *   1. Multiple choice  — pick the right word from 4 options
 *   2. Write the word   — type the full word from its definition
 *   3. Fill in the gap  — complete the example sentence
 *   4. Pronunciation    — say the word aloud, checked by OpenAI Whisper
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Dimensions,
  ActivityIndicator, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withSpring, withDelay,
  FadeIn, FadeInDown, ZoomIn, Easing, runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, CheckCircle2, XCircle, Volume2, Mic,
  RotateCcw, ChevronRight, Eye, Square,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useT, type Translations } from '@/src/i18n/useT';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { useLearnedWords } from '@/src/hooks/useLearnedWords';
import { useSettings } from '@/src/context/SettingsContext';
import { ttsSpeak, ttsStop } from '@/src/lib/openaiTts';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_TYPING_ATTEMPTS = 3;
const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

/* ─── Types ──────────────────────────────────────────────────── */

type QuizMode = 'choice' | 'write' | 'fill' | 'pronounce';

interface QuizItem {
  card:     Flashcard;
  mode:     QuizMode;
  choices?: string[]; // only for 'choice' mode: [correct, wrong, wrong, wrong] shuffled
}

/* ─── Helpers ────────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitize(text: string) {
  return text.toLowerCase().replace(/[^a-z'\- ]/g, '').trim();
}

/** Split a sentence around the first occurrence of `word`. */
function blankSentence(sentence: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match   = new RegExp(`\\b${escaped}\\b`, 'i').exec(sentence);
  if (!match) return { before: sentence, found: false, after: '' };
  return {
    before: sentence.slice(0, match.index),
    found:  true,
    after:  sentence.slice(match.index + match[0].length),
  };
}

/** Approximate Levenshtein distance for fuzzy pronunciation matching. */
function levDist(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function wordMatch(transcription: string, word: string): boolean {
  const t = transcription.toLowerCase();
  const w = word.toLowerCase();
  if (t.includes(w)) return true;
  // fuzzy: allow 1 edit per 4 chars
  const threshold = Math.max(1, Math.floor(w.length / 4));
  return t.split(/\s+/).some((tok) => levDist(tok, w) <= threshold);
}

function buildQuizDeck(cards: Flashcard[], allWordPool: string[]): QuizItem[] {
  const modes: QuizMode[] = ['choice', 'write', 'fill', 'pronounce'];
  const repeats   = Math.ceil(cards.length / 4);
  const modePool  = shuffle(
    Array.from({ length: repeats }, () => [...modes]).flat(),
  ).slice(0, cards.length);

  return cards.map((card, i) => {
    const mode = modePool[i];
    if (mode === 'choice') {
      const distractors = shuffle(
        allWordPool.filter((w) => w.toLowerCase() !== card.word.toLowerCase()),
      ).slice(0, 3);
      return { card, mode, choices: shuffle([card.word, ...distractors]) };
    }
    return { card, mode };
  });
}

/* ─── Mode badge ─────────────────────────────────────────────── */

// labelKey maps each mode to the corresponding Translations key
const MODE_META: Record<QuizMode, { labelKey: keyof Translations; color: string; icon: string }> = {
  choice:   { labelKey: 'modeChoice',    color: '#3b82f6', icon: '🎯' },
  write:    { labelKey: 'modeWrite',     color: '#8b5cf6', icon: '✍️'  },
  fill:     { labelKey: 'modeFill',      color: '#f59e0b', icon: '📝' },
  pronounce:{ labelKey: 'modePronounce', color: '#10b981', icon: '🎤' },
};

function ModeBadge({ mode }: { mode: QuizMode }) {
  const meta = MODE_META[mode];
  const T = useT();
  return (
    <View style={[modeBadgeStyles.badge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
      <Text style={modeBadgeStyles.icon}>{meta.icon}</Text>
      <Text style={[modeBadgeStyles.label, { color: meta.color }]}>{T[meta.labelKey] as string}</Text>
    </View>
  );
}
const modeBadgeStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  icon:  { fontSize: 12 },
  label: { fontSize: 11, fontFamily: F.semibold, letterSpacing: 0.3 },
});

/* ─── Letter boxes (shared by write + fill) ─────────────────── */

function LetterBoxes({
  word, typed, shakeX, status,
}: {
  word:   string;
  typed:  string;
  shakeX: { value: number };
  status: string;
}) {
  const t = useTheme();
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[lb.row, shakeStyle]}>
      {word.split('').map((char, i) => {
        const typedChar = typed[i] ?? '';
        const isFilled  = i < typed.length;
        const correct   = status === 'correct' || status === 'revealed';
        const wrong     = status === 'wrong' && isFilled;
        const isCursor  = status === 'idle' && i === typed.length;

        const bg    = correct ? '#22c55e18' : wrong ? '#ef444418' : isFilled ? t.surface : t.subtle;
        const color = correct ? '#22c55e'   : wrong ? '#ef4444'   : isFilled ? t.fg      : t.muted;
        const border= isCursor ? t.accent   : correct ? '#22c55e' : wrong ? '#ef4444'    : t.border;

        return (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(i * 25).duration(140)}
            style={[lb.box, { backgroundColor: bg, borderColor: border }]}
          >
            <Text style={[lb.char, { color }]}>
              {correct || status === 'revealed' ? word[i].toUpperCase() : typedChar.toUpperCase()}
            </Text>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
const lb = StyleSheet.create({
  row:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  box:  { width: 34, height: 40, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  char: { fontSize: 17, fontFamily: F.bold },
});

/* ─── Attempt dots ───────────────────────────────────────────── */
function AttemptDots({ attempts, max }: { attempts: number; max: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: i < attempts ? '#ef4444' : t.border,
        }} />
      ))}
    </View>
  );
}

/* ─── Confetti burst ─────────────────────────────────────────── */
function ConfettiParticle({ angle, color, delay }: { angle: number; color: string; delay: number }) {
  const rad = (angle * Math.PI) / 180;
  const ox = useSharedValue(0);
  const oy = useSharedValue(0);
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withSequence(withTiming(1, { duration: 80 }), withDelay(280, withTiming(0, { duration: 200 }))));
    sc.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 300 }));
    ox.value = withDelay(delay, withTiming(Math.cos(rad) * 80, { duration: 400, easing: Easing.out(Easing.cubic) }));
    oy.value = withDelay(delay, withTiming(Math.sin(rad) * 80, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: ox.value }, { translateY: oy.value }, { scale: sc.value }] }));
  return <Animated.View style={[{ position: 'absolute', alignSelf: 'center', top: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: color }, s]} />;
}
function ConfettiBurst() {
  const colors = ['#f4511e','#22c55e','#3b82f6','#f59e0b','#a855f7','#ec4899'];
  const particles = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ angle: (360 / 10) * i, color: colors[i % 6], delay: i * 20 })), []);
  return <View style={StyleSheet.absoluteFillObject} pointerEvents="none">{particles.map((p, i) => <ConfettiParticle key={i} {...p} />)}</View>;
}

/* ─── Feedback row (correct / wrong) ────────────────────────── */
function FeedbackRow({ status }: { status: string }) {
  const T = useT();
  if (status === 'correct') return (
    <Animated.View entering={ZoomIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <CheckCircle2 size={20} color="#22c55e" strokeWidth={2.2} />
      <Text style={{ fontSize: 15, fontFamily: F.bold, color: '#22c55e' }}>{T.correct}</Text>
    </Animated.View>
  );
  if (status === 'revealed') return (
    <Animated.View entering={FadeIn.duration(200)} style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 13, fontFamily: F.medium, color: '#f59e0b' }}>{T.answerRevealed}</Text>
    </Animated.View>
  );
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   QUIZ COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ─── 1. Multiple Choice ─────────────────────────────────────── */
function MultipleChoiceQuiz({
  item, onResult,
}: {
  item: QuizItem;
  onResult: (correct: boolean) => void;
}) {
  const t = useTheme();
  const T = useT();
  const { card, choices = [] } = item;
  const [picked, setPicked]  = useState<string | null>(null);
  const [showConf, setShowConf] = useState(false);

  const pick = useCallback((word: string) => {
    if (picked) return;
    const correct = word.toLowerCase() === card.word.toLowerCase();
    setPicked(word);
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConf(true);
      setTimeout(() => onResult(true), 900);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => onResult(false), 1100);
    }
  }, [picked, card.word, onResult]);

  const bgFor = (word: string) => {
    if (!picked) return t.surface;
    const isCorrect = word.toLowerCase() === card.word.toLowerCase();
    const isThis    = word === picked;
    if (isCorrect)             return '#22c55e18';
    if (isThis && !isCorrect)  return '#ef444418';
    return t.surface;
  };
  const borderFor = (word: string) => {
    if (!picked) return t.border;
    const isCorrect = word.toLowerCase() === card.word.toLowerCase();
    const isThis    = word === picked;
    if (isCorrect)             return '#22c55e';
    if (isThis && !isCorrect)  return '#ef4444';
    return t.border;
  };
  const colorFor = (word: string) => {
    if (!picked) return t.fg;
    const isCorrect = word.toLowerCase() === card.word.toLowerCase();
    const isThis    = word === picked;
    if (isCorrect)             return '#22c55e';
    if (isThis && !isCorrect)  return '#ef4444';
    return t.muted;
  };

  return (
    <View style={styles.quizBody}>
      {showConf && <ConfettiBurst />}

      {/* Prompt */}
      <Text style={[styles.promptLabel, { color: t.muted }]}>{T.choicePrompt}</Text>
      <View style={[styles.definitionBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
        <Text style={[styles.definitionText, { color: t.fg }]}>{card.definition}</Text>
        {card.partOfSpeech && (
          <Text style={[styles.posHint, { color: t.accent }]}>{card.partOfSpeech}</Text>
        )}
      </View>

      {/* Options */}
      <View style={styles.choiceList}>
        {choices.map((word) => (
          <Pressable
            key={word}
            onPress={() => pick(word)}
            style={[styles.choiceBtn, { backgroundColor: bgFor(word), borderColor: borderFor(word) }]}
          >
            <Text style={[styles.choiceText, { color: colorFor(word) }]}>{word}</Text>
            {picked && word.toLowerCase() === card.word.toLowerCase() && (
              <CheckCircle2 size={16} color="#22c55e" strokeWidth={2.2} />
            )}
            {picked === word && word.toLowerCase() !== card.word.toLowerCase() && (
              <XCircle size={16} color="#ef4444" strokeWidth={2.2} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ─── 2 & 3. Typing Quiz (write + fill) ─────────────────────── */
function TypingQuiz({
  item, onResult,
}: {
  item: QuizItem;
  onResult: (correct: boolean) => void;
}) {
  const t   = useTheme();
  const T   = useT();
  const { card, mode } = item;
  const inputRef         = useRef<TextInput>(null);
  const shakeX           = useSharedValue(0);
  const [typed,    setTyped]    = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status,   setStatus]   = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [showConf, setShowConf] = useState(false);

  const sentence = card.examples?.[0] ?? card.example ?? '';
  const blank    = useMemo(() => blankSentence(sentence, card.word), [sentence, card.word]);

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 150); return () => clearTimeout(t); }, []);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 55 }), withTiming(10, { duration: 55 }),
      withTiming(-7,  { duration: 55 }), withTiming(7,  { duration: 55 }),
      withTiming(0,   { duration: 55 }),
    );
  }, [shakeX]);

  const handleCorrect = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('correct');
    setShowConf(true);
    const timer = setTimeout(() => onResult(true), 900);
    return () => clearTimeout(timer);
  }, [onResult]);

  const handleWrong = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setStatus('wrong');
    triggerShake();
    const newA = attempts + 1;
    setAttempts(newA);
    setTimeout(() => { setTyped(''); setStatus('idle'); }, 420);
  }, [attempts, triggerShake]);

  const handleReveal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('revealed');
    setTyped(card.word);
    setTimeout(() => onResult(false), 1100);
  }, [card.word, onResult]);

  const handleTextChange = useCallback((text: string) => {
    if (status !== 'idle') return;
    const clean = sanitize(text).slice(0, card.word.length);
    setTyped(clean);
    if (clean.length === card.word.length) {
      clean === card.word.toLowerCase() ? handleCorrect() : handleWrong();
    }
  }, [status, card.word, handleCorrect, handleWrong]);

  return (
    <View style={styles.quizBody}>
      {showConf && <ConfettiBurst />}

      {/* Prompt */}
      <Text style={[styles.promptLabel, { color: t.muted }]}>
        {mode === 'fill' && blank.found ? T.fillPrompt : T.writePrompt}
      </Text>

      {/* Sentence or definition */}
      {mode === 'fill' && blank.found ? (
        <View style={[styles.definitionBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
          <Text style={[styles.sentenceText, { color: t.fg }]}>
            "{blank.before}
            <Text style={{ color: status === 'correct' ? '#22c55e' : status === 'revealed' ? '#f59e0b' : t.accent }}>
              {status === 'correct' || status === 'revealed' ? card.word : '_'.repeat(card.word.length)}
            </Text>
            {blank.after}"
          </Text>
        </View>
      ) : (
        <View style={[styles.definitionBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
          <Text style={[styles.definitionText, { color: t.fg }]}>{card.definition}</Text>
          {card.partOfSpeech && <Text style={[styles.posHint, { color: t.accent }]}>{card.partOfSpeech}</Text>}
        </View>
      )}

      {/* Phonetic hint */}
      {card.phonetic && (
        <Text style={[styles.phoneticHint, { color: t.muted }]}>{card.phonetic}</Text>
      )}

      {/* Letter boxes */}
      <LetterBoxes word={card.word} typed={typed} shakeX={shakeX} status={status} />

      {/* Feedback */}
      <FeedbackRow status={status} />

      {/* Bottom row: dots + reveal + skip */}
      <View style={styles.controlRow}>
        <AttemptDots attempts={attempts} max={MAX_TYPING_ATTEMPTS} />
        {attempts >= MAX_TYPING_ATTEMPTS - 1 && status === 'idle' && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Pressable style={[styles.smallBtn, { borderColor: '#f59e0b' }]} onPress={handleReveal}>
              <Eye size={13} color="#f59e0b" strokeWidth={2.2} />
              <Text style={[styles.smallBtnText, { color: '#f59e0b' }]}>{T.revealBtn}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Hidden keyboard driver */}
      <TextInput
        ref={inputRef}
        value={typed}
        onChangeText={handleTextChange}
        style={styles.hiddenInput}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => inputRef.current?.focus()}
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => inputRef.current?.focus()} pointerEvents="box-none" />
    </View>
  );
}

/* ─── 4. Pronunciation ───────────────────────────────────────── */
type PronounceState = 'idle' | 'recording' | 'processing' | 'result';

function PronounceQuiz({
  item, onResult,
}: {
  item: QuizItem;
  onResult: (correct: boolean) => void;
}) {
  const t   = useTheme();
  const T   = useT();
  const { ttsVoice } = useSettings();
  const { card } = item;
  const recordingRef               = useRef<Audio.Recording | null>(null);
  const [pState,    setPState]     = useState<PronounceState>('idle');
  const [correct,   setCorrect]    = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState('');
  const [timer,     setTimer]      = useState(0);
  const [listening, setListening]  = useState(false);
  const timerRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const micPulse                   = useSharedValue(1);

  // On mount: ensure audio mode is set for playback (not recording)
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      void ttsStop();
    };
  }, []);

  // Mic pulse while recording
  useEffect(() => {
    if (pState === 'recording') {
      micPulse.value = withSequence(
        withTiming(1.25, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0,  { duration: 500, easing: Easing.inOut(Easing.sin) }),
      );
    } else {
      micPulse.value = withTiming(1, { duration: 200 });
    }
  }, [pState, micPulse]);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
  }));

  const handleListen = useCallback(async () => {
    if (listening) return;
    setListening(true);
    try {
      // Always reset to playback mode before speaking (recording mode blocks audio)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      await ttsSpeak(card.word, ttsVoice, 0.85);
    } catch (e) {
      console.warn('[PronounceQuiz] listen error:', e);
      Alert.alert(T.audioError, T.audioErrorMsg);
    } finally {
      setListening(false);
    }
  }, [listening, card.word, ttsVoice]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(T.micNeeded, T.micNeededMsg);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      void ttsStop();

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setPState('recording');
      setTimer(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      timerRef.current = setInterval(() => setTimer((n) => n + 1), 1000);
    } catch (e) {
      console.warn('[PronounceQuiz] start error:', e);
    }
  }, []);

  const stopAndCheck = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPState('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      // Send to OpenAI Whisper
      const formData = new FormData();
      formData.append('file', { uri, type: 'audio/m4a', name: 'speech.m4a' } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body:    formData,
      });
      const data = await resp.json();
      const text = (data.text ?? '').trim();
      setTranscript(text);

      const isCorrect = wordMatch(text, card.word);
      setCorrect(isCorrect);
      setPState('result');

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onResult(true), 1000);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => onResult(false), 1400);
      }
    } catch (e) {
      console.warn('[PronounceQuiz] check error:', e);
      setPState('idle');
      Alert.alert(T.couldNotCheck, T.couldNotCheckMsg);
    }
  }, [card.word, onResult]);

  const noKey = !OPENAI_KEY;

  return (
    <View style={styles.quizBody}>
      <Text style={[styles.promptLabel, { color: t.muted }]}>{T.pronouncePrompt}</Text>

      {/* Word display */}
      <View style={[styles.pronounceWordBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
        <Text style={[styles.pronounceWord, { color: t.fg }]}>{card.word}</Text>
        {card.phonetic && (
          <Text style={[styles.pronouncePhonetic, { color: t.muted }]}>{card.phonetic}</Text>
        )}
        <Text style={[styles.pronounceDef, { color: t.muted }]} numberOfLines={2}>{card.definition}</Text>
      </View>

      {/* Listen button */}
      <Pressable
        style={[styles.listenBtn, { borderColor: listening ? t.accent : t.border, backgroundColor: t.surface, opacity: listening ? 0.7 : 1 }]}
        onPress={handleListen}
        disabled={listening}
      >
        {listening
          ? <ActivityIndicator size={16} color={t.accent} />
          : <Volume2 size={16} color={t.accent} strokeWidth={2.2} />
        }
        <Text style={[styles.listenBtnText, { color: t.fg }]}>
          {listening ? T.listening : T.listenBtn}
        </Text>
      </Pressable>

      {/* Record area */}
      {noKey ? (
        /* Fallback: self-evaluation when no API key */
        <View style={styles.selfEvalWrap}>
          <Text style={[styles.selfEvalText, { color: t.muted }]}>{T.selfEvalText}</Text>
          <View style={styles.selfEvalBtns}>
            <Pressable
              style={[styles.selfEvalBtn, { borderColor: '#ef4444' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onResult(false); }}
            >
              <Text style={[styles.selfEvalBtnText, { color: '#ef4444' }]}>{T.didntGetIt}</Text>
            </Pressable>
            <Pressable
              style={[styles.selfEvalBtn, { borderColor: '#22c55e' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onResult(true); }}
            >
              <Text style={[styles.selfEvalBtnText, { color: '#22c55e' }]}>{T.nailedIt}</Text>
            </Pressable>
          </View>
        </View>
      ) : pState === 'idle' ? (
        <Pressable
          style={[styles.recordBtn, { backgroundColor: '#10b98118', borderColor: '#10b981' }]}
          onPress={startRecording}
        >
          <Mic size={22} color="#10b981" strokeWidth={2} />
          <Text style={[styles.recordBtnText, { color: '#10b981' }]}>{T.tapToRecord}</Text>
        </Pressable>
      ) : pState === 'recording' ? (
        <View style={styles.recordingArea}>
          <Animated.View style={[styles.recordingIndicator, micStyle]}>
            <View style={[styles.recordingDot, { backgroundColor: '#ef4444' }]} />
          </Animated.View>
          <Text style={[styles.recordingTimer, { color: t.muted }]}>
            {T.recording} {timer}s
          </Text>
          <Pressable
            style={[styles.stopBtn, { backgroundColor: '#ef444418', borderColor: '#ef4444' }]}
            onPress={stopAndCheck}
          >
            <Square size={16} color="#ef4444" strokeWidth={2} fill="#ef4444" />
            <Text style={[styles.stopBtnText, { color: '#ef4444' }]}>{T.stopAndCheck}</Text>
          </Pressable>
        </View>
      ) : pState === 'processing' ? (
        <View style={styles.processingWrap}>
          <ActivityIndicator size="small" color="#10b981" />
          <Text style={[styles.processingText, { color: t.muted }]}>{T.checkingPronounce}</Text>
        </View>
      ) : pState === 'result' ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.resultWrap}>
          {correct ? (
            <>
              <CheckCircle2 size={28} color="#22c55e" strokeWidth={2} />
              <Text style={[styles.resultWord, { color: '#22c55e' }]}>{T.correct}</Text>
            </>
          ) : (
            <>
              <XCircle size={28} color="#ef4444" strokeWidth={2} />
              <Text style={[styles.resultWord, { color: '#ef4444' }]}>{T.notQuite}</Text>
            </>
          )}
          {transcript ? (
            <Text style={[styles.transcriptText, { color: t.muted }]}>
              {T.heardLabel} "{transcript}"
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ─── Results ────────────────────────────────────────────────── */
function QuizResults({
  score, total, modeScores, onRestart, onBack,
}: {
  score:      number;
  total:      number;
  modeScores: Record<QuizMode, { correct: number; total: number }>;
  onRestart:  () => void;
  onBack:     () => void;
}) {
  const t   = useTheme();
  const T   = useT();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.resultsWrap}>
      <Text style={styles.resultsEmoji}>{emoji}</Text>
      <Text style={[styles.resultsPct, { color: t.fg }]}>{pct}%</Text>
      <Text style={[styles.resultsLabel, { color: t.muted }]}>{score} / {total} correct</Text>

      {/* Per-mode breakdown */}
      <View style={[styles.breakdownCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        {(Object.keys(modeScores) as QuizMode[]).map((mode) => {
          const ms   = modeScores[mode];
          if (ms.total === 0) return null;
          const meta = MODE_META[mode];
          const mpct = Math.round((ms.correct / ms.total) * 100);
          return (
            <View key={mode} style={styles.breakdownRow}>
              <Text style={styles.breakdownIcon}>{meta.icon}</Text>
              <Text style={[styles.breakdownLabel, { color: t.muted }]}>{T[meta.labelKey] as string}</Text>
              <Text style={[styles.breakdownScore, { color: ms.correct === ms.total ? '#22c55e' : t.fg }]}>
                {ms.correct}/{ms.total}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.resultsMessage, { color: t.muted }]}>
        {pct >= 80 ? T.resultOutstanding : pct >= 50 ? T.resultGood : T.resultKeepGoing}
      </Text>

      <View style={styles.resultsButtons}>
        <Pressable style={[styles.resultsBtn, { backgroundColor: t.accent }]} onPress={onRestart}>
          <RotateCcw size={15} color="#fff" strokeWidth={2.5} />
          <Text style={styles.resultsBtnText}>{T.practiceAgain}</Text>
        </Pressable>
        <Pressable style={[styles.resultsBtn, styles.resultsBtnSec, { borderColor: t.border }]} onPress={onBack}>
          <Text style={[styles.resultsBtnTextSec, { color: t.fg }]}>{T.backToCards}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════ */
export default function QuizScreen() {
  const t                      = useTheme();
  const T                      = useT();
  const router                 = useRouter();
  const { learnedIds, loaded } = useLearnedWords();

  const allWordPool = useMemo(() => allCards.map((c) => c.word), []);

  const deck = useMemo((): QuizItem[] => {
    if (!loaded) return [];
    const learned = allCards.filter((c) => learnedIds.has(c.id));
    const base    = shuffle(learned.length >= 5 ? learned : allCards);
    return buildQuizDeck(base, allWordPool);
  }, [loaded, learnedIds, allWordPool]);

  const [index,      setIndex]      = useState(0);
  const [score,      setScore]      = useState(0);
  const [done,       setDone]       = useState(false);
  const [cardKey,    setCardKey]    = useState(0); // force re-mount quiz components
  const [modeScores, setModeScores] = useState<Record<QuizMode, { correct: number; total: number }>>({
    choice: { correct: 0, total: 0 }, write: { correct: 0, total: 0 },
    fill:   { correct: 0, total: 0 }, pronounce: { correct: 0, total: 0 },
  });

  const cardOpacity = useSharedValue(1);
  const cardTransY  = useSharedValue(0);
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity:   cardOpacity.value,
    transform: [{ translateY: cardTransY.value }],
  }));

  // Named callback so runOnJS can reference it (Reanimated 4: no inline arrows in worklet callbacks)
  const doAdvance = useCallback(() => {
    if (index + 1 >= deck.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setCardKey((k) => k + 1);
    }
    cardOpacity.value = withTiming(1, { duration: 200 });
  }, [index, deck.length, cardOpacity]);

  const advance = useCallback((correct: boolean) => {
    const item = deck[index];
    if (!item) return;

    // Update mode scores
    setModeScores((prev) => ({
      ...prev,
      [item.mode]: {
        correct: prev[item.mode].correct + (correct ? 1 : 0),
        total:   prev[item.mode].total   + 1,
      },
    }));
    if (correct) setScore((s) => s + 1);

    // Slide out → advance → slide in
    cardOpacity.value = withTiming(0, { duration: 160 }, () => {
      runOnJS(doAdvance)();
    });
  }, [index, deck, cardOpacity, doAdvance]);

  const restart = useCallback(() => {
    setIndex(0); setScore(0); setDone(false); setCardKey(0);
    setModeScores({ choice: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, fill: { correct: 0, total: 0 }, pronounce: { correct: 0, total: 0 } });
    cardOpacity.value = 1;
  }, [cardOpacity]);

  const useFallback = loaded && learnedIds.size < 5;
  const item        = deck[index];
  const total       = deck.length;

  if (!loaded || deck.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        <View style={styles.centreLoading}>
          <ActivityIndicator color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { void ttsStop(); router.back(); }} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={t.fg} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.fg }]}>{T.quizTitle}</Text>
          {!done && <Text style={[styles.headerSub, { color: t.muted }]}>{index + 1} / {total}</Text>}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      {!done && (
        <View style={[styles.progressBg, { backgroundColor: t.subtle }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: t.accent, width: `${(index / total) * 100}%` }]} />
        </View>
      )}

      {done ? (
        <QuizResults
          score={score}
          total={total}
          modeScores={modeScores}
          onRestart={restart}
          onBack={() => { void ttsStop(); router.back(); }}
        />
      ) : item ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          bottomOffset={24}
        >
            <Animated.View style={cardAnimStyle} key={cardKey}>

              {/* Fallback notice (first card only) */}
              {useFallback && index === 0 && (
                <Animated.View entering={FadeIn} style={[styles.notice, { backgroundColor: t.subtle, borderColor: t.border }]}>
                  <Text style={[styles.noticeText, { color: t.muted }]}>{T.fallbackNotice}</Text>
                </Animated.View>
              )}

              {/* Card */}
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                {/* Mode badge + category */}
                <View style={styles.cardTop}>
                  <ModeBadge mode={item.mode} />
                  <View style={[styles.catPill, { backgroundColor: t.subtle }]}>
                    <Text style={[styles.catText, { color: t.muted }]}>{item.card.category}</Text>
                  </View>
                </View>

                {/* Quiz content */}
                {item.mode === 'choice' && (
                  <MultipleChoiceQuiz key={cardKey} item={item} onResult={advance} />
                )}
                {(item.mode === 'write' || item.mode === 'fill') && (
                  <TypingQuiz key={cardKey} item={item} onResult={advance} />
                )}
                {item.mode === 'pronounce' && (
                  <PronounceQuiz key={cardKey} item={item} onResult={advance} />
                )}
              </View>

              {/* Skip button */}
              <Pressable style={styles.skipBtn} onPress={() => advance(false)}>
                <Text style={[styles.skipText, { color: t.muted }]}>{T.skip}</Text>
                <ChevronRight size={14} color={t.muted} strokeWidth={2.5} />
              </Pressable>

            </Animated.View>
        </KeyboardAwareScrollView>
      ) : null}

    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:            { flex: 1 },
  centreLoading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle:  { fontSize: 16, fontFamily: F.bold },
  headerSub:    { fontSize: 12, fontFamily: F.medium },

  /* Progress */
  progressBg:   { height: 3, marginHorizontal: 20, borderRadius: 99, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 99 },

  /* Scroll container — fills available space, centers content when short */
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  card:      { borderRadius: 24, borderWidth: 1, padding: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 5, overflow: 'hidden' },
  cardTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  catText:   { fontSize: 11, fontFamily: F.medium },

  /* Notice */
  notice:     { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { fontSize: 12, lineHeight: 18, fontFamily: F.medium },

  /* Quiz body (shared by all modes) */
  quizBody:   { gap: 16 },
  promptLabel:{ fontSize: 12, fontFamily: F.semibold, letterSpacing: 0.3 },

  /* Definition / sentence box */
  definitionBox: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  definitionText:{ fontSize: 16, lineHeight: 26, fontFamily: F.medium },
  sentenceText:  { fontSize: 15, lineHeight: 26, fontFamily: F.medium },
  posHint:       { fontSize: 12, fontFamily: F.semibold, textTransform: 'lowercase' },
  phoneticHint:  { fontSize: 13, fontFamily: F.medium, textAlign: 'center' },

  /* Multiple choice */
  choiceList: { gap: 8 },
  choiceBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 18 },
  choiceText: { fontSize: 16, fontFamily: F.medium, flex: 1 },

  /* Typing controls */
  controlRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  smallBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnText:  { fontSize: 12, fontFamily: F.semibold },
  hiddenInput:   { position: 'absolute', width: 1, height: 1, opacity: 0, left: -200, top: -200 },

  /* Pronunciation */
  pronounceWordBox: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 6 },
  pronounceWord:    { fontSize: 36, fontFamily: F.bold, letterSpacing: -1 },
  pronouncePhonetic:{ fontSize: 15, fontFamily: F.medium },
  pronounceDef:     { fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: F.medium },
  listenBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
  listenBtnText:    { fontSize: 14, fontFamily: F.medium },
  recordBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, borderWidth: 1.5, paddingVertical: 16 },
  recordBtnText:    { fontSize: 15, fontFamily: F.semibold },
  recordingArea:    { alignItems: 'center', gap: 12 },
  recordingIndicator:{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#ef444420', alignItems: 'center', justifyContent: 'center' },
  recordingDot:     { width: 20, height: 20, borderRadius: 10 },
  recordingTimer:   { fontSize: 14, fontFamily: F.medium },
  stopBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 20 },
  stopBtnText:      { fontSize: 14, fontFamily: F.semibold },
  processingWrap:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  processingText:   { fontSize: 14, fontFamily: F.medium },
  resultWrap:       { alignItems: 'center', gap: 8, paddingVertical: 8 },
  resultWord:       { fontSize: 18, fontFamily: F.bold },
  transcriptText:   { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  selfEvalWrap:     { gap: 12 },
  selfEvalText:     { fontSize: 14, lineHeight: 22, textAlign: 'center', fontFamily: F.medium },
  selfEvalBtns:     { flexDirection: 'row', gap: 10 },
  selfEvalBtn:      { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14 },
  selfEvalBtnText:  { fontSize: 14, fontFamily: F.semibold },

  /* Skip */
  skipBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  skipText: { fontSize: 13, fontFamily: F.medium },

  /* Results */
  resultsWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  resultsEmoji:      { fontSize: 52 },
  resultsPct:        { fontSize: 52, fontFamily: F.bold, letterSpacing: -2 },
  resultsLabel:      { fontSize: 16, fontFamily: F.medium },
  breakdownCard:     { width: '100%', borderRadius: 16, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, gap: 2, marginTop: 8 },
  breakdownRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  breakdownIcon:     { fontSize: 14 },
  breakdownLabel:    { flex: 1, fontSize: 13, fontFamily: F.medium },
  breakdownScore:    { fontSize: 14, fontFamily: F.bold },
  resultsMessage:    { fontSize: 14, lineHeight: 22, textAlign: 'center', marginVertical: 4 },
  resultsButtons:    { width: '100%', gap: 10, marginTop: 8 },
  resultsBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  resultsBtnText:    { color: '#fff', fontFamily: F.semibold, fontSize: 15 },
  resultsBtnSec:     { borderWidth: 1 },
  resultsBtnTextSec: { fontFamily: F.medium, fontSize: 15 },
});
