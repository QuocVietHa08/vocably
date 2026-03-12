import { createContext } from 'react';
import type { ThemeOverride } from '@/src/context/SettingsContext';

// Thin context used only to bridge themeOverride into useTheme
// The full SettingsContext (with setters) lives in src/context/SettingsContext.tsx
export const SettingsContext = createContext<ThemeOverride>('system');
