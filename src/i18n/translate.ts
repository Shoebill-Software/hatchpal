import { de } from './de';
import { en, type TranslationKey } from './en';
import { DEFAULT_LOCALE, type LocaleCode } from './locale';

export type { TranslationKey } from './en';

export type TranslationParams = Record<string, string | number>;

export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

const catalogs: Record<LocaleCode, { [K in TranslationKey]: string }> = {
  en,
  de,
};

export function translate(
  locale: LocaleCode,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const template = catalog[key] ?? catalogs[DEFAULT_LOCALE][key];
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined ? '' : String(value);
  });
}

export function createTranslator(locale: LocaleCode): TranslateFn {
  return (key, params) => translate(locale, key, params);
}
