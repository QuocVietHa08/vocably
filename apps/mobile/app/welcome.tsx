import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withRepeat, withSequence, withDelay,
  FadeInDown, FadeOutUp, FadeIn, FadeOut,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mic, Sparkles, BookOpen, Globe } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useSettings } from '@/src/context/SettingsContext';

const { width, height } = Dimensions.get('window');

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

/* ─── Slide data ──────────────────────────────────────────────── */

const INFO_SLIDES = [
  {
    Icon:     Mic,
    accent:   '#f4511e',
    title:    'Speak with\nConfidence',
    subtitle: 'Practice IELTS speaking with a real-time AI coach that listens, corrects, and guides you.',
  },
  {
    Icon:     Sparkles,
    accent:   '#8b5cf6',
    title:    'Instant\nFeedback',
    subtitle: 'Get your grammar checked, vocabulary highlighted, and a band score after every response.',
  },
  {
    Icon:     BookOpen,
    accent:   '#0ea5e9',
    title:    'Build Your\nVocabulary',
    subtitle: 'Flashcard drills on 500+ IELTS words. Swipe through them daily to lock in your band 7+ vocab.',
  },
];

// Total slides = info slides + 1 language slide
const TOTAL_SLIDES = INFO_SLIDES.length + 1;
const LANG_SLIDE_INDEX = INFO_SLIDES.length; // = 3

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

/* ─── Info slide content ────────────────────────────────────────── */

function InfoSlide({ slide }: { slide: typeof INFO_SLIDES[0] }) {
  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(80).duration(400).springify()}
        exiting={FadeOutUp.duration(200)}
        style={styles.iconContainer}
      >
        <FloatingIcon Icon={slide.Icon} color={slide.accent} />
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.delay(180).duration(400).springify()}
        exiting={FadeOutUp.duration(150)}
        style={styles.title}
      >
        {slide.title}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(280).duration(400).springify()}
        exiting={FadeOutUp.duration(100)}
        style={styles.subtitle}
      >
        {slide.subtitle}
      </Animated.Text>
    </>
  );
}

/* ─── Language picker slide ─────────────────────────────────────── */

function LanguageSlide({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (code: string) => void;
}) {
  const t = useTheme();
  const accent = '#f4511e';

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(80).duration(400).springify()}
        exiting={FadeOutUp.duration(200)}
        style={styles.iconContainer}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
          <Globe size={52} color={accent} strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(180).duration(400).springify()}
        style={styles.title}
      >
        Your Language
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(240).duration(400).springify()}
        style={styles.subtitle}
      >
        So we can personalise your experience
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(320).duration(400).springify()}
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

/* ─── Screen ──────────────────────────────────────────────────── */

export default function WelcomeScreen() {
  const t      = useTheme();
  const router = useRouter();
  const { nativeLanguage, setNativeLanguage } = useSettings();
  const [index,  setIndex]  = React.useState(0);
  const [langSel, setLangSel] = React.useState(nativeLanguage || '');

  const isInfoSlide = index < INFO_SLIDES.length;
  const isLangSlide = index === LANG_SLIDE_INDEX;
  const isLast      = index === TOTAL_SLIDES - 1;

  const slide  = isInfoSlide ? INFO_SLIDES[index] : null;
  const accent = slide?.accent ?? '#f4511e';

  async function finish() {
    if (langSel) setNativeLanguage(langSel);
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    // router.replace('/auth'); // TODO: re-enable when auth is configured
    router.replace('/');
  }

  function next() {
    if (isLast) { void finish(); return; }
    setIndex((i) => i + 1);
  }

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  function onBtnPressIn()  { btnScale.value = withSpring(0.95); }
  function onBtnPressOut() { btnScale.value = withSpring(1); }

  const canAdvance = !isLangSlide || langSel !== '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <BackgroundBlob key={index} color={accent} />

      {/* Skip */}
      {!isLast && (
        <Animated.View entering={FadeIn} style={styles.skipRow}>
          <Pressable onPress={() => void finish()} hitSlop={12}>
            <Text style={[styles.skipText, { color: t.muted }]}>Skip</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Slide content */}
      {isLangSlide ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.langContent}
          showsVerticalScrollIndicator={false}
        >
          <LanguageSlide
            key={index}
            selected={langSel}
            onSelect={(code) => setLangSel(code)}
          />
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <InfoSlide key={index} slide={slide!} />
        </View>
      )}

      {/* Bottom */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <Dot key={i} active={i === index} color={accent} />
          ))}
        </View>

        <Animated.View style={[styles.btnWrap, btnStyle]}>
          <Pressable
            onPress={next}
            onPressIn={onBtnPressIn}
            onPressOut={onBtnPressOut}
            disabled={!canAdvance}
            style={[styles.btn, { backgroundColor: canAdvance ? accent : `${accent}55` }]}
          >
            <Text style={styles.btnText}>
              {isLast ? 'Get Started →' : 'Next'}
            </Text>
          </Pressable>
        </Animated.View>

        <Text style={[styles.stepText, { color: t.muted }]}>
          {index + 1} of {TOTAL_SLIDES}
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const ICON_SIZE = 140;

const styles = StyleSheet.create({
  safe:  { flex: 1 },

  blob: {
    position: 'absolute',
    width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6,
    top: -width * 0.3, left: -width * 0.1,
  },

  skipRow: { alignItems: 'flex-end', paddingHorizontal: 28, paddingTop: 8 },
  skipText: { fontSize: 14, fontFamily: F.medium },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
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

  title:    { fontSize: 34, fontFamily: F.extrabold, textAlign: 'center', lineHeight: 42, marginBottom: 12, color: '#0a0a0a' },
  subtitle: { fontSize: 16, fontFamily: F.regular,   textAlign: 'center', lineHeight: 26, color: '#888888', marginBottom: 8 },

  /* Language grid */
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

  bottom: { paddingHorizontal: 28, paddingBottom: 20, alignItems: 'center', gap: 16 },
  dots:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:    { height: 7, borderRadius: 4 },

  btnWrap: { width: '100%' },
  btn: {
    borderRadius: 18, paddingVertical: 17, alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnText:  { color: '#fff', fontSize: 17, fontFamily: F.bold },
  stepText: { fontSize: 12, fontFamily: F.medium },
});
