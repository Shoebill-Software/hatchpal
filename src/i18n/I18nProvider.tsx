import { useLocales } from 'expo-localization';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { usePreferencesStore } from '@/store/usePreferencesStore';

import { DEFAULT_LOCALE, resolveActiveLocale, type LocaleCode } from './locale';
import { createTranslator, translate, type TranslateFn, type TranslationParams } from './translate';
import type { TranslationKey } from './en';

export type I18nValue = {
  locale: LocaleCode;
  t: TranslateFn;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locales = useLocales();
  const localeOverride = usePreferencesStore((state) => state.localeOverride);
  const primary = locales[0];
  const locale = resolveActiveLocale(localeOverride, primary?.languageCode ?? primary?.languageTag);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: createTranslator(locale),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  const value = useContext(I18nContext);
  if (value) {
    return value;
  }

  return {
    locale: DEFAULT_LOCALE,
    t: (key: TranslationKey, params?: TranslationParams) => translate(DEFAULT_LOCALE, key, params),
  };
}
