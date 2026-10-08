import { createContext, useContext, type ReactNode } from 'react';

import { createTranslator, type TranslateFn } from './translate';

export type I18nValue = {
  t: TranslateFn;
};

const ENGLISH: I18nValue = {
  t: createTranslator(),
};

const I18nContext = createContext<I18nValue>(ENGLISH);

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={ENGLISH}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  return useContext(I18nContext);
}
