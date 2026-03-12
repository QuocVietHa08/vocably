import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

const { width } = Dimensions.get('window');

export const WELCOME_SEEN_KEY = '@vocally/welcomeSeen';

/* ─── Slides content ──────────────────────────────────────────── */

const SLIDES = [
  {
    emoji:    '🎙',
    title:    'Speak with Confidence',
    subtitle: 'Practice IELTS speaking with a real-time AI coach that listens, corrects, and guides you.',
  },
  {
    emoji:    '✦',
    title:    'Instant Feedback',
    subtitle: 'Get your grammar checked, vocabulary highlighted, and a band score after every response.',
  },
  {
    emoji:    '📚',
    title:    'Build Your Vocabulary',
    subtitle: 'Flashcard drills on 500+ IELTS words. Swipe through them daily to lock in your band 7+ vocab.',
  },
];

/* ─── Screen ──────────────────────────────────────────────────── */

export default function WelcomeScreen() {
  const t         = useTheme();
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(page);
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }
  }

  async function finish() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    router.replace('/auth');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* Skip */}
      {!isLast && (
        <Pressable onPress={finish} style={styles.skip}>
          <Text style={[styles.skipText, { color: t.muted }]}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            {/* Illustration */}
            <View style={[styles.emojiCircle, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>

            {/* Text */}
            <Text style={[styles.title, { color: t.fg }]}>{slide.title}</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? t.accent : t.border,
                width: i === index ? 22 : 7,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.footer}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.btn, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.btnText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  skip: {
    position: 'absolute', top: 56, right: 24, zIndex: 10,
  },
  skipText: { fontSize: 14, fontFamily: F.medium },

  slider: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },

  emojiCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  emoji: { fontSize: 52 },

  title: {
    fontSize: 28, fontFamily: F.extrabold,
    textAlign: 'center', marginBottom: 14,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16, fontFamily: F.regular,
    textAlign: 'center', lineHeight: 26,
  },

  dots: {
    flexDirection: 'row', gap: 6,
    justifyContent: 'center', alignItems: 'center',
    paddingBottom: 28,
  },
  dot: {
    height: 7, borderRadius: 4,
    // width is set inline
  },

  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  btn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff', fontSize: 17, fontFamily: F.bold,
  },
});
