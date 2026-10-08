import { en, type TranslationKey } from './en';

export type { TranslationKey } from './en';

export type TranslationParams = Record<string, string | number>;

export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export function translate(key: TranslationKey, params?: TranslationParams): string {
  const template = en[key];
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined ? '' : String(value);
  });
}

export function createTranslator(): TranslateFn {
  return (key, params) => translate(key, params);
}
