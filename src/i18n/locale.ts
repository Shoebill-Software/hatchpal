export const SUPPORTED_LOCALES = ['en', 'de'] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = 'en';

/** `system` follows the device language. `en` and `de` are explicit overrides. */
export type LocaleOverride = 'system' | LocaleCode;

/**
 * Maps a device language code or BCP 47 tag onto a supported locale.
 * Anything other than German falls back to English.
 */
export function resolveLocale(language: string | null | undefined): LocaleCode {
  if (typeof language !== 'string') {
    return DEFAULT_LOCALE;
  }

  const primary = language.trim().toLowerCase().split('-')[0];
  if (primary === 'de') {
    return 'de';
  }

  return DEFAULT_LOCALE;
}

/** Applies a saved language override, or the device language when the override is `system`. */
export function resolveActiveLocale(
  override: LocaleOverride,
  deviceLanguage: string | null | undefined
): LocaleCode {
  if (override === 'en' || override === 'de') {
    return override;
  }
  return resolveLocale(deviceLanguage);
}
