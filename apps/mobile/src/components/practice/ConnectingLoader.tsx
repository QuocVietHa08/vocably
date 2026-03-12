import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

function PulsingDot({ delay, color }: { delay: number; color: string }) {
  const ty = useSharedValue(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      ty.value = withRepeat(
        withSequence(withTiming(-9, { duration: 400 }), withTiming(0, { duration: 400 })),
        -1, false,
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export interface ConnectingLoaderProps {
  elapsed: number;
  t: ReturnType<typeof useTheme>;
}

export function ConnectingLoader({ elapsed, t }: ConnectingLoaderProps) {
  const msgs = ['Getting your coach ready…', 'Warming up the microphone…', 'Almost there…', 'Your coach is ready!'];
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => <PulsingDot key={i} delay={i * 200} color={t.accent} />)}
      </View>
      <Animated.Text key={Math.min(elapsed, 3)} entering={FadeInUp.duration(280)}
        style={[styles.loadingTitle, { color: t.fg }]}>
        {msgs[Math.min(elapsed, 3)]}
      </Animated.Text>
      <Text style={[styles.loadingSubtitle, { color: t.muted }]}>This usually takes a few seconds</Text>
      <View style={[styles.progressBg, { backgroundColor: t.subtle }]}>
        <Animated.View style={[styles.progressFill, {
          backgroundColor: t.accent,
          width: `${Math.min((elapsed / 5) * 100, 92)}%`,
        }]} />
      </View>
      {elapsed >= 2 && (
        <Animated.Text entering={FadeIn.duration(400)} style={[styles.tip, { color: t.muted }]}>
          💡 Speak naturally — your coach will follow your pace and correct mistakes gently.
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 60 },
  dotsRow:    { flexDirection: 'row', gap: 10 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  loadingTitle:    { fontSize: 16, fontFamily: F.semibold, textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, textAlign: 'center' },
  progressBg:  { width: 180, height: 3, borderRadius: 99, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 99 },
  tip:         { fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 20, paddingHorizontal: 16 },
});
