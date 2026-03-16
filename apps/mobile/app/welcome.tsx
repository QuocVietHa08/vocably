import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, ScrollView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withRepeat, withSequence, withDelay,
  FadeInDown, FadeOutUp, FadeIn, SlideInRight,
  Easing, runOnJS, interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mic, Sparkles, BookOpen, Globe, Volume2, Bell, CheckCircle, Target, MessageCircle, ArrowRight, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useSettings } from '@/src/context/SettingsContext';
import { useT } from '@/src/i18n/useT';
import { allCards, type Flashcard } from '@/src/data/flashcards';
import { ttsSpeak } from '@/src/lib/openaiTts';

const { width: SCREEN_W } = Dimensions.get('window');

export const WELCOME_SEEN_KEY = '@vocally/welcomeSeen';

/* ─── Language list ───────────────────────────────────────────── */

export const NATIVE_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷' },
  { code: 'th', name: 'ภาษาไทย',    flag: '🇹🇭' },
  { code: 'id', name: 'Indonesia',   flag: '🇮🇩' },
  { code: 'es', name: 'Español',     flag: '🇪🇸' },
  { code: 'fr', name: 'Français',    flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',     flag: '🇩🇪' },
  { code: 'ar', name: 'العربية',     flag: '🇸🇦' },
  { code: 'pt', name: 'Português',   flag: '🇧🇷' },
  { code: 'hi', name: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'en', name: 'English',     flag: '🇬🇧' },
  { code: 'other', name: 'Other',    flag: '🌍' },
];

/* ─── Step enum & constants ──────────────────────────────────── */

enum Step {
  Welcome       = 0,
  Language      = 1,
  CurrentLevel  = 2,
  TargetLevel   = 3,
  DailyGoal     = 4,
  Features      = 5,
  Flashcards    = 6,
  Celebration   = 7,
  PersonalPlan  = 8,
  HearAbout     = 9,
  Notifications = 10,
  SignIn        = 11,
  Paywall       = 12,
}

const TOTAL_STEPS = 13;

const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30, 50];

const HEAR_ABOUT_OPTIONS = [
  { key: 'appstore', label: 'App Store / Play Store', icon: '📱' },
  { key: 'friend',   label: 'Friend or Family',       icon: '👥' },
  { key: 'social',   label: 'Social Media',           icon: '📲' },
  { key: 'search',   label: 'Search Engine',          icon: '🔍' },
  { key: 'ad',       label: 'Online Ad',              icon: '📢' },
  { key: 'other',    label: 'Other',                  icon: '✨' },
];

const CEFR_LEVELS = [
  { key: 'A1', label: 'A1', description: "I'm just starting out",      band: 4,   color: '#22c55e' },
  { key: 'A2', label: 'A2', description: 'I know basic phrases',       band: 5,   color: '#4ade80' },
  { key: 'B1', label: 'B1', description: 'I can handle familiar topics', band: 5.5, color: '#0ea5e9' },
  { key: 'B2', label: 'B2', description: 'I can discuss most topics',  band: 6.5, color: '#3b82f6' },
  { key: 'C1', label: 'C1', description: 'I speak fluently',           band: 7.5, color: '#8b5cf6' },
  { key: 'C2', label: 'C2', description: 'I want native-level mastery', band: 8.5, color: '#a855f7' },
] as const;

const SWIPE_THRESHOLD = 80;

/* ─── Helpers ─────────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOnboardingCards(band: number): Flashcard[] {
  const eligible = allCards.filter(
    (c) => c.difficulty === 'easy' && (c.band == null || c.band <= band),
  );
  return shuffle(eligible.length >= 3 ? eligible : allCards.filter((c) => c.difficulty === 'easy')).slice(0, 3);
}

/* ─── Animated dot ─────────────────────────────────────────────── */

function Dot({ active, color }: { active: boolean; color: string }) {
  const w = useSharedValue(active ? 28 : 8);
  useEffect(() => { w.value = withSpring(active ? 28 : 8, { damping: 18, stiffness: 200 }); }, [active]);
  const style = useAnimatedStyle(() => ({ width: w.value, backgroundColor: active ? color : '#cccccc44' }));
  return <Animated.View style={[styles.dot, style]} />;
}

/* ─── Floating icon ────────────────────────────────────────────── */

function FloatingIcon({ Icon, color }: { Icon: typeof Mic; color: string }) {
  const floatY      = useSharedValue(0);
  const scale       = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value  = withSpring(1, { damping: 12, stiffness: 100 });
    floatY.value = withDelay(300,
      withRepeat(withSequence(
        withTiming(-12, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, true),
    );
    glowOpacity.value = withDelay(300,
      withRepeat(withSequence(
        withTiming(0.6, { duration: 1800 }),
        withTiming(0.2, { duration: 1800 }),
      ), -1, true),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Animated.View style={[styles.iconWrapper, containerStyle]}>
      <Animated.View style={[styles.glowRing,      { borderColor: color }, glowStyle]} />
      <Animated.View style={[styles.glowRingInner, { borderColor: color }, glowStyle]} />
      <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
        <Icon size={52} color={color} strokeWidth={1.5} />
      </View>
    </Animated.View>
  );
}

/* ─── Background blob ──────────────────────────────────────────── */

function BackgroundBlob({ color }: { color: string }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    return () => { opacity.value = 0; };
  }, [color]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.blob, { backgroundColor: `${color}12` }, style]} />;
}

/* ─── Step 0: Welcome Splash ──────────────────────────────────── */

function WelcomeSplash() {
  const T = useT();

  const features = [
    T.onboardingWelcomeFeature1,
    T.onboardingWelcomeFeature2,
    T.onboardingWelcomeFeature3,
  ];

  return (
    <View style={styles.welcomeLayout}>
      {/* Brand tag */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(400).springify()}
        style={styles.welcomeBrandRow}
      >
        <View style={styles.welcomeBrandDot} />
        <Text style={styles.welcomeBrandLabel}>VOCALLY</Text>
      </Animated.View>

      {/* Big editorial headline */}
      <Animated.Text
        entering={FadeInDown.delay(160).duration(500).springify()}
        style={styles.welcomeH1}
      >
        {'Build real\nEnglish\nfluency.'}
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        entering={FadeInDown.delay(320).duration(400).springify()}
        style={styles.welcomeTagline}
      >
        {T.onboardingWelcomeSub}
      </Animated.Text>

      {/* Feature list */}
      <Animated.View
        entering={FadeInDown.delay(440).duration(400).springify()}
        style={styles.welcomeChecklist}
      >
        {features.map((f, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(480 + i * 80).duration(300)}
            style={styles.welcomeCheckRow}
          >
            <View style={styles.welcomeCheckDot} />
            <Text style={styles.welcomeCheckText}>{f}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

/* ─── Step label (small caps above heading) ────────────────────── */

function StepLabel({ children, color }: { children: string; color: string }) {
  return (
    <Animated.Text
      entering={FadeInDown.delay(40).duration(350)}
      style={[styles.stepLabel, { color }]}
    >
      {children}
    </Animated.Text>
  );
}

/* ─── Step 1: Language picker ──────────────────────────────────── */

function LanguageSlide({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (code: string) => void;
}) {
  const t = useTheme();
  const T = useT();
  const accent = '#f4511e';

  return (
    <>
      <StepLabel color={accent}>LANGUAGE</StepLabel>

      <Animated.Text
        entering={FadeInDown.delay(120).duration(400).springify()}
        style={[styles.slideH2, { color: t.fg }]}
      >
        {T.onboardingYourLanguage}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.slideSub, { color: t.muted }]}
      >
        {T.onboardingPersonalise}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(280).duration(400).springify()}
        style={styles.langGrid}
      >
        {NATIVE_LANGUAGES.map((lang) => {
          const active = selected === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => onSelect(lang.code)}
              style={[
                styles.langPill,
                { borderColor: active ? accent : t.border, backgroundColor: active ? `${accent}15` : t.surface },
              ]}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, { color: active ? accent : t.fg }]}>{lang.name}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </>
  );
}

/* ─── Step 2: Current Level (CEFR) ─────────────────────────────── */

function CurrentLevelSlide({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const t = useTheme();
  const T = useT();

  return (
    <>
      <StepLabel color="#0ea5e9">CURRENT LEVEL</StepLabel>

      <Animated.Text
        entering={FadeInDown.delay(120).duration(400).springify()}
        style={[styles.slideH2, { color: t.fg }]}
      >
        {T.onboardingCurrentLevel}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.slideSub, { color: t.muted }]}
      >
        {T.onboardingCurrentLevelSub}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(280).duration(400).springify()}
        style={styles.proficiencyGrid}
      >
        {CEFR_LEVELS.map((level) => {
          const active = selected === level.key;
          return (
            <Pressable
              key={level.key}
              onPress={() => onSelect(level.key)}
              style={[
                styles.proficiencyCard,
                {
                  borderColor: active ? level.color : t.border,
                  backgroundColor: active ? `${level.color}12` : t.surface,
                },
              ]}
            >
              <View style={[styles.cefrBadge, { backgroundColor: active ? level.color : `${level.color}20` }]}>
                <Text style={[styles.cefrBadgeText, { color: active ? '#fff' : level.color }]}>
                  {level.label}
                </Text>
              </View>
              <Text style={[styles.proficiencyDesc, { color: active ? level.color : t.muted }]}>
                {level.description}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </>
  );
}

/* ─── Step 3: Target Level (CEFR, filtered) ────────────────────── */

function TargetLevelSlide({
  currentLevel,
  selected,
  onSelect,
}: {
  currentLevel: string;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const t = useTheme();
  const T = useT();

  const currentIdx = CEFR_LEVELS.findIndex((l) => l.key === currentLevel);
  const availableLevels = CEFR_LEVELS.filter((_, i) => i > currentIdx);

  return (
    <>
      <StepLabel color="#8b5cf6">TARGET LEVEL</StepLabel>

      <Animated.Text
        entering={FadeInDown.delay(120).duration(400).springify()}
        style={[styles.slideH2, { color: t.fg }]}
      >
        {T.onboardingTargetLevel}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.slideSub, { color: t.muted }]}
      >
        {T.onboardingTargetLevelSub}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(280).duration(400).springify()}
        style={styles.proficiencyGrid}
      >
        {availableLevels.map((level) => {
          const active = selected === level.key;
          return (
            <Pressable
              key={level.key}
              onPress={() => onSelect(level.key)}
              style={[
                styles.proficiencyCard,
                {
                  borderColor: active ? level.color : t.border,
                  backgroundColor: active ? `${level.color}12` : t.surface,
                },
              ]}
            >
              <View style={[styles.cefrBadge, { backgroundColor: active ? level.color : `${level.color}20` }]}>
                <Text style={[styles.cefrBadgeText, { color: active ? '#fff' : level.color }]}>
                  {level.label}
                </Text>
              </View>
              <Text style={[styles.proficiencyDesc, { color: active ? level.color : t.muted }]}>
                {level.description}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </>
  );
}

/* ─── Step 4: Daily Goal ───────────────────────────────────────── */

function DailyGoalSlide({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (n: number) => void;
}) {
  const t = useTheme();
  const accent = '#22c55e';
  const count = selected > 0 ? selected : 10;

  // Auto-init to 10 so the button is always enabled
  useEffect(() => { if (selected === 0) onSelect(10); }, []);

  const numScale = useSharedValue(1);
  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: numScale.value }] }));

  function change(next: number) {
    const clamped = Math.min(50, Math.max(5, next));
    if (clamped === count) return;
    numScale.value = withSequence(
      withTiming(0.82, { duration: 70 }),
      withSpring(1, { damping: 8, stiffness: 340 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(clamped);
  }

  const caption = count <= 5  ? "Easy does it — habit first 🌿"
    : count <= 10 ? "🌱 A gentle daily rhythm"
    : count <= 20 ? "🔥 Building real momentum"
    :               "🚀 Full intensity — let's go";

  const canDec = count > 5;
  const canInc = count < 50;

  return (
    <View style={styles.goalLayout}>
      <Animated.Text
        entering={FadeInDown.delay(60).duration(400).springify()}
        style={[styles.goalHeading, { color: t.fg }]}
      >
        {'Words per day'}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(140).duration(400).springify()}
        style={[styles.goalSubheading, { color: t.muted }]}
      >
        Pick a goal you'll actually stick to
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(220).duration(400).springify()}
        style={styles.counterRow}
      >
        <Pressable
          onPress={() => change(count - 5)}
          disabled={!canDec}
          hitSlop={16}
          style={[styles.counterBtn, {
            borderColor:     canDec ? accent : `${t.muted}30`,
            backgroundColor: canDec ? `${accent}12` : 'transparent',
          }]}
        >
          <Minus size={22} color={canDec ? accent : `${t.muted}50`} strokeWidth={2.5} />
        </Pressable>

        <Animated.View style={[styles.counterDisplay, numStyle]}>
          <Text style={[styles.counterNumber, { color: accent }]}>{count}</Text>
          <Text style={[styles.counterUnit, { color: t.muted }]}>words / day</Text>
        </Animated.View>

        <Pressable
          onPress={() => change(count + 5)}
          disabled={!canInc}
          hitSlop={16}
          style={[styles.counterBtn, {
            borderColor:     canInc ? accent : `${t.muted}30`,
            backgroundColor: canInc ? `${accent}12` : 'transparent',
          }]}
        >
          <Plus size={22} color={canInc ? accent : `${t.muted}50`} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      {/* Scale bar */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={[styles.goalScaleTrack, { backgroundColor: `${t.muted}18` }]}
      >
        <View style={[styles.goalScaleFill, { backgroundColor: accent, width: `${((count - 5) / 45) * 100}%` }]} />
      </Animated.View>
      <View style={styles.goalScaleLabels}>
        <Text style={[styles.goalScaleLabel, { color: t.muted }]}>5</Text>
        <Text style={[styles.goalScaleLabel, { color: t.muted }]}>50</Text>
      </View>

      <Animated.Text
        entering={FadeInDown.delay(380).duration(400)}
        key={caption}
        style={[styles.counterCaption, { color: t.muted }]}
      >
        {caption}
      </Animated.Text>
    </View>
  );
}

/* ─── Step 5: Feature highlights ───────────────────────────────── */

function FeatureHighlightsSlide() {
  const t = useTheme();
  const T = useT();
  const accent = '#8b5cf6';

  const features = [
    { num: '01', Icon: Mic,      color: '#f4511e', title: T.onboardingSpeaking,  sub: T.onboardingSpeakingSub },
    { num: '02', Icon: BookOpen, color: '#0ea5e9', title: T.onboardingVocab,     sub: T.onboardingVocabSub },
    { num: '03', Icon: Sparkles, color: '#8b5cf6', title: T.onboardingFeedback,  sub: T.onboardingFeedbackSub },
  ];

  return (
    <View style={styles.featLayout}>
      <StepLabel color={accent}>WHAT YOU GET</StepLabel>
      <Animated.Text
        entering={FadeInDown.delay(120).duration(400).springify()}
        style={[styles.slideH2, { color: t.fg }]}
      >
        {T.onboardingFeatures}
      </Animated.Text>

      <View style={styles.featList}>
        {features.map((feat, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(220 + i * 110).duration(400).springify()}
            style={[styles.featCard, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <View style={styles.featNumRow}>
              <Text style={[styles.featNum, { color: `${feat.color}35` }]}>{feat.num}</Text>
              <View style={[styles.featIconBadge, { backgroundColor: `${feat.color}18` }]}>
                <feat.Icon size={20} color={feat.color} strokeWidth={1.8} />
              </View>
            </View>
            <Text style={[styles.featTitle, { color: t.fg }]}>{feat.title}</Text>
            <Text style={[styles.featSub, { color: t.muted }]}>{feat.sub}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/* ─── Step 5: Mini flashcard session (enriched) ────────────────── */

function MiniFlashcardSlide({
  cards,
  cardIndex,
  onSwipe,
}: {
  cards: Flashcard[];
  cardIndex: number;
  onSwipe: () => void;
}) {
  const t = useTheme();
  const T = useT();
  const { ttsVoice } = useSettings();
  const [flipped, setFlipped] = useState(false);
  const flipProgress = useSharedValue(0);
  const translateX   = useSharedValue(0);
  const cardOpacity  = useSharedValue(1);

  useEffect(() => {
    setFlipped(false);
    flipProgress.value = withTiming(0, { duration: 200 });
    translateX.value   = 0;
    cardOpacity.value  = withTiming(1, { duration: 200 });
  }, [cardIndex]);

  const card = cards[cardIndex];
  if (!card) return null;

  const example = card.examples?.[0] ?? card.example;
  const diffColor = card.difficulty === 'hard' ? '#ef4444' : card.difficulty === 'medium' ? '#f59e0b' : '#22c55e';

  function handleFlip() {
    const toFlipped = !flipped;
    flipProgress.value = withTiming(toFlipped ? 1 : 0, {
      duration: 360,
      easing: Easing.inOut(Easing.quad),
    });
    setFlipped(toFlipped);
  }

  function handleSpeak() {
    void ttsSpeak(card.word, ttsVoice, 0.85);
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const absX = Math.abs(e.translationX);
      const absVelX = Math.abs(e.velocityX);
      if (absX > SWIPE_THRESHOLD || absVelX > 500) {
        const direction = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(SCREEN_W * 1.5 * direction, { duration: 300 });
        cardOpacity.value = withTiming(0, { duration: 200 }, (done) => {
          if (done) runOnJS(onSwipe)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_W, 0, SCREEN_W], [-15, 0, 15])}deg` },
    ],
    opacity: cardOpacity.value,
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 0.5, 1], [1, 1, 0, 0]),
    transform: [{ rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 0.5, 1], [0, 0, 1, 1]),
    transform: [{ rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  return (
    <>
      <Animated.Text
        entering={FadeInDown.delay(80).duration(400).springify()}
        style={[styles.title, { color: t.fg, marginBottom: 8 }]}
      >
        {T.onboardingTryIt}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(180).duration(400).springify()}
        style={[styles.subtitle, { color: t.muted, marginBottom: 24 }]}
      >
        {T.onboardingTryItSub}
      </Animated.Text>

      {/* Progress dots */}
      <View style={styles.miniProgress}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.miniDot,
              { backgroundColor: i <= cardIndex ? '#f4511e' : `${t.muted}44` },
            ]}
          />
        ))}
      </View>

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.miniCard, cardAnimStyle]}>
          {/* Front face — enriched */}
          <Animated.View style={[styles.miniFace, { backgroundColor: t.surface, borderColor: t.border }, frontStyle]}>
            <Pressable onPress={handleFlip} style={StyleSheet.absoluteFillObject}>
              <View style={styles.miniFaceContent} pointerEvents="none">
                {/* Meta pills */}
                <View style={styles.miniMetaRow}>
                  {card.band != null && (
                    <View style={[styles.miniPill, { backgroundColor: `${t.muted}18` }]}>
                      <Text style={[styles.miniPillText, { color: t.muted }]}>Band {card.band}</Text>
                    </View>
                  )}
                  {card.category && (
                    <View style={[styles.miniPill, { backgroundColor: `${t.muted}18` }]}>
                      <Text style={[styles.miniPillText, { color: t.muted }]}>{card.category}</Text>
                    </View>
                  )}
                  <View style={[styles.miniDiffDot, { backgroundColor: diffColor }]} />
                </View>

                <Text style={[styles.miniWord, { color: t.fg }]}>{card.word}</Text>
                {card.phonetic && <Text style={[styles.miniPhonetic, { color: t.muted }]}>{card.phonetic}</Text>}
                {card.partOfSpeech && (
                  <Text style={[styles.miniPos, { color: '#f4511e' }]}>{card.partOfSpeech}</Text>
                )}
                <Text style={[styles.hint, { color: t.muted }]}>{T.onboardingTapReveal}</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleSpeak} style={styles.speakBtn} hitSlop={10}>
              <Volume2 size={18} color={t.muted} strokeWidth={1.8} />
            </Pressable>
          </Animated.View>

          {/* Back face — enriched */}
          <Animated.View style={[styles.miniFace, { backgroundColor: t.surface, borderColor: t.border }, backStyle]}>
            <Pressable onPress={handleFlip} style={StyleSheet.absoluteFillObject}>
              <View style={[styles.miniFaceContent, { justifyContent: 'flex-start', paddingTop: 28 }]} pointerEvents="none">
                <Text style={[styles.miniWord, { color: t.fg, fontSize: 26 }]}>{card.word}</Text>
                <View style={[styles.miniDivider, { backgroundColor: t.border }]} />
                <Text style={[styles.miniDefinition, { color: t.fg }]}>{card.definition}</Text>
                {example ? (
                  <View style={styles.miniExampleRow}>
                    <Text style={[styles.miniExampleQuote, { color: '#f4511e' }]}>"</Text>
                    <Text style={[styles.miniExampleText, { color: t.muted }]}>{example}</Text>
                  </View>
                ) : null}
                {card.tip ? (
                  <View style={[styles.miniTipBox, { borderColor: t.border }]}>
                    <Text style={[styles.miniTipText, { color: t.muted }]}>💡 {card.tip}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
            <Pressable onPress={handleSpeak} style={styles.speakBtn} hitSlop={10}>
              <Volume2 size={18} color={t.muted} strokeWidth={1.8} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

/* ─── Step 6: Celebration ──────────────────────────────────────── */

const CONFETTI_COUNT  = 24;
const CONFETTI_COLORS = ['#f4511e', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899'];

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0);
  const rotate     = useSharedValue(0);

  const angle    = React.useRef(Math.random() * Math.PI * 2).current;
  const distance = React.useRef(80 + Math.random() * 160).current;
  const targetX  = Math.cos(angle) * distance;
  const targetY  = Math.sin(angle) * distance - 60;
  const size     = React.useRef(6 + Math.random() * 8).current;
  const isCircle = React.useRef(Math.random() > 0.5).current;
  const dir      = React.useRef(Math.random() > 0.5 ? 1 : -1).current;

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 8, stiffness: 200 }),
      withDelay(400, withTiming(0, { duration: 300 })),
    ));
    translateX.value = withDelay(delay, withTiming(targetX, { duration: 800, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(targetY, { duration: 800, easing: Easing.out(Easing.cubic) }));
    rotate.value     = withDelay(delay, withTiming(360 * dir, { duration: 800 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: isCircle ? size : size * 2.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function CelebrationSlide({ learnedWords }: { learnedWords: Flashcard[] }) {
  const t = useTheme();
  const T = useT();

  return (
    <>
      <View style={styles.confettiContainer}>
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiParticle
            key={i}
            delay={i * 40}
            color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
          />
        ))}
      </View>

      <Animated.Text
        entering={FadeInDown.delay(300).duration(400).springify()}
        style={[styles.celebTitle, { color: t.fg }]}
      >
        {T.onboardingAmazing}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(450).duration(400).springify()}
        style={[styles.celebSub, { color: t.muted }]}
      >
        {T.onboardingLearned.replace('{0}', String(learnedWords.length))}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(600).duration(400).springify()}
        style={styles.learnedWordsRow}
      >
        {learnedWords.map((card) => (
          <View key={card.word} style={[styles.learnedPill, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.learnedWord, { color: t.fg }]}>{card.word}</Text>
          </View>
        ))}
      </Animated.View>
    </>
  );
}

/* ─── Step 7: Personal Plan (animated loading) ─────────────────── */

function PersonalPlanSlide({ onComplete }: { onComplete: () => void }) {
  const t = useTheme();
  const T = useT();
  const [visibleSteps, setVisibleSteps] = useState(0);
  const progressWidth = useSharedValue(0);

  const planSteps = [
    T.onboardingPlanStep1,
    T.onboardingPlanStep2,
    T.onboardingPlanStep3,
    T.onboardingPlanStep4,
  ];

  useEffect(() => {
    progressWidth.value = withTiming(100, { duration: 3200, easing: Easing.inOut(Easing.quad) });

    const timers: ReturnType<typeof setTimeout>[] = [];
    planSteps.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleSteps(i + 1), 700 + i * 700));
    });
    timers.push(setTimeout(onComplete, 700 + planSteps.length * 700 + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  return (
    <>
      <Animated.Text
        entering={FadeInDown.delay(80).duration(400).springify()}
        style={[styles.title, { color: t.fg }]}
      >
        {T.onboardingPlanTitle}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={styles.planProgressContainer}
      >
        <View style={[styles.planProgressTrack, { backgroundColor: `${t.muted}22` }]}>
          <Animated.View style={[styles.planProgressBar, { backgroundColor: '#f4511e' }, progressStyle]} />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400).springify()}
        style={styles.planChecklist}
      >
        {planSteps.map((stepText, i) => {
          const visible = i < visibleSteps;
          const isLast = i === planSteps.length - 1;
          return (
            <Animated.View
              key={i}
              entering={visible ? FadeInDown.duration(300).springify() : undefined}
              style={[
                styles.planCheckItem,
                { opacity: visible ? 1 : 0.3 },
              ]}
            >
              <CheckCircle
                size={20}
                color={visible ? (isLast ? '#22c55e' : '#f4511e') : t.muted}
                strokeWidth={2}
              />
              <Text style={[
                styles.planCheckText,
                { color: visible ? t.fg : t.muted },
                isLast && visible && { fontFamily: F.bold, color: '#22c55e' },
              ]}>
                {stepText}
              </Text>
            </Animated.View>
          );
        })}
      </Animated.View>
    </>
  );
}

/* ─── Step 8: Notifications ─────────────────────────────────────── */

function NotificationSlide({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
  const t = useTheme();
  const T = useT();
  const [loading, setLoading] = useState(false);
  const accent = '#f59e0b';

  function handleEnable() {
    setLoading(true);
    setTimeout(onEnable, 1200);
  }

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(80).duration(400).springify()}
        style={styles.iconContainer}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
          <Bell size={52} color={accent} strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.title, { color: t.fg }]}
      >
        {T.onboardingNotifTitle}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(300).duration(400).springify()}
        style={[styles.subtitle, { color: t.muted }]}
      >
        {T.onboardingNotifSub}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(420).duration(400).springify()}
        style={styles.notifButtons}
      >
        <Pressable
          onPress={handleEnable}
          disabled={loading}
          style={[styles.btn, { backgroundColor: accent }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{T.onboardingNotifEnable}</Text>
          }
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text style={[styles.skipLinkText, { color: t.muted }]}>{T.onboardingNotifSkip}</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

/* ─── Step 9: Sign In ──────────────────────────────────────────── */

function SignInSlide({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const T = useT();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple,  setLoadingApple]  = useState(false);

  function handleGoogle() {
    setLoadingGoogle(true);
    setTimeout(onNext, 1500);
  }

  function handleApple() {
    setLoadingApple(true);
    setTimeout(onNext, 1500);
  }

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(80).duration(400).springify()}
        style={styles.signInLogo}
      >
        <View style={[styles.signInLogoCircle, { backgroundColor: '#f4511e' }]}>
          <Text style={styles.signInLogoEmoji}>🎙</Text>
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.title, { color: t.fg }]}
      >
        {T.onboardingSignInTitle}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(300).duration(400).springify()}
        style={[styles.subtitle, { color: t.muted }]}
      >
        {T.onboardingSignInSub}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(420).duration(400).springify()}
        style={styles.signInButtons}
      >
        <Pressable
          onPress={handleGoogle}
          disabled={loadingGoogle || loadingApple}
          style={[styles.socialBtn, { backgroundColor: t.surface, borderColor: t.border }]}
        >
          {loadingGoogle
            ? <ActivityIndicator size="small" color={t.fg} />
            : <Text style={styles.googleG}>G</Text>
          }
          <Text style={[styles.socialBtnText, { color: t.fg }]}>{T.onboardingSignInGoogle}</Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            disabled={loadingGoogle || loadingApple}
            style={[
              styles.socialBtn,
              { backgroundColor: t.dark ? '#ffffff' : '#000000', borderWidth: 0 },
            ]}
          >
            {loadingApple
              ? <ActivityIndicator size="small" color={t.dark ? '#000' : '#fff'} />
              : <Text style={[styles.appleLogo, { color: t.dark ? '#000' : '#fff' }]}></Text>
            }
            <Text style={[styles.socialBtnText, { color: t.dark ? '#000000' : '#ffffff' }]}>
              {T.onboardingSignInApple}
            </Text>
          </Pressable>
        )}

        <Pressable onPress={onNext} hitSlop={12}>
          <Text style={[styles.skipLinkText, { color: t.muted }]}>{T.onboardingSignInSkip}</Text>
        </Pressable>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(540).duration(400).springify()}
        style={[styles.termsText, { color: t.muted }]}
      >
        {T.onboardingSignInTerms}{' '}
        <Text style={{ color: '#f4511e' }}>{T.onboardingTermsOfService}</Text>
        {' & '}
        <Text style={{ color: '#f4511e' }}>{T.onboardingPrivacyPolicy}</Text>
      </Animated.Text>
    </>
  );
}

/* ─── Step 10: Paywall ─────────────────────────────────────────── */

function PaywallSlide({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const T = useT();
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const monthlyPrice = '$5.99';
  const yearlyPrice  = '$49.99';
  const yearlyMonthly = '$4.17/mo';

  function handlePurchase() {
    setPurchasing(true);
    setTimeout(onNext, 1500);
  }

  const BENEFITS = [
    { icon: '🎙', text: T.paywallBenefit1 },
    { icon: '✦',  text: T.paywallBenefit2 },
    { icon: '📌', text: T.paywallBenefit3 },
    { icon: '📚', text: T.paywallBenefit4 },
    { icon: '🎯', text: T.paywallBenefit5 },
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.paywallScroll}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(80).duration(400).springify()} style={styles.paywallHero}>
        <View style={[styles.proBadge, { backgroundColor: '#f4511e' }]}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={[styles.title, { color: t.fg, marginTop: 12 }]}>{T.onboardingPaywallTitle}</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>{T.onboardingPaywallSub}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.benefitsCard, { backgroundColor: t.surface, borderColor: t.border }]}
      >
        {BENEFITS.map((b, i) => (
          <View
            key={i}
            style={[
              styles.benefitRow,
              i < BENEFITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
            ]}
          >
            <Text style={styles.benefitIcon}>{b.icon}</Text>
            <Text style={[styles.benefitText, { color: t.fg }]}>{b.text}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(400).springify()} style={styles.plans}>
        <Pressable
          onPress={() => setSelected('yearly')}
          style={[
            styles.planCard,
            { backgroundColor: t.surface, borderColor: selected === 'yearly' ? '#f4511e' : t.border },
          ]}
        >
          <View style={styles.planCardInner}>
            <View style={styles.planLeft}>
              <View style={styles.planRadioRow}>
                <View style={[styles.radio, { borderColor: selected === 'yearly' ? '#f4511e' : t.muted }]}>
                  {selected === 'yearly' && <View style={[styles.radioDot, { backgroundColor: '#f4511e' }]} />}
                </View>
                <Text style={[styles.planLabel, { color: t.fg }]}>{T.planYearly}</Text>
                <View style={[styles.saveBadge, { backgroundColor: '#f4511e22' }]}>
                  <Text style={[styles.saveBadgeText, { color: '#f4511e' }]}>{T.planBestValue}</Text>
                </View>
              </View>
              <Text style={[styles.planSubLabel, { color: t.muted }]}>
                {yearlyMonthly} · {T.planBilledAnnual}
              </Text>
            </View>
            <Text style={[styles.planPrice, { color: t.fg }]}>{yearlyPrice}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setSelected('monthly')}
          style={[
            styles.planCard,
            { backgroundColor: t.surface, borderColor: selected === 'monthly' ? '#f4511e' : t.border },
          ]}
        >
          <View style={styles.planCardInner}>
            <View style={styles.planLeft}>
              <View style={styles.planRadioRow}>
                <View style={[styles.radio, { borderColor: selected === 'monthly' ? '#f4511e' : t.muted }]}>
                  {selected === 'monthly' && <View style={[styles.radioDot, { backgroundColor: '#f4511e' }]} />}
                </View>
                <Text style={[styles.planLabel, { color: t.fg }]}>{T.planMonthly}</Text>
              </View>
              <Text style={[styles.planSubLabel, { color: t.muted }]}>{T.planBilledMonthly}</Text>
            </View>
            <Text style={[styles.planPrice, { color: t.fg }]}>{monthlyPrice}</Text>
          </View>
        </Pressable>
      </Animated.View>

      <Pressable
        onPress={handlePurchase}
        disabled={purchasing}
        style={[styles.btn, { backgroundColor: '#f4511e', opacity: purchasing ? 0.85 : 1 }]}
      >
        {purchasing
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>
              {selected === 'yearly'
                ? `${T.ctaStartFor}${yearlyPrice}${T.ctaPerYear}`
                : `${T.ctaStartFor}${monthlyPrice}${T.ctaPerMonth}`}
            </Text>
        }
      </Pressable>

      <Text style={[styles.trialText, { color: t.muted }]}>{T.cancelAnytime}</Text>

      <Pressable onPress={onNext} hitSlop={12} style={{ marginTop: 8, alignSelf: 'center' }}>
        <Text style={[styles.skipLinkText, { color: t.muted }]}>{T.onboardingPaywallSkip}</Text>
      </Pressable>

      <View style={styles.paywallFooter}>
        <Text style={[styles.footerLink, { color: t.muted }]}>{T.restorePurchases}</Text>
        <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
        <Text style={[styles.footerLink, { color: t.muted }]}>{T.termsLabel}</Text>
        <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
        <Text style={[styles.footerLink, { color: t.muted }]}>{T.privacyLabel}</Text>
      </View>
    </ScrollView>
  );
}

/* ─── Step 9: Hear About ───────────────────────────────────────── */

function HearAboutSlide({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const t = useTheme();
  const accent = '#8b5cf6';

  return (
    <>
      <StepLabel color={accent}>QUICK QUESTION</StepLabel>

      <Animated.Text
        entering={FadeInDown.delay(120).duration(400).springify()}
        style={[styles.slideH2, { color: t.fg }]}
      >
        {'How did you hear\nabout Vocally?'}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(200).duration(400).springify()}
        style={[styles.slideSub, { color: t.muted }]}
      >
        Help us understand how people find us
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(280).duration(400).springify()}
        style={styles.hearAboutGrid}
      >
        {HEAR_ABOUT_OPTIONS.map((opt) => {
          const active = selected === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              style={[
                styles.hearAboutCard,
                { borderColor: active ? accent : t.border, backgroundColor: active ? `${accent}15` : t.surface },
              ]}
            >
              <Text style={styles.hearAboutIcon}>{opt.icon}</Text>
              <Text style={[styles.hearAboutLabel, { color: active ? accent : t.fg }]}>{opt.label}</Text>
              {active && <CheckCircle size={16} color={accent} strokeWidth={2} />}
            </Pressable>
          );
        })}
      </Animated.View>
    </>
  );
}

/* ─── Screen ──────────────────────────────────────────────────── */

export default function WelcomeScreen() {
  const t      = useTheme();
  const T      = useT();
  const router = useRouter();
  const { nativeLanguage, setNativeLanguage, setTargetBand, setDailyGoal } = useSettings();

  const [step,            setStep]            = useState<Step>(Step.Welcome);
  const [langSel,         setLangSel]         = useState(nativeLanguage || '');
  const [currentLevelSel, setCurrentLevelSel] = useState('');
  const [targetLevelSel,  setTargetLevelSel]  = useState('');
  const [dailyGoalSel,    setDailyGoalSel]    = useState(10);
  const [hearAboutSel,    setHearAboutSel]    = useState('');
  const [onboardingCards, setOnboardingCards]  = useState<Flashcard[]>([]);
  const [cardIndex,       setCardIndex]       = useState(0);

  function handleLangSelect(code: string) {
    setLangSel(code);
    setNativeLanguage(code);
  }

  // Clear target if current level changes
  useEffect(() => {
    if (currentLevelSel) {
      const currentIdx = CEFR_LEVELS.findIndex((l) => l.key === currentLevelSel);
      const targetIdx  = CEFR_LEVELS.findIndex((l) => l.key === targetLevelSel);
      if (targetIdx <= currentIdx) setTargetLevelSel('');
    }
  }, [currentLevelSel]);

  // Prepare flashcard deck when current level is selected
  useEffect(() => {
    if (currentLevelSel) {
      const level = CEFR_LEVELS.find((l) => l.key === currentLevelSel);
      if (level) setOnboardingCards(getOnboardingCards(level.band));
    }
  }, [currentLevelSel]);

  async function finish() {
    if (targetLevelSel) {
      const level = CEFR_LEVELS.find((l) => l.key === targetLevelSel);
      if (level) setTargetBand(level.band);
    }
    if (dailyGoalSel > 0) setDailyGoal(dailyGoalSel);
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    router.replace('/');
  }

  function next() {
    if (step === Step.Paywall) { void finish(); return; }
    setStep((s) => s + 1);
  }

  function handleFlashcardSwipe() {
    if (cardIndex + 1 >= onboardingCards.length) {
      setStep(Step.Celebration);
    } else {
      setCardIndex((i) => i + 1);
    }
  }

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  function onBtnPressIn()  { btnScale.value = withSpring(0.95); }
  function onBtnPressOut() { btnScale.value = withSpring(1); }

  const canAdvance = (() => {
    switch (step) {
      case Step.Language:     return langSel !== '';
      case Step.CurrentLevel: return currentLevelSel !== '';
      case Step.TargetLevel:  return targetLevelSel !== '';
      case Step.DailyGoal:    return true; // always valid — auto-inits to 10
      case Step.Flashcards:   return false;
      case Step.PersonalPlan: return false;
      default:                return true;
    }
  })();

  const showBottom = ![
    Step.Flashcards, Step.PersonalPlan,
    Step.Notifications, Step.SignIn, Step.Paywall,
  ].includes(step);

  const btnLabel = (() => {
    switch (step) {
      case Step.Welcome:     return T.onboardingGetStarted;
      case Step.Celebration: return T.onboardingKeepGoing;
      default:               return T.onboardingNext;
    }
  })();

  const stepAccent = (() => {
    switch (step) {
      case Step.Welcome:       return '#f4511e';
      case Step.Language:      return '#f4511e';
      case Step.CurrentLevel:  return '#0ea5e9';
      case Step.TargetLevel:   return '#8b5cf6';
      case Step.DailyGoal:     return '#22c55e';
      case Step.Features:      return '#8b5cf6';
      case Step.Flashcards:    return '#0ea5e9';
      case Step.Celebration:   return '#22c55e';
      case Step.PersonalPlan:  return '#f4511e';
      case Step.HearAbout:     return '#8b5cf6';
      case Step.Notifications: return '#f59e0b';
      case Step.SignIn:        return '#3b82f6';
      case Step.Paywall:       return '#f4511e';
    }
  })();

  const showSkip = step > Step.Welcome && step < Step.Paywall
    && step !== Step.PersonalPlan && step !== Step.Notifications
    && step !== Step.SignIn;

  const isWelcome = step === Step.Welcome;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isWelcome ? '#f4511e' : t.bg }]}>
      {!isWelcome && <BackgroundBlob key={`blob-${step}`} color={stepAccent} />}

      {showSkip && (
        <Animated.View entering={FadeIn} style={styles.skipRow}>
          <Pressable onPress={() => void finish()} hitSlop={12}>
            <Text style={[styles.skipText, { color: t.muted }]}>{T.skip}</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        key={step}
        entering={isWelcome
          ? FadeIn.duration(600)
          : SlideInRight.duration(320).easing(Easing.out(Easing.poly(4)))}
        style={{ flex: 1 }}
      >
        {step === Step.Welcome && (
          <View style={styles.welcomeContainer}><WelcomeSplash /></View>
        )}

        {step === Step.Language && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
            <LanguageSlide selected={langSel} onSelect={handleLangSelect} />
          </ScrollView>
        )}

        {step === Step.CurrentLevel && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
            <CurrentLevelSlide selected={currentLevelSel} onSelect={setCurrentLevelSel} />
          </ScrollView>
        )}

        {step === Step.TargetLevel && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
            <TargetLevelSlide currentLevel={currentLevelSel} selected={targetLevelSel} onSelect={setTargetLevelSel} />
          </ScrollView>
        )}

        {step === Step.DailyGoal && (
          <View style={styles.goalContainer}>
            <DailyGoalSlide selected={dailyGoalSel} onSelect={setDailyGoalSel} />
          </View>
        )}

        {step === Step.Features && (
          <View style={{ flex: 1 }}><FeatureHighlightsSlide /></View>
        )}

        {step === Step.Flashcards && (
          <View style={styles.content}>
            <MiniFlashcardSlide cards={onboardingCards} cardIndex={cardIndex} onSwipe={handleFlashcardSwipe} />
          </View>
        )}

        {step === Step.Celebration && (
          <View style={styles.content}><CelebrationSlide learnedWords={onboardingCards} /></View>
        )}

        {step === Step.PersonalPlan && (
          <View style={styles.content}><PersonalPlanSlide onComplete={next} /></View>
        )}

        {step === Step.HearAbout && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
            <HearAboutSlide selected={hearAboutSel} onSelect={setHearAboutSel} />
          </ScrollView>
        )}

        {step === Step.Notifications && (
          <View style={styles.content}><NotificationSlide onEnable={next} onSkip={next} /></View>
        )}

        {step === Step.SignIn && (
          <View style={styles.content}><SignInSlide onNext={next} /></View>
        )}

        {step === Step.Paywall && (
          <PaywallSlide onNext={() => void finish()} />
        )}
      </Animated.View>

      {showBottom && (
        <View style={[styles.bottom, isWelcome && styles.bottomWelcome]}>
          {!isWelcome && (
            <View style={styles.dots}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <Dot key={i} active={i === step} color={stepAccent} />
              ))}
            </View>
          )}

          <Animated.View style={[styles.btnWrap, btnStyle]}>
            <Pressable
              onPress={next}
              onPressIn={onBtnPressIn}
              onPressOut={onBtnPressOut}
              disabled={!canAdvance}
              style={[
                styles.btn,
                isWelcome
                  ? styles.btnWelcome
                  : { backgroundColor: canAdvance ? stepAccent : `${stepAccent}55` },
              ]}
            >
              <Text style={[styles.btnText, isWelcome && styles.btnTextWelcome]}>
                {btnLabel}
              </Text>
              {isWelcome && <ArrowRight size={18} color="#f4511e" strokeWidth={2.5} style={{ marginLeft: 6 }} />}
            </Pressable>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const ICON_SIZE = 140;

const styles = StyleSheet.create({
  safe:  { flex: 1 },

  blob: {
    position: 'absolute',
    width: SCREEN_W * 1.2, height: SCREEN_W * 1.2, borderRadius: SCREEN_W * 0.6,
    top: -SCREEN_W * 0.3, left: -SCREEN_W * 0.1,
  },

  skipRow:  { alignItems: 'flex-end', paddingHorizontal: 28, paddingTop: 8 },
  skipText: { fontSize: 14, fontFamily: F.medium },

  content:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  langContent: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 8, alignItems: 'center' },

  iconContainer: { marginBottom: 40 },
  iconWrapper:   { alignItems: 'center', justifyContent: 'center' },

  glowRing: {
    position: 'absolute',
    width: ICON_SIZE + 44, height: ICON_SIZE + 44, borderRadius: (ICON_SIZE + 44) / 2, borderWidth: 1.5,
  },
  glowRingInner: {
    position: 'absolute',
    width: ICON_SIZE + 20, height: ICON_SIZE + 20, borderRadius: (ICON_SIZE + 20) / 2, borderWidth: 1,
  },
  iconCircle: {
    width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },

  title:    { fontSize: 34, fontFamily: F.extrabold, textAlign: 'center', lineHeight: 42, marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: F.regular,   textAlign: 'center', lineHeight: 26, marginBottom: 8 },

  appName: { fontSize: 42, fontFamily: F.extrabold, textAlign: 'center', letterSpacing: -1 },
  tagline: { fontSize: 16, fontFamily: F.medium,    textAlign: 'center', marginTop: 8 },

  welcomeFeatures: { marginTop: 32, gap: 12, alignItems: 'center' },
  welcomeFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeFeatureIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  welcomeFeatureText: { fontSize: 15, fontFamily: F.medium },

  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8,
  },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 22, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  langFlag: { fontSize: 18 },
  langName: { fontSize: 13, fontFamily: F.medium },

  proficiencyGrid: { gap: 10, width: '100%', marginTop: 16 },
  proficiencyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cefrBadge: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cefrBadgeText: { fontSize: 16, fontFamily: F.extrabold },
  proficiencyDesc: { fontSize: 14, fontFamily: F.medium, flex: 1 },

  featureList: { gap: 12, width: '100%', marginTop: 20 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontFamily: F.bold },
  featureSub:   { fontSize: 12, fontFamily: F.regular },

  miniProgress: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  miniDot:      { width: 8, height: 8, borderRadius: 4 },
  miniCard:     { width: SCREEN_W - 64, height: 380, alignSelf: 'center' },
  miniFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  miniFaceContent: {
    ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  miniMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  miniPill:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  miniPillText: { fontSize: 11, fontFamily: F.medium },
  miniDiffDot:  { width: 6, height: 6, borderRadius: 3 },
  miniWord:       { fontSize: 32, fontFamily: F.bold, textAlign: 'center', letterSpacing: -0.8 },
  miniPhonetic:   { fontSize: 15, textAlign: 'center' },
  miniPos:        { fontSize: 13, fontFamily: F.semibold, textTransform: 'lowercase' },
  miniDivider:    { height: 1, width: '60%', marginVertical: 8 },
  miniDefinition: { fontSize: 15, fontFamily: F.medium, textAlign: 'center', lineHeight: 22 },
  miniExampleRow:   { flexDirection: 'row', gap: 4, paddingHorizontal: 8, marginTop: 4 },
  miniExampleQuote: { fontSize: 24, fontFamily: F.bold, lineHeight: 28, marginTop: -2 },
  miniExampleText:  { flex: 1, fontSize: 13, fontStyle: 'italic', lineHeight: 20, paddingTop: 4 },
  miniTipBox: {
    borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 4, width: '100%',
  },
  miniTipText: { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  hint:           { fontSize: 13, fontFamily: F.regular, marginTop: 8 },
  speakBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
  },

  confettiContainer: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    width: 200, height: 200,
  },
  celebTitle: { fontSize: 36, fontFamily: F.extrabold, textAlign: 'center', marginBottom: 8 },
  celebSub:   { fontSize: 17, fontFamily: F.medium,    textAlign: 'center', marginBottom: 24 },
  learnedWordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  learnedPill: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  learnedWord: { fontSize: 14, fontFamily: F.bold },

  planProgressContainer: { width: '100%', marginTop: 24, marginBottom: 32 },
  planProgressTrack: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  planProgressBar: { height: '100%', borderRadius: 3 },
  planChecklist: { gap: 16, width: '100%', paddingHorizontal: 16 },
  planCheckItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planCheckText: { fontSize: 16, fontFamily: F.medium },

  notifButtons: { gap: 16, width: '100%', marginTop: 24, alignItems: 'center' },
  skipLinkText: { fontSize: 14, fontFamily: F.medium, marginTop: 4 },

  signInLogo: { marginBottom: 24 },
  signInLogoCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f4511e', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 18, elevation: 8,
  },
  signInLogoEmoji: { fontSize: 36 },
  signInButtons: { gap: 12, width: '100%', marginTop: 24, alignItems: 'center' },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, borderWidth: 1,
    paddingVertical: 15, paddingHorizontal: 20, width: '100%',
  },
  googleG: {
    fontSize: 18, fontFamily: F.bold,
    color: '#4285F4', width: 22, textAlign: 'center',
  },
  appleLogo: { fontSize: 20, lineHeight: 22, width: 22, textAlign: 'center' },
  socialBtnText: { fontSize: 16, fontFamily: F.semibold },
  termsText: { fontSize: 12, fontFamily: F.regular, textAlign: 'center', lineHeight: 18, marginTop: 20 },

  paywallScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  paywallHero: { alignItems: 'center', marginBottom: 20 },
  proBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  proBadgeText: { color: '#fff', fontSize: 12, fontFamily: F.extrabold, letterSpacing: 1.5 },
  benefitsCard: {
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  benefitIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  benefitText: { fontSize: 14, fontFamily: F.medium, flex: 1 },
  plans: { gap: 10, marginBottom: 20 },
  planCard: {
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  planCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLeft: { gap: 4 },
  planRadioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot:     { width: 8, height: 8, borderRadius: 4 },
  planLabel:    { fontSize: 15, fontFamily: F.semibold },
  planSubLabel: { fontSize: 12, fontFamily: F.regular, marginLeft: 26 },
  saveBadge:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  saveBadgeText: { fontSize: 11, fontFamily: F.bold },
  planPrice:    { fontSize: 17, fontFamily: F.bold },
  trialText: { textAlign: 'center', fontSize: 12, fontFamily: F.regular, marginTop: 12 },
  paywallFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  footerLink: { fontSize: 12, fontFamily: F.regular },
  footerDot:  { fontSize: 12 },

  bottom:        { paddingHorizontal: 28, paddingBottom: 20, alignItems: 'center', gap: 16 },
  bottomWelcome: { paddingTop: 0, gap: 0 },
  dots:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:           { height: 7, borderRadius: 4 },
  btnWrap:       { width: '100%' },
  btn: {
    borderRadius: 18, paddingVertical: 17, alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnWelcome:     { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.12 },
  btnText:        { color: '#fff', fontSize: 17, fontFamily: F.bold },
  btnTextWelcome: { color: '#f4511e' },

  /* ── Welcome redesign ─────────────────────────────────────── */
  welcomeContainer: { flex: 1, paddingHorizontal: 28, paddingTop: 24, justifyContent: 'flex-end', paddingBottom: 8 },
  welcomeLayout:    { gap: 0 },
  welcomeBrandRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  welcomeBrandDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  welcomeBrandLabel:{ fontSize: 12, fontFamily: F.extrabold, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 },
  welcomeH1: {
    fontSize: 54, fontFamily: F.extrabold, color: '#fff',
    lineHeight: 60, letterSpacing: -1.5, marginBottom: 20,
  },
  welcomeTagline:  { fontSize: 16, fontFamily: F.medium, color: 'rgba(255,255,255,0.75)', lineHeight: 24, marginBottom: 28 },
  welcomeChecklist:{ gap: 12 },
  welcomeCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeCheckDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  welcomeCheckText:{ fontSize: 15, fontFamily: F.medium, color: 'rgba(255,255,255,0.9)', flex: 1 },

  /* ── Daily Goal counter redesign ──────────────────────────── */
  goalContainer:  { flex: 1, paddingHorizontal: 28, paddingTop: 20, justifyContent: 'center' },
  goalLayout:     { gap: 0 },
  goalHeading:    { fontSize: 38, fontFamily: F.extrabold, lineHeight: 46, letterSpacing: -1, marginBottom: 8 },
  goalSubheading: { fontSize: 15, fontFamily: F.regular, lineHeight: 22, marginBottom: 44 },
  counterRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  counterBtn:     { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  counterDisplay: { alignItems: 'center', flex: 1 },
  counterNumber:  { fontSize: 88, fontFamily: F.extrabold, lineHeight: 96, letterSpacing: -4 },
  counterUnit:    { fontSize: 13, fontFamily: F.medium, marginTop: -4 },
  goalScaleTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  goalScaleFill:  { height: '100%', borderRadius: 2 },
  goalScaleLabels:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  goalScaleLabel: { fontSize: 11, fontFamily: F.medium },
  counterCaption: { fontSize: 14, fontFamily: F.medium, lineHeight: 22 },

  /* Hear About */
  hearAboutGrid: { gap: 10, width: '100%', marginTop: 12 },
  hearAboutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14 },
  hearAboutIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  hearAboutLabel: { fontSize: 15, fontFamily: F.medium, flex: 1 },

  /* ── Shared slide typography ──────────────────────────────── */
  stepLabel: {
    fontSize: 11, fontFamily: F.extrabold, letterSpacing: 3,
    marginBottom: 10, alignSelf: 'stretch', textAlign: 'left',
  },
  slideH2: {
    fontSize: 36, fontFamily: F.extrabold, lineHeight: 44,
    letterSpacing: -0.8, marginBottom: 8, alignSelf: 'stretch', textAlign: 'left',
  },
  slideSub: {
    fontSize: 15, fontFamily: F.regular, lineHeight: 23,
    marginBottom: 20, alignSelf: 'stretch', textAlign: 'left',
  },

  /* ── Features numbered cards ─────────────────────────────── */
  featLayout: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  featList:   { gap: 12, marginTop: 20 },
  featCard:   { borderRadius: 16, borderWidth: 1, padding: 20 },
  featNumRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  featNum:      { fontSize: 44, fontFamily: F.extrabold, lineHeight: 44, letterSpacing: -2 },
  featIconBadge:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featTitle:    { fontSize: 17, fontFamily: F.bold, marginBottom: 4 },
  featSub:      { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },
});
