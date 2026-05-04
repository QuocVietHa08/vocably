import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { MOODS, type EyeShape, type Mood, type MoodName, type MouthShape } from './expressions';

interface MoodFaceProps {
  mood: MoodName;
  size?: number;
  animated?: boolean;
  onPress?: () => void;
}

const VIEW = 100;
const LEFT_EYE_CX = 33;
const RIGHT_EYE_CX = 67;
const EYE_CY = 44;
const CHEEK_LEFT_CX = 20;
const CHEEK_RIGHT_CX = 80;
const CHEEK_CY = 62;
const MOUTH_CX = 50;
const MOUTH_CY = 64;
const STROKE = 4;

const AnimatedG = Animated.createAnimatedComponent(G);

export function MoodFace({ mood, size = 120, animated = true, onPress }: MoodFaceProps) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const motionOn = animated && !reduce;

  // ── Crossfade state ────────────────────────────────────────────
  const [current, setCurrent] = useState<MoodName>(mood);
  const [outgoing, setOutgoing] = useState<MoodName | null>(null);
  const transitionT = useSharedValue(1); // 1 = current fully shown
  const prevMood = useRef<MoodName>(mood);

  useEffect(() => {
    if (mood === prevMood.current) return;
    setOutgoing(prevMood.current);
    setCurrent(mood);
    prevMood.current = mood;
    transitionT.value = 0;
    transitionT.value = withTiming(1, {
      duration: motionOn ? 220 : 0,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(() => setOutgoing(null), motionOn ? 240 : 0);
    return () => clearTimeout(t);
  }, [mood, motionOn, transitionT]);

  // ── Bob ────────────────────────────────────────────────────────
  const bobY = useSharedValue(0);
  const bobMood = MOODS[current].bob;
  useEffect(() => {
    cancelAnimation(bobY);
    if (!motionOn) {
      bobY.value = 0;
      return;
    }
    bobY.value = 0;
    bobY.value = withRepeat(
      withSequence(
        withTiming(-bobMood.amp, {
          duration: bobMood.duration / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: bobMood.duration / 2,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bobY);
  }, [motionOn, bobMood.amp, bobMood.duration, bobY]);

  // ── Blink ──────────────────────────────────────────────────────
  const blinkScale = useSharedValue(1);
  const blinkActive = motionOn && MOODS[current].blinks === true;
  useEffect(() => {
    if (!blinkActive) {
      blinkScale.value = 1;
      return;
    }
    let cancelled = false;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      if (cancelled) return;
      const wait = 2800 + Math.random() * 2400;
      const id = setTimeout(() => {
        if (cancelled) return;
        blinkScale.value = withSequence(
          withTiming(0.05, { duration: 80 }),
          withTiming(1, { duration: 130 }),
        );
        loop();
      }, wait);
      ids.push(id);
    };
    loop();
    return () => {
      cancelled = true;
      ids.forEach(clearTimeout);
    };
  }, [blinkActive, blinkScale]);

  // ── Press spring ───────────────────────────────────────────────
  const pressScale = useSharedValue(1);
  const handlePressIn = () => {
    pressScale.value = withSpring(0.92, { mass: 0.4, damping: 12, stiffness: 180 });
  };
  const handlePressOut = () => {
    pressScale.value = withSequence(
      withSpring(1.06, { mass: 0.4, damping: 10, stiffness: 200 }),
      withSpring(1, { mass: 0.4, damping: 14, stiffness: 180 }),
    );
  };

  // ── Outer wrap (bob + press) ───────────────────────────────────
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }, { scale: pressScale.value }],
  }));

  // ── Crossfade layer opacities ──────────────────────────────────
  const currentLayerStyle = useAnimatedStyle(() => ({
    opacity: transitionT.value,
  }));
  const outgoingLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - transitionT.value,
  }));

  const Inner = (
    <Animated.View style={[{ width: size, height: size }, wrapStyle]}>
      {outgoing !== null && (
        <Animated.View style={[StyleSheet.absoluteFill, outgoingLayerStyle]} pointerEvents="none">
          <FaceLayer mood={MOODS[outgoing]} size={size} blinkScale={blinkScale} />
        </Animated.View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, currentLayerStyle]} pointerEvents="none">
        <FaceLayer mood={MOODS[current]} size={size} blinkScale={blinkScale} />
      </Animated.View>
    </Animated.View>
  );

  if (!onPress) {
    return <View style={{ width: size, height: size }}>{Inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={6}
      style={{ width: size, height: size }}
    >
      {Inner}
    </Pressable>
  );
}

// ───────────────────────────────────────────────────────────────────
// FaceLayer: one rendered snapshot of a mood
// ───────────────────────────────────────────────────────────────────
function FaceLayer({
  mood,
  size,
  blinkScale,
}: {
  mood: Mood;
  size: number;
  blinkScale: SharedValue<number>;
}) {
  // SVG transform: scale eye group around its own center.
  // pattern: translate(cx cy) scale(1 s) translate(-cx -cy)
  const leftEyeProps = useAnimatedProps(() => ({
    transform: `translate(${LEFT_EYE_CX} ${EYE_CY}) scale(1 ${blinkScale.value}) translate(${-LEFT_EYE_CX} ${-EYE_CY})`,
  }));
  const rightEyeProps = useAnimatedProps(() => ({
    transform: `translate(${RIGHT_EYE_CX} ${EYE_CY}) scale(1 ${blinkScale.value}) translate(${-RIGHT_EYE_CX} ${-EYE_CY})`,
  }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      {mood.cheek && (
        <>
          <Ellipse cx={CHEEK_LEFT_CX} cy={CHEEK_CY} rx={6} ry={4} fill={mood.cheek} opacity={0.85} />
          <Ellipse cx={CHEEK_RIGHT_CX} cy={CHEEK_CY} rx={6} ry={4} fill={mood.cheek} opacity={0.85} />
        </>
      )}
      <AnimatedG animatedProps={leftEyeProps}>
        {renderEye(mood.leftEye, LEFT_EYE_CX, EYE_CY, mood.fg, 'left')}
      </AnimatedG>
      <AnimatedG animatedProps={rightEyeProps}>
        {renderEye(mood.rightEye, RIGHT_EYE_CX, EYE_CY, mood.fg, 'right')}
      </AnimatedG>
      <G>{renderMouth(mood.mouth, MOUTH_CX, MOUTH_CY, mood.fg)}</G>
    </Svg>
  );
}

// ───────────────────────────────────────────────────────────────────
// Eye rendering
// ───────────────────────────────────────────────────────────────────
function renderEye(shape: EyeShape, cx: number, cy: number, color: string, side: 'left' | 'right') {
  switch (shape.kind) {
    case 'dot': {
      const r = shape.r ?? 4;
      return <Circle cx={cx} cy={cy} r={r} fill={color} />;
    }
    case 'arcUp': {
      const w = shape.w ?? 12;
      const depth = shape.depth ?? 4;
      const d = `M ${cx - w / 2} ${cy - 2} Q ${cx} ${cy + depth} ${cx + w / 2} ${cy - 2}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'arcDown': {
      const w = shape.w ?? 12;
      const depth = shape.depth ?? 4;
      const d = `M ${cx - w / 2} ${cy + 2} Q ${cx} ${cy - depth} ${cx + w / 2} ${cy + 2}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'wink': {
      const w = 10;
      const d = `M ${cx - w / 2} ${cy + 1} Q ${cx} ${cy - 4} ${cx + w / 2} ${cy + 1}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'cross': {
      const s = shape.size ?? 6;
      return (
        <G>
          <Path
            d={`M ${cx - s / 2} ${cy - s / 2} L ${cx + s / 2} ${cy + s / 2}`}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <Path
            d={`M ${cx - s / 2} ${cy + s / 2} L ${cx + s / 2} ${cy - s / 2}`}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </G>
      );
    }
    case 'vbrow': {
      const len = 12;
      const angle = (shape.angle ?? (side === 'left' ? 18 : -18)) * (Math.PI / 180);
      const dx = Math.cos(angle) * (len / 2);
      const dy = Math.sin(angle) * (len / 2);
      const d = `M ${cx - dx} ${cy - dy + 2} L ${cx + dx} ${cy + dy + 2}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE + 0.5} strokeLinecap="round" />;
    }
    case 'heart': {
      const s = shape.size ?? 7;
      const d = `M ${cx} ${cy + s * 0.6} C ${cx - s} ${cy} ${cx - s} ${cy - s * 0.6} ${cx} ${cy - s * 0.2} C ${cx + s} ${cy - s * 0.6} ${cx + s} ${cy} ${cx} ${cy + s * 0.6} Z`;
      return <Path d={d} fill={color} />;
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// Mouth rendering
// ───────────────────────────────────────────────────────────────────
function renderMouth(shape: MouthShape, cx: number, cy: number, color: string) {
  switch (shape.kind) {
    case 'smile': {
      const w = shape.w ?? 16;
      const depth = shape.depth ?? 4;
      const d = `M ${cx - w / 2} ${cy} Q ${cx} ${cy + depth} ${cx + w / 2} ${cy}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'wavy': {
      const w = shape.w ?? 18;
      const half = w / 2;
      const d = `M ${cx - half} ${cy} Q ${cx - half / 2} ${cy - 3} ${cx} ${cy} Q ${cx + half / 2} ${cy + 3} ${cx + half} ${cy}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'open': {
      const w = shape.w ?? 6;
      const h = shape.h ?? 5;
      return <Ellipse cx={cx} cy={cy + 1} rx={w / 2} ry={h / 2} fill={color} />;
    }
    case 'frown': {
      const w = shape.w ?? 16;
      const depth = shape.depth ?? 4;
      const d = `M ${cx - w / 2} ${cy + depth / 2} Q ${cx} ${cy - depth} ${cx + w / 2} ${cy + depth / 2}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
    case 'kiss': {
      const s = shape.size ?? 6;
      const d = `M ${cx - s / 2} ${cy} Q ${cx} ${cy - s * 0.6} ${cx} ${cy} Q ${cx} ${cy + s * 0.6} ${cx - s / 2} ${cy}`;
      return <Path d={d} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />;
    }
  }
}
