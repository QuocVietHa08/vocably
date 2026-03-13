import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Share2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { captureAndShare } from '@/src/lib/share';

/**
 * Wraps content and adds a branded "Vocally" watermark + share button.
 * The captured screenshot includes the watermark for brand recognition.
 */
export function ShareableCard({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const captureRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  // Button animation
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleShare = useCallback(async () => {
    if (sharing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    scale.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withSpring(1.1, { damping: 4, stiffness: 400, mass: 0.3 }),
      withSpring(1.0, { damping: 10, stiffness: 200 }),
    );

    setSharing(true);
    try {
      await captureAndShare(captureRef);
    } finally {
      setSharing(false);
    }
  }, [sharing, scale]);

  return (
    <View style={styles.root}>
      {/* Capturable area — includes content + branding */}
      <View ref={captureRef} collapsable={false} style={[styles.captureArea, { backgroundColor: t.bg }]}>
        {children}

        {/* Brand watermark — captured in screenshot */}
        <View style={styles.watermark}>
          <Text style={[styles.brandDot, { color: t.accent }]}>●</Text>
          <Text style={[styles.brandName, { color: t.muted }]}>Vocally</Text>
          <Text style={[styles.brandTag, { color: t.muted }]}>— IELTS Vocab</Text>
        </View>
      </View>

      {/* Share button — outside capturable area so it doesn't appear in screenshot */}
      <Animated.View style={animStyle}>
        <Pressable
          onPress={handleShare}
          style={[styles.shareBtn, { borderColor: t.border, backgroundColor: t.surface }]}
          hitSlop={8}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size={14} color={t.accent} />
          ) : (
            <Share2 size={15} color={t.muted} strokeWidth={2.2} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  captureArea: {
    borderRadius: 0, // full bleed for clean screenshot
    paddingBottom: 32, // room for watermark
  },
  watermark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 14,
  },
  brandDot: {
    fontSize: 8,
  },
  brandName: {
    fontSize: 13,
    fontFamily: F.bold,
    letterSpacing: 0.5,
  },
  brandTag: {
    fontSize: 11,
    fontFamily: F.medium,
    opacity: 0.6,
  },
  shareBtn: {
    position: 'absolute',
    bottom: 6,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
