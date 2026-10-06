export { I18nProvider, useTranslation } from './I18nProvider';
export {
  localizeCopy,
  formatAgo,
  formatBiologicalDay,
  formatBiologicalWeight,
  formatWholePercent,
  formatCarePhrase,
  formatDuration,
  formatLocaleDate,
  formatPostHatchAge,
  formatTurnPhrase,
  getElapsedSpan,
  lifeStageBadgeKey,
  lifeStageLabelKey,
} from './format';
export {
  DEFAULT_LOCALE,
  resolveActiveLocale,
  resolveLocale,
  type LocaleCode,
  type LocaleOverride,
} from './locale';
export { translate, type TranslationKey, type TranslationParams, type TranslateFn } from './translate';
