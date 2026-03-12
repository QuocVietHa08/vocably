import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/* ── Typing dots (user placeholder while mic is active) ── */
function TypingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.6);
  const op    = useSharedValue(0.4);
  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1,   { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0.6, { duration: 300, easing: Easing.in(Easing.quad) }),
        ), -1, false,
      );
      op.value = withRepeat(
        withSequence(
          withTiming(1,   { duration: 300 }),
          withTiming(0.4, { duration: 300 }),
        ), -1, false,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: op.value,
  }));
  return (
    <Animated.View style={[{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: '#ffffff', marginHorizontal: 2,
    }, style]} />
  );
}

export function TypingIndicator() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 }}>
      <TypingDot delay={0} />
      <TypingDot delay={150} />
      <TypingDot delay={300} />
    </View>
  );
}
