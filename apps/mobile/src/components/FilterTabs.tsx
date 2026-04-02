import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import {
  LayoutGrid as LayoutGridIcon,
  Heart as HeartIcon,
} from "lucide-react-native";
import { useTheme } from "@/src/theme";
import { F } from "@/src/theme/fonts";
import { useT } from "@/src/i18n/useT";

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
const LayoutGrid = LayoutGridIcon as LucideIcon;
const Heart      = HeartIcon      as LucideIcon;

export type FilterMode = "all" | "favorites";

/* ─── Single tab button ─────────────────────────────────────── */

type TabProps = {
  mode: FilterMode;
  label: string;
  active: boolean;
  muted: string;
  onPress: (mode: FilterMode) => void;
  onLayout: (mode: FilterMode, width: number, x: number) => void;
};

function Tab({ mode, label, active, muted, onPress, onLayout }: TabProps) {
  const scale      = useSharedValue(1);
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor  = active ? "#fff" : muted;

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withTiming(1.0,  { duration: 130 }),
    );
    onPress(mode);
  }

  return (
    <Pressable
      style={styles.tab}
      onPress={handlePress}
      onLayout={(e) => {
        const { width, x } = e.nativeEvent.layout;
        onLayout(mode, width, x);
      }}
    >
      <Animated.View style={[styles.tabInner, innerStyle]}>
        {mode === "all"
          ? <LayoutGrid size={12} color={iconColor} strokeWidth={2.2} />
          : <Heart      size={12} color={iconColor} strokeWidth={2.2} />
        }
        <Text style={[styles.tabText, { color: iconColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─── FilterTabs ─────────────────────────────────────────────── */

type FilterTabsProps = {
  filterMode: FilterMode;
  onChange: (mode: FilterMode) => void;
};

export function FilterTabs({ filterMode, onChange }: FilterTabsProps) {
  const t = useTheme();
  const T = useT();

  const [widths,  setWidths]  = useState<Record<FilterMode, number>>({ all: 0, favorites: 0 });
  const [offsets, setOffsets] = useState<Record<FilterMode, number>>({ all: 0, favorites: 0 });

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }));

  useEffect(() => {
    const w = widths[filterMode];
    const x = offsets[filterMode];
    if (w > 0) {
      pillX.value = withTiming(x, { duration: 220, easing: Easing.out(Easing.cubic) });
      pillW.value = withTiming(w, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
  }, [filterMode, widths, offsets]);

  function handleLayout(mode: FilterMode, width: number, x: number) {
    setWidths(prev  => ({ ...prev, [mode]: width }));
    setOffsets(prev => ({ ...prev, [mode]: x }));
  }

  const ready = widths.all > 0 && widths.favorites > 0;

  return (
    <View style={[styles.bar, { backgroundColor: t.subtle, borderColor: t.border }]}>
      {ready && (
        <Animated.View
          style={[styles.pill, { backgroundColor: t.accent }, pillStyle]}
          pointerEvents="none"
        />
      )}
      <Tab
        mode="all"
        label={T.filterAll}
        active={filterMode === "all"}
        muted={t.muted}
        onPress={onChange}
        onLayout={handleLayout}
      />
      <Tab
        mode="favorites"
        label={T.filterSaved}
        active={filterMode === "favorites"}
        muted={t.muted}
        onPress={onChange}
        onLayout={handleLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    flexShrink: 1,
  },
  pill: {
    position: "absolute",
    top: 3,
    left: 0,
    bottom: 3,
    borderRadius: 16,
  },
  tab: {
    paddingHorizontal: 12,
    borderRadius: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tabText: { fontSize: 12, fontFamily: F.semibold },
});
