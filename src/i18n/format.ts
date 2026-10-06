import type { LifeStage, LocalizedCopy } from '@/domain/types';

import type { LocaleCode } from './locale';
import type { TranslationKey } from './en';
import type { TranslateFn } from './translate';

export type ElapsedSpan =
  | { unit: 'now' }
  | { unit: 'minute' | 'hour' | 'day'; count: number };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function localizeCopy(copy: LocalizedCopy, locale: LocaleCode): string {
  const preferred = copy[locale];
  if (preferred.trim().length > 0) {
    return preferred;
  }
  return copy.en;
}

export function getElapsedSpan(fromEpoch: number, nowEpoch: number): ElapsedSpan {
  if (!Number.isFinite(fromEpoch) || !Number.isFinite(nowEpoch)) {
    return { unit: 'now' };
  }

  const deltaMs = Math.max(0, nowEpoch - fromEpoch);
  if (deltaMs < MINUTE_MS) {
    return { unit: 'now' };
  }

  const minutes = Math.floor(deltaMs / MINUTE_MS);
  if (minutes < 60) {
    return { unit: 'minute', count: minutes };
  }

  const hours = Math.floor(deltaMs / HOUR_MS);
  if (hours < 24) {
    return { unit: 'hour', count: hours };
  }

  return { unit: 'day', count: Math.floor(deltaMs / DAY_MS) };
}

export function formatDuration(span: ElapsedSpan, t: TranslateFn): string {
  if (span.unit === 'now') {
    return t('time.justNow');
  }

  const key: TranslationKey = span.count === 1 ? `time.${span.unit}` : `time.${span.unit}s`;
  return t(key, { count: span.count });
}

export function formatAgo(span: ElapsedSpan, t: TranslateFn): string {
  if (span.unit === 'now') {
    return t('time.justNow');
  }
  return t('time.ago', { time: formatDuration(span, t) });
}

export function formatTurnPhrase(hasTurned: boolean, span: ElapsedSpan, t: TranslateFn): string {
  if (!hasTurned) {
    return t('turn.swipe');
  }
  if (span.unit === 'now') {
    return t('turn.justNow');
  }
  return t('turn.ago', { time: formatDuration(span, t) });
}

const WEEK_DAY_THRESHOLD = 14;

export function formatPostHatchAge(ageDays: number, t: TranslateFn): string {
  const whole = Number.isFinite(ageDays) ? Math.max(0, Math.floor(ageDays)) : 0;
  if (whole >= WEEK_DAY_THRESHOLD) {
    return t('metric.ageWeek', { week: Math.floor(whole / 7) });
  }
  return t('metric.ageDay', { day: whole });
}

export function lifeStageLabelKey(stage: LifeStage): TranslationKey {
  switch (stage) {
    case 'hatchling':
      return 'stage.hatchling';
    case 'juvenile':
      return 'stage.juvenile';
    case 'adult':
      return 'stage.adult';
    case 'pip':
      return 'stage.pip';
    default:
      return 'stage.egg';
  }
}

export function lifeStageBadgeKey(stage: LifeStage): TranslationKey {
  switch (stage) {
    case 'juvenile':
      return 'stage.badgeJuvenile';
    case 'adult':
      return 'stage.badgeAdult';
    case 'hatchling':
      return 'stage.badgeHatchling';
    default:
      return 'stage.badgeHatchling';
  }
}

export type BiologicalWeight = {
  value: string;
  unit: 'g' | 'kg';
};

export function formatBiologicalWeight(grams: number, locale: LocaleCode): BiologicalWeight {
  if (!Number.isFinite(grams) || grams < 0) {
    return { value: '0', unit: 'g' };
  }

  const numberLocale = locale === 'de' ? 'de-DE' : 'en-US';
  if (grams >= 1000) {
    const kilograms = grams / 1000;
    const digits = kilograms >= 100 ? 0 : 1;
    return {
      value: new Intl.NumberFormat(numberLocale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(kilograms),
      unit: 'kg',
    };
  }

  const digits = grams < 10 ? 1 : 0;
  return {
    value: new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(grams),
    unit: 'g',
  };
}

export function formatCarePhrase(
  kind: 'feed' | 'weigh',
  hasRecord: boolean,
  span: ElapsedSpan,
  t: TranslateFn
): string {
  if (!hasRecord) {
    return t('care.notYet');
  }
  if (kind === 'weigh' && (span.unit === 'now' || span.unit === 'minute')) {
    return t('care.weighedRecently');
  }
  const time = span.unit === 'now' ? t('time.justNow') : formatDuration(span, t);
  return kind === 'feed' ? t('care.fedAgo', { time }) : t('care.weighedAgo', { time });
}

export function formatLocaleDate(epoch: number, locale: LocaleCode): string {
  if (!Number.isFinite(epoch)) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epoch));
}

export function formatBiologicalDay(day: number, locale: LocaleCode): string {
  if (!Number.isFinite(day)) {
    return '0';
  }

  const tenths = Math.round(day * 10) / 10;
  const whole = Math.abs(tenths - Math.round(tenths)) < 0.001;
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 1,
  }).format(tenths);
}

export function formatWholePercent(fraction: number, locale: LocaleCode): string {
  const safe = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(safe * 100));
}
