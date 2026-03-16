/**
 * KeyboardAwareInput
 *
 * A drop-in TextInput + submit-button row that always stays visible above
 * the software keyboard, using `KeyboardStickyView` from
 * react-native-keyboard-controller.
 *
 * Usage (quiz / onboarding):
 *   <KeyboardAwareInput
 *     value={answer}
 *     onChangeText={setAnswer}
 *     onSubmit={handleSubmit}
 *     submitted={submitted}
 *     onNext={handleNext}
 *   />
 *
 * Usage (standalone, no sticky wrapper needed — e.g. already inside
 * KeyboardAwareScrollView):
 *   <KeyboardAwareInput ... sticky={false} />
 */
import React, { forwardRef } from 'react';
import {
  View, TextInput, StyleSheet, type TextInputProps,
} from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

export type KeyboardAwareInputProps = {
  /** Current text value */
  value: string;
  onChangeText: (text: string) => void;
  /** Called when user presses the check button or hits return */
  onSubmit: () => void;
  /** Whether the answer has been submitted (shows Next arrow instead of Check) */
  submitted?: boolean;
  /** Called when user presses the Next/arrow button after submission */
  onNext?: () => void;
  /** Whether the submitted answer was correct (affects border colour) */
  isCorrect?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Wrap in KeyboardStickyView so it rises with the keyboard. Default true */
  sticky?: boolean;
  /** Extra bottom offset added when keyboard is open (default 0) */
  bottomOffset?: number;
  /** Extra styling on the outer wrapper */
  style?: object;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing'>;

const KeyboardAwareInput = forwardRef<TextInput, KeyboardAwareInputProps>(
  (
    {
      value,
      onChangeText,
      onSubmit,
      submitted = false,
      onNext,
      isCorrect,
      placeholder = 'Type the word…',
      sticky = true,
      bottomOffset = 0,
      style,
      ...rest
    },
    ref,
  ) => {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const { progress } = useReanimatedKeyboardAnimation();

    // paddingBottom animates in sync with the keyboard:
    //   keyboard closed (progress=0) → insets.bottom + bottomOffset (clears home indicator)
    //   keyboard open   (progress=1) → 0 (flush against keyboard top)
    // Using the same Reanimated driver as KeyboardStickyView means zero jank.
    const animatedPadding = useAnimatedStyle(() => ({
      paddingBottom: interpolate(progress.value, [0, 1], [insets.bottom + bottomOffset, 0]),
    }));

    const borderColor = submitted
      ? isCorrect
        ? '#22c55e'
        : '#ef4444'
      : t.border;

    const btnActive = Boolean(value.trim());
    const btnBg = !submitted
      ? btnActive
        ? '#0ea5e9'
        : `${t.muted}30`
      : '#f4511e';

    const row = (
      <View style={[styles.row, style]}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={`${t.muted}88`}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          editable={!submitted}
          style={[
            styles.input,
            {
              color: t.fg,
              borderColor,
              backgroundColor: t.surface,
            },
          ]}
          {...rest}
        />
        {!submitted ? (
          <Pressable
            onPress={onSubmit}
            disabled={!btnActive}
            style={[styles.btn, { backgroundColor: btnBg }]}
            hitSlop={8}
          >
            <CheckCircle
              size={22}
              color={btnActive ? '#fff' : t.muted}
              strokeWidth={2.2}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={onNext}
            style={[styles.btn, { backgroundColor: btnBg }]}
            hitSlop={8}
          >
            <ArrowRight size={22} color="#fff" strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
    );

    if (!sticky) return row;

    return (
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <Animated.View style={[styles.stickyWrapper, animatedPadding]}>
          {row}
        </Animated.View>
      </KeyboardStickyView>
    );
  },
);

KeyboardAwareInput.displayName = 'KeyboardAwareInput';
export default KeyboardAwareInput;

const styles = StyleSheet.create({
  stickyWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    /* paddingBottom is animated via useReanimatedKeyboardAnimation — see animatedPadding */
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: F.medium,
  },
  btn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
