import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsContext as ThemeBridgeContext } from '@/src/theme/themeContext';

/* ─── Types ───────────────────────────────────────────────────── */

export type ThemeOverride = 'system' | 'light' | 'dark';

interface SettingsValue {
  themeOverride:           ThemeOverride;
  targetBand:              number;          // IELTS 5–9
  notificationsEnabled:    boolean;
  nativeLanguage:          string;          // e.g. 'vi', 'zh', 'ja' …  '' = not yet set
  setThemeOverride:        (v: ThemeOverride) => void;
  setTargetBand:           (v: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNativeLanguage:       (v: string) => void;
}

const DEFAULTS = {
  themeOverride:        'system' as ThemeOverride,
  targetBand:           7,
  notificationsEnabled: true,
  nativeLanguage:       '',
};

const SettingsContext = createContext<SettingsValue>({
  ...DEFAULTS,
  setThemeOverride:        () => {},
  setTargetBand:           () => {},
  setNotificationsEnabled: () => {},
  setNativeLanguage:       () => {},
});

const STORAGE_KEY = '@vocally/settings';

/* ─── Provider ────────────────────────────────────────────────── */

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeOverride,        setThemeOverrideState]        = useState<ThemeOverride>(DEFAULTS.themeOverride);
  const [targetBand,           setTargetBandState]           = useState(DEFAULTS.targetBand);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(DEFAULTS.notificationsEnabled);
  const [nativeLanguage,       setNativeLanguageState]       = useState(DEFAULTS.nativeLanguage);

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
      } catch {}
    });
  }, []);

  function persist(patch: Partial<typeof DEFAULTS>) {
    const current = { themeOverride, targetBand, notificationsEnabled, nativeLanguage };
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

  return (
    <ThemeBridgeContext.Provider value={themeOverride}>
      <SettingsContext.Provider value={{
        themeOverride, targetBand, notificationsEnabled, nativeLanguage,
        setThemeOverride, setTargetBand, setNotificationsEnabled, setNativeLanguage,
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
