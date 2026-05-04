import { useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { ALL_MOODS, MOODS, MoodCard, MoodFace, type MoodName } from '@/src/components/mood';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

const { width } = Dimensions.get('window');
const COLS = 2;
const GAP = 14;
const CARD_W = (width - 24 * 2 - GAP) / COLS;

export default function MoodDemoScreen() {
  const t = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<MoodName>('happy');
  const data = MOODS[selected];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={26} color={t.fg} />
        </Pressable>
        <Text style={[styles.title, { color: t.fg, fontFamily: F.extrabold }]}>Mood</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={[styles.hero, { backgroundColor: data.bg }]}>
        <MoodFace mood={selected} size={220} />
        <Text style={[styles.heroLabel, { color: data.fg, fontFamily: F.extrabold }]}>
          {data.label}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: t.muted, fontFamily: F.semibold }]}>
        Tap a mood to see the face morph
      </Text>

      <FlatList
        data={ALL_MOODS}
        keyExtractor={(m) => m}
        numColumns={COLS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item }) => (
          <MoodCard
            mood={item}
            size={CARD_W}
            faceSize={CARD_W * 0.55}
            onPress={() => setSelected(item)}
            selected={selected === item}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, letterSpacing: -0.5 },
  hero: {
    marginHorizontal: 24,
    borderRadius: 32,
    paddingVertical: 32,
    alignItems: 'center',
  },
  heroLabel: { fontSize: 32, marginTop: 8, letterSpacing: -0.5 },
  subtitle: {
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 12,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
