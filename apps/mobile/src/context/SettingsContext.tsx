import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsContext as ThemeBridgeContext } from '@/src/theme/themeContext';
import type { OpenAIVoice } from '@/src/lib/openaiTts';

/* ─── Types ───────────────────────────────────────────────────── */

export type ThemeOverride = 'system' | 'light' | 'dark';

interface SettingsValue {
  themeOverride:           ThemeOverride;
  targetBand:              number;          // IELTS 5–9
  notificationsEnabled:    boolean;
  nativeLanguage:          string;          // e.g. 'vi', 'zh', 'ja' …  '' = not yet set
  ttsVoice:                OpenAIVoice;     // OpenAI TTS voice
  dailyGoal:               number;          // words per day, e.g. 5 | 10 | 15 | 20 | 30 | 50
  setThemeOverride:        (v: ThemeOverride) => void;
  setTargetBand:           (v: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNativeLanguage:       (v: string) => void;
  setTtsVoice:             (v: OpenAIVoice) => void;
  setDailyGoal:            (v: number) => void;
}

const DEFAULTS = {
  themeOverride:        'system' as ThemeOverride,
  targetBand:           7,
  notificationsEnabled: true,
  nativeLanguage:       '',
  ttsVoice:             'nova' as OpenAIVoice,
  dailyGoal:            10,
};

const SettingsContext = createContext<SettingsValue>({
  ...DEFAULTS,
  setThemeOverride:        () => {},
  setTargetBand:           () => {},
  setNotificationsEnabled: () => {},
  setNativeLanguage:       () => {},
  setTtsVoice:             () => {},
  setDailyGoal:            () => {},
});

const STORAGE_KEY = '@vocally/settings';

/* ─── Provider ────────────────────────────────────────────────── */

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeOverride,        setThemeOverrideState]        = useState<ThemeOverride>(DEFAULTS.themeOverride);
  const [targetBand,           setTargetBandState]           = useState(DEFAULTS.targetBand);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(DEFAULTS.notificationsEnabled);
  const [nativeLanguage,       setNativeLanguageState]       = useState(DEFAULTS.nativeLanguage);
  const [ttsVoice,             setTtsVoiceState]             = useState<OpenAIVoice>(DEFAULTS.ttsVoice);
  const [dailyGoal,            setDailyGoalState]            = useState(DEFAULTS.dailyGoal);

  // Load from storage once on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.themeOverride)                setThemeOverrideState(saved.themeOverride);
        if (saved.targetBand != null)           setTargetBandState(saved.targetBand);
        if (saved.notificationsEnabled != null) setNotificationsEnabledState(saved.notificationsEnabled);
        if (saved.nativeLanguage)               setNativeLanguageState(saved.nativeLanguage);
        if (saved.ttsVoice)                     setTtsVoiceState(saved.ttsVoice);
        if (saved.dailyGoal != null)            setDailyGoalState(saved.dailyGoal);
      } catch {}
    });
  }, []);

  function persist(patch: Partial<typeof DEFAULTS>) {
    const current = { themeOverride, targetBand, notificationsEnabled, nativeLanguage, ttsVoice, dailyGoal };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  }

  function setThemeOverride(v: ThemeOverride) {
    setThemeOverrideState(v);
    persist({ themeOverride: v });
  }
  function setTargetBand(v: number) {
    setTargetBandState(v);
    persist({ targetBand: v });
  }
  function setNotificationsEnabled(v: boolean) {
    setNotificationsEnabledState(v);
    persist({ notificationsEnabled: v });
  }
  function setNativeLanguage(v: string) {
    setNativeLanguageState(v);
    persist({ nativeLanguage: v });
  }
  function setTtsVoice(v: OpenAIVoice) {
    setTtsVoiceState(v);
    persist({ ttsVoice: v });
  }
  function setDailyGoal(v: number) {
    setDailyGoalState(v);
    persist({ dailyGoal: v });
  }

  return (
    <ThemeBridgeContext.Provider value={themeOverride}>
      <SettingsContext.Provider value={{
        themeOverride, targetBand, notificationsEnabled, nativeLanguage, ttsVoice, dailyGoal,
        setThemeOverride, setTargetBand, setNotificationsEnabled, setNativeLanguage, setTtsVoice, setDailyGoal,
      }}>
        {children}
      </SettingsContext.Provider>
    </ThemeBridgeContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────── */
export function useSettings() {
  return useContext(SettingsContext);
}
