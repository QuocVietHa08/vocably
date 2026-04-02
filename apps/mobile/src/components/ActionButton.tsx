import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RotateCcw, X, Check } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { useT } from '@/src/i18n/useT';
import { F } from '@/src/theme/fonts';

export type ActionVariant = 'know' | 'dontknow' | 'flip';

const KNOW_COLOR      = '#22c55e';
const DONTKNOW_COLOR  = '#ef4444';
const FLIP_COLOR      = '#3b82f6';
const KNOW_BORDER     = '#22c55e40';
const DONTKNOW_BORDER = '#ef444440';
const FLIP_BORDER     = '#3b82f640';

type ActionButtonProps = {
  variant: ActionVariant;
  onPress: () => void;
};

export function ActionButton({ variant, onPress }: ActionButtonProps) {
  const t     = useTheme();
  const T     = useT();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.95, { duration: 70 }),
      withTiming(1.0,  { duration: 110 }),
    );
    onPress();
  }

  const cfg =
    variant === 'know'
      ? { icon: <Check     size={20} color={KNOW_COLOR}     strokeWidth={2.2} />, label: T.cardKnow,  color: KNOW_COLOR,     border: KNOW_BORDER     }
      : variant === 'dontknow'
      ? { icon: <X         size={20} color={DONTKNOW_COLOR} strokeWidth={2.2} />, label: T.cardAgain, color: DONTKNOW_COLOR, border: DONTKNOW_BORDER }
      : { icon: <RotateCcw size={19} color={FLIP_COLOR}     strokeWidth={2}   />, label: T.cardFlip,  color: FLIP_COLOR,     border: FLIP_BORDER     };

  return (
    <Pressable onPress={handlePress} hitSlop={10} style={{ flex: 1 }}>
      <Animated.View style={[
        styles.btn,
        { backgroundColor: t.surface, borderColor: cfg.border },
        animStyle,
      ]}>
        {cfg.icon}
        <Text style={[styles.btnText, { color: cfg.color }]}>{cfg.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  btnText: {
    fontSize: 12,
    fontFamily: F.semibold,
    letterSpacing: 0.3,
  },
});
