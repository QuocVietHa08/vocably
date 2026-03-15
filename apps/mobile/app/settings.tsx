import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
// import { useAuth } from '@/src/context/AuthContext';
import { useSettings, type ThemeOverride } from '@/src/context/SettingsContext';
import { useT } from '@/src/i18n/useT';
import { NATIVE_LANGUAGES } from './welcome';
// import { usePurchases } from '@/src/context/PurchasesContext';
import { VOICE_OPTIONS, ttsSpeak, type OpenAIVoice } from '@/src/lib/openaiTts';

/* ─── Section & Row helpers ────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: t.muted }]}>{title}</Text>
      ) : null}
      <View style={[styles.sectionCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label, value, onPress, last = false, danger = false,
}: {
  label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: t.border },
        pressed && onPress && { backgroundColor: t.subtle },
      ]}
    >
      <Text style={[styles.rowLabel, { color: danger ? '#ef4444' : t.fg }]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.rowValue, { color: t.muted }]}>{value}</Text>
      )}
    </Pressable>
  );
}

function SwitchRow({ label, value, onChange, last = false }: {
  label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
      <Text style={[styles.rowLabel, { color: t.fg }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.border, true: '#f4511e88' }}
        thumbColor={value ? '#f4511e' : t.muted}
        ios_backgroundColor={t.border}
      />
    </View>
  );
}

/* ─── Theme picker ─────────────────────────────────────────────── */

const THEME_OPTIONS: { value: ThemeOverride; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
];

function ThemePicker() {
  const t = useTheme();
  const T = useT();
  const { themeOverride, setThemeOverride } = useSettings();

  const themeLabels: Record<ThemeOverride, string> = {
    system: T.themeSystem,
    light:  T.themeLight,
    dark:   T.themeDark,
  };

  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
      <Text style={[styles.rowLabel, { color: t.fg }]}>{T.appearanceLabel}</Text>
      <View style={styles.themeOptions}>
        {THEME_OPTIONS.map((opt) => {
          const active = themeOverride === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setThemeOverride(opt.value)}
              style={[
                styles.themeChip,
                { borderColor: active ? t.accent : t.border, backgroundColor: active ? `${t.accent}18` : t.subtle },
              ]}
            >
              <Text style={[styles.themeChipText, { color: active ? t.accent : t.muted }]}>
                {themeLabels[opt.value]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Language picker ──────────────────────────────────────────── */

function LanguagePicker() {
  const t = useTheme();
  const T = useT();
  const { nativeLanguage, setNativeLanguage } = useSettings();

  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
      <Text style={[styles.rowLabel, { color: t.fg }]}>{T.languageLabel}</Text>
      <View style={styles.langGrid}>
        {NATIVE_LANGUAGES.map((lang) => {
          const active = nativeLanguage === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => setNativeLanguage(lang.code)}
              style={[
                styles.langPill,
                { borderColor: active ? t.accent : t.border, backgroundColor: active ? `${t.accent}15` : t.subtle },
              ]}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, { color: active ? t.accent : t.fg }]}>{lang.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Band picker ──────────────────────────────────────────────── */

const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

function BandPicker() {
  const t = useTheme();
  const T = useT();
  const { targetBand, setTargetBand } = useSettings();

  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
      <Text style={[styles.rowLabel, { color: t.fg }]}>{T.targetBand}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        <View style={styles.bandRow}>
          {BANDS.map((b) => {
            const active = targetBand === b;
            return (
              <Pressable
                key={b}
                onPress={() => setTargetBand(b)}
                style={[
                  styles.bandChip,
                  { borderColor: active ? t.accent : t.border, backgroundColor: active ? t.accent : t.subtle },
                ]}
              >
                <Text style={[styles.bandChipText, { color: active ? '#fff' : t.muted }]}>
                  {b}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Voice picker ────────────────────────────────────────────── */

function VoicePicker() {
  const t = useTheme();
  const T = useT();
  const { ttsVoice, setTtsVoice } = useSettings();

  function handleSelect(voice: OpenAIVoice) {
    setTtsVoice(voice);
    // Play a short preview so the user hears the voice
    void ttsSpeak('Hello! This is how I sound.', voice);
  }

  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
      <Text style={[styles.rowLabel, { color: t.fg }]}>{T.voiceLabel}</Text>
      <View style={styles.voiceGrid}>
        {VOICE_OPTIONS.map((opt) => {
          const active = ttsVoice === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handleSelect(opt.value)}
              style={[
                styles.voicePill,
                { borderColor: active ? t.accent : t.border, backgroundColor: active ? `${t.accent}15` : t.subtle },
              ]}
            >
              <Text style={[styles.voiceName, { color: active ? t.accent : t.fg }]}>{opt.label}</Text>
              <Text style={[styles.voiceDesc, { color: t.muted }]}>{opt.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Screen ──────────────────────────────────────────────────── */

export default function SettingsScreen() {
  const t                                        = useTheme();
  const T                                        = useT();
  const router                                   = useRouter();
  // const { user, signOut }                        = useAuth(); // TODO: re-enable when auth is configured
  const { notificationsEnabled, setNotificationsEnabled } = useSettings();
  // const { isPro }                                = usePurchases(); // TODO: re-enable when payment is configured
  const isPro = false;

  async function handleSignOut() {
    // TODO: re-enable when auth is configured
    // await signOut();
    // router.replace('/auth');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={t.accent} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.fg }]}>{T.settingsTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Pro banner */}
        {!isPro && (
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[styles.proBanner, { backgroundColor: t.accent }]}
          >
            <View>
              <Text style={styles.proBannerTitle}>{T.upgradeTitle}</Text>
              <Text style={styles.proBannerSub}>{T.upgradeSub}</Text>
            </View>
            <ChevronRight size={22} color="#fff" strokeWidth={2.5} />
          </Pressable>
        )}

        {isPro && (
          <View style={[styles.proActiveBanner, { backgroundColor: `${t.accent}18`, borderColor: t.accent }]}>
            <Text style={[styles.proActivText, { color: t.accent }]}>{T.proActive}</Text>
          </View>
        )}

        {/* Profile */}
        <Section title={T.sectionAccount}>
          {/* TODO: show user?.email when auth is re-enabled */}
          <Row label={'Guest'} last />
        </Section>

        {/* Appearance */}
        <Section title={T.sectionAppearance}>
          <ThemePicker />
        </Section>

        {/* Language */}
        <Section title={T.sectionLanguage}>
          <LanguagePicker />
        </Section>

        {/* Voice */}
        <Section title={T.sectionVoice}>
          <VoicePicker />
        </Section>

        {/* Study */}
        <Section title={T.sectionStudy}>
          <BandPicker />
        </Section>

        {/* Notifications */}
        <Section title={T.sectionNotifications}>
          <SwitchRow
            label={T.dailyReminders}
            value={notificationsEnabled}
            onChange={setNotificationsEnabled}
            last
          />
        </Section>

        {/* Sign out */}
        <Section title="">
          <Row label={T.signOut} onPress={handleSignOut} danger last />
        </Section>

        <Text style={[styles.version, { color: t.muted }]}>Vocally · v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:      { width: 60 },
  backText:     { fontSize: 15, fontFamily: F.medium },
  headerTitle:  { fontSize: 17, fontFamily: F.bold },

  scroll: { paddingVertical: 20, paddingHorizontal: 20, gap: 0 },

  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11, fontFamily: F.bold, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 52,
  },
  rowLabel: { fontSize: 15, fontFamily: F.medium, flex: 1 },
  rowValue: { fontSize: 14, fontFamily: F.regular },

  themeOptions: { flexDirection: 'row', gap: 8 },
  themeChip: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  themeChipText: { fontSize: 13, fontFamily: F.semibold },

  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 4 },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6,
  },
  langFlag: { fontSize: 16 },
  langName: { fontSize: 12, fontFamily: F.medium },

  bandRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  bandChip: {
    width: 48, height: 40, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  bandChipText: { fontSize: 14, fontFamily: F.bold },

  voiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 4 },
  voicePill: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 8, gap: 2,
    minWidth: '45%' as any,
  },
  voiceName: { fontSize: 13, fontFamily: F.semibold },
  voiceDesc: { fontSize: 10, fontFamily: F.regular },

  version: { textAlign: 'center', fontSize: 12, fontFamily: F.regular, marginTop: 8, marginBottom: 20 },

  proBanner: {
    borderRadius: 16, padding: 18, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  proBannerTitle: { color: '#fff', fontSize: 16, fontFamily: F.bold, marginBottom: 3 },
  proBannerSub:   { color: '#ffffff99', fontSize: 12, fontFamily: F.regular },
  proBannerArrow: { color: '#fff', fontSize: 22, fontFamily: F.bold },

  proActiveBanner: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 24, alignItems: 'center',
  },
  proActivText: { fontSize: 14, fontFamily: F.bold },
});
