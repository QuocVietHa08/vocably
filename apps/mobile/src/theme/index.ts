import { useColorScheme } from 'react-native';

export const ACCENT = '#f4511e';

export function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return {
    dark,
    bg:      dark ? '#0a0a0a' : '#f0f0f0',
    surface: dark ? '#141414' : '#ffffff',
    fg:      dark ? '#f5f5f5' : '#0a0a0a',
    muted:   dark ? '#666666' : '#999999',
    subtle:  dark ? '#1c1c1c' : '#e8e8e8',
    border:  dark ? '#222222' : '#e0e0e0',
    accent:  ACCENT,
  };
}

export type Theme = ReturnType<typeof useTheme>;
