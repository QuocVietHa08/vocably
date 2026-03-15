import { useSettings } from '@/src/context/SettingsContext';
import { translations, type Translations } from './translations';

export type { Translations };

/**
 * Returns the UI translation object for the user's chosen native language.
 * Falls back to English when the language is unset, 'other', or not yet
 * translated.
 *
 * Usage:
 *   const T = useT();
 *   <Text>{T.practiceTitle}</Text>
 */
export function useT(): Translations {
  const { nativeLanguage } = useSettings();
  const lang = nativeLanguage && nativeLanguage !== 'other' ? nativeLanguage : 'en';
  return translations[lang] ?? translations.en;
}
