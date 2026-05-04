import { Pressable, StyleSheet, Text, View } from 'react-native';

import { F } from '@/src/theme/fonts';

import { MOODS, type MoodName } from './expressions';
import { MoodFace } from './MoodFace';

interface MoodCardProps {
  mood: MoodName;
  size?: number;
  faceSize?: number;
  onPress?: () => void;
  selected?: boolean;
}

export function MoodCard({ mood, size = 180, faceSize, onPress, selected }: MoodCardProps) {
  const data = MOODS[mood];
  const face = faceSize ?? size * 0.6;

  const inner = (
    <View
      style={[
        styles.card,
        {
          width: size,
          height: size * 1.2,
          backgroundColor: data.bg,
          transform: [{ scale: selected ? 1.03 : 1 }],
          borderColor: selected ? data.fg : 'transparent',
        },
      ]}
    >
      <MoodFace mood={mood} size={face} />
      <Text style={[styles.label, { color: data.fg, fontFamily: F.bold }]}>{data.label}</Text>
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: data.fg + '22', borderless: false }}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
  },
  label: {
    fontSize: 22,
    marginTop: 8,
  },
});
