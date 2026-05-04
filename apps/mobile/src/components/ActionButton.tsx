import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check, Heart, RotateCcw, Rotate3D, Volume2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

export type ActionVariant = 'know' | 'dontknow' | 'flip' | 'favorite' | 'voice';
export type ActionSize = 'primary' | 'hero' | 'secondary' | 'decision' | 'utility';

const KNOW_COLOR      = '#22c55e';
const DONTKNOW_COLOR  = '#ef4444';
const FLIP_COLOR      = '#3b82f6';
const FAVORITE_COLOR  = '#ec4899';
const VOICE_COLOR     = '#f4511e';
const KNOW_BORDER     = '#22c55e40';
const DONTKNOW_BORDER = '#ef444440';
const FLIP_BORDER     = '#3b82f640';
const FAVORITE_BORDER = '#ec489940';
const VOICE_BORDER    = '#f4511e40';

type ActionButtonProps = {
  variant: ActionVariant;
  onPress: () => void;
  active?: boolean;
  size?: ActionSize;
  label?: string;
  style?: ViewStyle;
};

export function ActionButton({
  variant,
  onPress,
  active = false,
  size = 'secondary',
  label,
  style,
}: ActionButtonProps) {
  const t     = useTheme();
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
      ? { icon: Check, color: KNOW_COLOR, border: KNOW_BORDER, fallbackLabel: 'Know' }
      : variant === 'dontknow'
      ? { icon: RotateCcw, color: DONTKNOW_COLOR, border: DONTKNOW_BORDER, fallbackLabel: 'Again' }
      : variant === 'favorite'
      ? { icon: Heart, color: FAVORITE_COLOR, border: FAVORITE_BORDER, fallbackLabel: 'Love' }
      : variant === 'voice'
      ? { icon: Volume2, color: VOICE_COLOR, border: VOICE_BORDER, fallbackLabel: 'Voice' }
      : { icon: Rotate3D, color: FLIP_COLOR, border: FLIP_BORDER, fallbackLabel: 'Flip' };

  const Icon = cfg.icon;
  const isDecision = size === 'decision';
  const isUtility = size === 'utility';
  const isPrimary = size === 'primary';
  const isHero = size === 'hero';
  const showLabel = Boolean(label) || isPrimary || isUtility;
  const filled = active || isHero;

  return (
    <Pressable onPress={handlePress} hitSlop={10} accessibilityRole="button" style={isPrimary ? styles.primaryPressable : undefined}>
      <Animated.View style={[
        styles.btnBase,
        isDecision
          ? styles.decisionBtn
          : isUtility
          ? styles.utilityBtn
          : isPrimary
          ? styles.primaryBtn
          : isHero
          ? styles.heroBtn
          : styles.secondaryBtn,
        {
          backgroundColor: filled ? cfg.color : t.surface,
          borderColor: filled ? cfg.color : cfg.border,
          shadowColor: cfg.color,
        },
        style,
        animStyle,
      ]}>
        <Icon
          size={isDecision ? 30 : isPrimary ? 21 : isHero ? 26 : isUtility ? 19 : 20}
          color={filled ? '#fff' : cfg.color}
          fill={variant === 'favorite' && filled ? '#fff' : 'none'}
          strokeWidth={isDecision ? 2.6 : isHero ? 2.4 : 2.3}
        />
        {showLabel && (
          <Text style={[isUtility ? styles.utilityLabel : styles.label, { color: filled ? '#fff' : cfg.color }]}>
            {label ?? cfg.fallbackLabel}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryPressable: {
    flex: 1,
  },
  btnBase: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  decisionBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 7,
  },
  utilityBtn: {
    width: 70,
    height: 48,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: F.extrabold,
    letterSpacing: 0,
  },
  utilityLabel: {
    fontSize: 11,
    fontFamily: F.semibold,
    letterSpacing: 0,
  },
});
