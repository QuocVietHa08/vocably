import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsContext as ThemeBridgeContext } from '@/src/theme/themeContext';

/* ─── Types ───────────────────────────────────────────────────── */

export type ThemeOverride = 'system' | 'light' | 'dark';

interface SettingsValue {
  themeOverride:           ThemeOverride;
  targetBand:              number;          // IELTS 5–9
  notificationsEnabled:    boolean;
  setThemeOverride:        (v: ThemeOverride) => void;
  setTargetBand:           (v: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
}

const DEFAULTS: Omit<SettingsValue, 'setThemeOverride' | 'setTargetBand' | 'setNotificationsEnabled'> = {
  themeOverride:        'system',
  targetBand:           7,
  notificationsEnabled: true,
};

const SettingsContext = createContext<SettingsValue>({
  ...DEFAULTS,
  setThemeOverride:        () => {},
  setTargetBand:           () => {},
  setNotificationsEnabled: () => {},
});

const STORAGE_KEY = '@vocally/settings';

/* ─── Provider ────────────────────────────────────────────────── */

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeOverride,        setThemeOverrideState]        = useState<ThemeOverride>(DEFAULTS.themeOverride);
  const [targetBand,           setTargetBandState]           = useState(DEFAULTS.targetBand);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(DEFAULTS.notificationsEnabled);

  // Load from storage once on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.themeOverride)        setThemeOverrideState(saved.themeOverride);
        if (saved.targetBand != null)   setTargetBandState(saved.targetBand);
        if (saved.notificationsEnabled != null) setNotificationsEnabledState(saved.notificationsEnabled);
      } catch {}
    });
  }, []);

  function persist(patch: Partial<typeof DEFAULTS>) {
    const current = { themeOverride, targetBand, notificationsEnabled };
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

  return (
    <ThemeBridgeContext.Provider value={themeOverride}>
      <SettingsContext.Provider value={{
        themeOverride, targetBand, notificationsEnabled,
        setThemeOverride, setTargetBand, setNotificationsEnabled,
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
