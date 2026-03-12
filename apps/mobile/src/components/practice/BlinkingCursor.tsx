import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function BlinkingCursor() {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.Text style={[{ fontSize: 14, color: '#f4511e' }, style]}>▌</Animated.Text>;
}
