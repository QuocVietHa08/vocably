import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence,
  cancelAnimation, Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme';

export type SphereState = 'idle' | 'connecting' | 'listening' | 'speaking';

/* ─── Sonar ring ─────────────────────────────────────────────────────── */

interface RingProps {
  scale:   SharedValue<number>;
  opacity: SharedValue<number>;
  size:    number;
  color:   string;
  border?: boolean;
}

function SonarRing({ scale, opacity, size, color, border = false }: RingProps) {
  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size, height: size,
          borderRadius: size / 2,
          borderColor: color,
          borderWidth: border ? 1.5 : 0,
          backgroundColor: border ? 'transparent' : color + '22',
        },
        style,
      ]}
    />
  );
}

/* ─── Main sphere ────────────────────────────────────────────────────── */

interface VoiceSphereProps {
  state:      SphereState;
  audioLevel: number;
  size?:      number;
}

export function VoiceSphere({ state, audioLevel, size = 80 }: VoiceSphereProps) {
  const t    = useTheme();
  const core = size * 0.46;

  const coreScale   = useSharedValue(1);

  const r1Scale   = useSharedValue(1); const r1Opacity = useSharedValue(0);
  const r2Scale   = useSharedValue(1); const r2Opacity = useSharedValue(0);
  const r3Scale   = useSharedValue(1); const r3Opacity = useSharedValue(0);
  const audioScale   = useSharedValue(1);
  const audioOpacity = useSharedValue(0);

  const ORANGE = t.accent;
  const DARK   = t.dark ? '#f5f5f5' : '#0a0a0a';
  const MUTED  = t.muted;

  const coreColor = state === 'listening'  ? ORANGE
    : state === 'speaking'   ? DARK
    : state === 'connecting' ? MUTED
    : MUTED;

  useEffect(() => {
    cancelAnimation(coreScale);
    cancelAnimation(r1Scale); cancelAnimation(r1Opacity);
    cancelAnimation(r2Scale); cancelAnimation(r2Opacity);
    cancelAnimation(r3Scale); cancelAnimation(r3Opacity);

    r1Opacity.value = withTiming(0, { duration: 300 });
    r2Opacity.value = withTiming(0, { duration: 300 });
    r3Opacity.value = withTiming(0, { duration: 300 });

    if (state === 'idle') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ), -1, false,
      );

    } else if (state === 'connecting') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0.94, { duration: 500, easing: Easing.in(Easing.quad) }),
        ), -1, false,
      );
      r1Scale.value   = withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(2.2, { duration: 900, easing: Easing.out(Easing.quad) })), -1, false);
      r1Opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: 0 }), withTiming(0, { duration: 900, easing: Easing.out(Easing.quad) })), -1, false);

    } else if (state === 'listening') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ), -1, false,
      );
      r1Scale.value   = withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(2.4, { duration: 1400, easing: Easing.out(Easing.cubic) })), -1, false);
      r1Opacity.value = withRepeat(withSequence(withTiming(0.45, { duration: 0 }), withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) })), -1, false);
      setTimeout(() => {
        r2Scale.value   = withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(2.4, { duration: 1400, easing: Easing.out(Easing.cubic) })), -1, false);
        r2Opacity.value = withRepeat(withSequence(withTiming(0.28, { duration: 0 }), withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) })), -1, false);
      }, 467);

    } else if (state === 'speaking') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0.94, { duration: 350, easing: Easing.in(Easing.quad) }),
        ), -1, false,
      );
      const ring = (sc: SharedValue<number>, op: SharedValue<number>, delay: number, maxSc: number, dur: number, maxOp: number) => {
        setTimeout(() => {
          sc.value = withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(maxSc, { duration: dur, easing: Easing.out(Easing.quad) })), -1, false);
          op.value = withRepeat(withSequence(withTiming(maxOp, { duration: 0 }), withTiming(0, { duration: dur, easing: Easing.out(Easing.quad) })), -1, false);
        }, delay);
      };
      ring(r1Scale, r1Opacity,   0, 2.7, 750, 0.6);
      ring(r2Scale, r2Opacity, 250, 2.3, 750, 0.4);
      ring(r3Scale, r3Opacity, 500, 2.0, 750, 0.22);
    }
  }, [state]);

  // Audio burst — instant reaction to voice input
  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') return;
    if (audioLevel > 0.12) {
      audioScale.value   = withTiming(1, { duration: 0 });
      audioScale.value   = withTiming(1 + audioLevel * 1.6, { duration: 160, easing: Easing.out(Easing.quad) });
      audioOpacity.value = withTiming(audioLevel * 0.65, { duration: 0 });
      audioOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    }
  }, [audioLevel, state]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
    shadowColor:   coreColor,
    shadowRadius:  14,
    shadowOpacity: 0.3,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     10,
  }));

  const audioRingStyle = useAnimatedStyle(() => ({
    opacity:   audioOpacity.value,
    transform: [{ scale: audioScale.value }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <SonarRing scale={r3Scale} opacity={r3Opacity} size={core} color={coreColor} />
      <SonarRing scale={r2Scale} opacity={r2Opacity} size={core} color={coreColor} />
      <SonarRing scale={r1Scale} opacity={r1Opacity} size={core} color={coreColor} border />
      <Animated.View
        style={[styles.ring, { width: core, height: core, borderRadius: core / 2, backgroundColor: coreColor + '30' }, audioRingStyle]}
      />
      <Animated.View style={[
        { width: core, height: core, borderRadius: core / 2, backgroundColor: coreColor, zIndex: 10 },
        coreStyle,
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
