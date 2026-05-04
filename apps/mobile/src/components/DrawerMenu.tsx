// apps/mobile/src/components/DrawerMenu.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mic as MicIcon,
  BookOpen as BookOpenIcon,
  Dumbbell as DumbbellIcon,
  Settings2 as Settings2Icon,
  Flame as FlameIcon,
  Smile as SmileIcon,
  X as XIcon,
  Menu as MenuIcon,
} from 'lucide-react-native';

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
const Mic      = MicIcon      as LucideIcon;
const BookOpen = BookOpenIcon as LucideIcon;
const Dumbbell = DumbbellIcon as LucideIcon;
const Settings2 = Settings2Icon as LucideIcon;
const Flame    = FlameIcon    as LucideIcon;
const Smile    = SmileIcon    as LucideIcon;
const X        = XIcon        as LucideIcon;
const Menu     = MenuIcon     as LucideIcon;
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';

/* ─── Constants ───────────────────────────────────────────────── */

const DRAWER_WIDTH  = Math.min(Dimensions.get('window').width * 0.72, 300);
const ANIM_DURATION = 280;

/* ─── BurgerIcon ──────────────────────────────────────────────── */

type BurgerIconProps = {
  isOpen: boolean;
  color: string;
};

export function BurgerIcon({ isOpen, color }: BurgerIconProps) {
  const IconX    = X    as React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  const IconMenu = Menu as React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  return isOpen
    ? <IconX    size={22} color={color} strokeWidth={2} />
    : <IconMenu size={22} color={color} strokeWidth={2} />;
}

/* ─── DrawerMenu ──────────────────────────────────────────────── */

type MenuItem = {
  label: string;
  route: '/' | '/practice' | '/grammar' | '/settings' | '/quiz' | '/mood-demo';
  icon: React.ReactNode;
};

type DrawerMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DrawerMenu({ isOpen, onClose }: DrawerMenuProps) {
  const t      = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);

  const translateX      = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  /* ─── Load sound on mount ─── */
  useEffect(() => {
    let mounted = true;
    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/sounds/drawer-open.wav'),
          { shouldPlay: false, volume: 0.4 },
        );
        if (mounted) soundRef.current = sound;
      } catch {
        // Sound file missing or device error — silently ignore
      }
    }
    void loadSound();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  /* ─── Play sound helper ─── */
  async function playSound() {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch {
      // Ignore playback errors
    }
  }

  /* ─── Animate on isOpen change ─── */
  useEffect(() => {
    if (isOpen) {
      void playSound();
      translateX.value = withTiming(0, {
        duration: ANIM_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0.5, { duration: ANIM_DURATION });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: ANIM_DURATION,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
    }
  }, [isOpen]);

  /* ─── Animated styles ─── */
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  /* ─── Navigation ─── */
  function navigate(route: MenuItem['route']) {
    onClose();
    router.push(route);
  }

  /* ─── Menu items ─── */
  const items: MenuItem[] = [
    { label: 'Swipe',        route: '/',          icon: <Flame    size={16} color={t.accent} strokeWidth={2.2} /> },
    { label: 'Speaking',     route: '/practice', icon: <Mic      size={16} color={t.accent} strokeWidth={2.2} /> },
    { label: 'Grammar',      route: '/grammar',  icon: <BookOpen size={16} color={t.accent} strokeWidth={2.2} /> },
    { label: 'Practice Quiz',route: '/quiz',     icon: <Dumbbell size={16} color={t.accent} strokeWidth={2.2} /> },
    { label: 'Mood',         route: '/mood-demo',icon: <Smile    size={16} color={t.accent} strokeWidth={2.2} /> },
    { label: 'Settings',     route: '/settings', icon: <Settings2 size={16} color={t.muted} strokeWidth={2}   /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: t.surface, borderRightColor: t.border },
          drawerStyle,
        ]}
      >
        {/* Go Pro banner */}
        <Pressable
          style={[styles.goProBtn, { backgroundColor: t.accent, marginTop: insets.top + 16 }]}
          onPress={() => { onClose(); setTimeout(() => router.push('/paywall'), 180); }}
        >
          <Text style={styles.goProText}>Go Pro ✦</Text>
        </Pressable>

        {/* Menu items */}
        <View style={styles.menuList}>
          {items.map((item) => (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: t.subtle },
              ]}
              onPress={() => navigate(item.route)}
            >
              {item.icon}
              <Text style={[styles.menuLabel, { color: t.fg }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* App name footer */}
        <View style={[styles.drawerFooter, { bottom: insets.bottom + 20 }]}>
          <Text style={[styles.appName, { color: t.fg }]}>Vocally</Text>
          <Text style={[styles.footerText, { color: t.muted }]}>IELTS Vocabulary</Text>
        </View>
      </Animated.View>
    </>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 11,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  goProBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  goProText: { fontSize: 14, fontFamily: F.bold, color: '#fff', letterSpacing: 0.4 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  menuList: { paddingTop: 8, paddingHorizontal: 12, gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuLabel: { fontSize: 15, fontFamily: F.semibold },
  drawerFooter: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  appName:    { fontSize: 18, fontFamily: F.extrabold },
  footerText: { fontSize: 11, fontFamily: F.medium, letterSpacing: 0.6, marginTop: 2 },
});
