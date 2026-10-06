import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { hexToRgba, useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { SizeReference, SizeReferenceId, WeightMark, WeightSample } from '@/domain/milestones';
import type { SpeciesConfig } from '@/domain/types';
import {
  formatBiologicalDay,
  formatBiologicalWeight,
  formatLocaleDate,
  localizeCopy,
  useTranslation,
} from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { LocaleCode } from '@/i18n/locale';
import type { TranslateFn } from '@/i18n/translate';

export interface GrowthLogProps {
  species: SpeciesConfig;
  isHatched: boolean;
  currentWeightGrams: number;
  samples: readonly WeightSample[];
  marks: readonly WeightMark[];
  references: readonly SizeReference[];
  activeReferenceId: SizeReferenceId | null;
}

const SIZE_COPY: Record<SizeReferenceId, { label: TranslationKey; note: TranslationKey }> = {
  silkie_golf_ball: { label: 'journal.size.silkieGolf', note: 'journal.size.silkieGolfNote' },
  silkie_grapefruit: { label: 'journal.size.silkieGrapefruit', note: 'journal.size.silkieGrapefruitNote' },
  silkie_teapot: { label: 'journal.size.silkieTeapot', note: 'journal.size.silkieTeapotNote' },
  gecko_raspberry: { label: 'journal.size.geckoRaspberry', note: 'journal.size.geckoRaspberryNote' },
  gecko_mouse: { label: 'journal.size.geckoMouse', note: 'journal.size.geckoMouseNote' },
  gecko_kiwi: { label: 'journal.size.geckoKiwi', note: 'journal.size.geckoKiwiNote' },
  turtle_lime: { label: 'journal.size.turtleLime', note: 'journal.size.turtleLimeNote' },
  turtle_melon: { label: 'journal.size.turtleMelon', note: 'journal.size.turtleMelonNote' },
  turtle_adults: { label: 'journal.size.turtleAdults', note: 'journal.size.turtleAdultsNote' },
};

export function GrowthLog({
  species,
  isHatched,
  currentWeightGrams,
  samples,
  marks,
  references,
  activeReferenceId,
}: GrowthLogProps) {
  const palette = useNestPalette();
  const { t, locale } = useTranslation();
  const recorded = isHatched ? massLabel(currentWeightGrams, locale, t) : t('journal.notEmerged');

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: palette.text }]}>{t('journal.growthTitle')}</Text>
      <View style={styles.metrics}>
        <Metric
          label={t('journal.hatchWeight')}
          value={massLabel(species.hatchWeightGrams, locale, t)}
        />
        <Metric label={t('journal.recordedNow')} value={recorded} />
        <Metric
          label={t('journal.adultPlateau')}
          value={massLabel(species.adultWeightGrams, locale, t)}
        />
      </View>

      {isHatched && samples.length > 0 ? (
        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.panelTitle, { color: palette.textMuted }]}>{t('journal.weightLog')}</Text>
          <WeightCurve samples={samples} />
          <View style={styles.marks}>
            {marks.map((mark) => (
              <View key={`${mark.id}-${mark.epoch}`} style={styles.markRow}>
                <View style={styles.markCopy}>
                  <Text style={[styles.markTitle, { color: palette.text }]}>
                    {localizeCopy(mark.title, locale)}
                  </Text>
                  <Text style={[styles.markMeta, { color: palette.textMuted }]}>
                    {markDetail(mark, locale, t)}
                  </Text>
                </View>
                <Text style={[styles.markMass, { color: palette.text }]}>
                  {massLabel(mark.grams, locale, t)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={[styles.note, { color: palette.textMuted }]}>{t('journal.beforeHatchWeight')}</Text>
      )}

      <Text style={[styles.subheading, { color: palette.text }]}>{t('journal.sizeComparison')}</Text>
      <View style={styles.references}>
        {references.map((reference) => {
          const copy = SIZE_COPY[reference.id];
          const active = isHatched && reference.id === activeReferenceId;
          const diameter = comparisonDiameter(reference.weightGrams, references);
          return (
            <View
              key={reference.id}
              accessibilityLabel={`${t(copy.label)}. ${t('journal.aboutWeight', {
                weight: massLabel(reference.weightGrams, locale, t),
              })}${active ? `. ${t('journal.closestReference')}` : ''}`}
              style={[
                styles.reference,
                {
                  backgroundColor: palette.surface,
                  borderColor: active ? palette.action : palette.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}>
              <View
                style={[
                  styles.orb,
                  {
                    width: diameter,
                    height: diameter,
                    borderRadius: diameter / 2,
                    backgroundColor: hexToRgba(active ? palette.action : palette.neutral, active ? 0.85 : 0.28),
                  },
                ]}
              />
              <Text style={[styles.referenceLabel, { color: palette.text }]}>{t(copy.label)}</Text>
              <Text style={[styles.referenceNote, { color: palette.textMuted }]}>{t(copy.note)}</Text>
              <Text style={[styles.referenceMass, { color: palette.text }]}>
                {t('journal.aboutWeight', { weight: massLabel(reference.weightGrams, locale, t) })}
              </Text>
              {active ? (
                <Text style={[styles.closest, { color: palette.action }]}>{t('journal.closestReference')}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const palette = useNestPalette();
  return (
    <View style={[styles.metric, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.metricLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function WeightCurve({ samples }: { samples: readonly WeightSample[] }) {
  const palette = useNestPalette();
  const { t, locale } = useTranslation();
  const [width, setWidth] = useState(0);
  const height = 148;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) {
    return null;
  }

  const label = `${t('journal.weightLog')}. ${massLabel(first.grams, locale, t)} – ${massLabel(last.grams, locale, t)}`;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && Math.abs(next - width) > 1) {
          setWidth(next);
        }
      }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <WeightPath samples={samples} width={width} height={height} color={palette.progressFill} />
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

function WeightPath({
  samples,
  width,
  height,
  color,
}: {
  samples: readonly WeightSample[];
  width: number;
  height: number;
  color: string;
}) {
  const padX = 12;
  const padY = 16;
  const innerWidth = Math.max(1, width - padX * 2);
  const innerHeight = Math.max(1, height - padY * 2);
  const minGrams = Math.min(...samples.map((sample) => sample.grams));
  const maxGrams = Math.max(...samples.map((sample) => sample.grams));
  const flat = maxGrams - minGrams < 0.5;
  const points = samples.map((sample, index) => {
    const x = padX + (samples.length === 1 ? innerWidth / 2 : (index / (samples.length - 1)) * innerWidth);
    const fraction = flat ? 0.5 : (sample.grams - minGrams) / (maxGrams - minGrams);
    const y = padY + (1 - fraction) * innerHeight;
    return { x, y };
  });
  const line = curvePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const fill =
    firstPoint && lastPoint
      ? `${line} L ${lastPoint.x.toFixed(2)} ${(height - 8).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - 8).toFixed(2)} Z`
      : '';

  return (
    <>
      {fill ? <Path d={fill} fill={hexToRgba(color, 0.18)} /> : null}
      {line ? <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((point, index) => (
        <Circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r={3.2} fill={color} />
      ))}
    </>
  );
}

function curvePath(points: ReadonlyArray<{ x: number; y: number }>): string {
  const first = points[0];
  if (!first) {
    return '';
  }
  if (points.length === 1) {
    return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  }

  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    if (!previous || !current || !next || !after) {
      continue;
    }
    const control1x = current.x + (next.x - previous.x) / 6;
    const control1y = current.y + (next.y - previous.y) / 6;
    const control2x = next.x - (after.x - current.x) / 6;
    const control2y = next.y - (after.y - current.y) / 6;
    path += ` C ${control1x.toFixed(2)} ${control1y.toFixed(2)} ${control2x.toFixed(2)} ${control2y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}

function comparisonDiameter(grams: number, references: readonly SizeReference[]): number {
  const masses = references.map((reference) => Math.max(reference.weightGrams, 1));
  const min = Math.min(...masses);
  const max = Math.max(...masses);
  const span = Math.log(max) - Math.log(min);
  const position = span <= 0 ? 1 : (Math.log(Math.max(grams, min)) - Math.log(min)) / span;
  return 36 + Math.min(1, Math.max(0, position)) * 42;
}

function massLabel(grams: number, locale: LocaleCode, t: TranslateFn): string {
  const weight = formatBiologicalWeight(grams, locale);
  const unit = t(weight.unit === 'kg' ? 'weight.kilograms' : 'weight.grams');
  return `${weight.value} ${unit}`;
}

function markDetail(mark: WeightMark, locale: LocaleCode, t: TranslateFn): string {
  const date = formatLocaleDate(mark.epoch, locale);
  if (mark.id === 'emergence' || mark.id === 'current') {
    return date;
  }
  return `${t('journal.postHatchDay', { day: formatBiologicalDay(mark.postHatchDay, locale) })} · ${date}`;
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two + 2,
    gap: 4,
    minHeight: 72,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  marks: {
    gap: Spacing.two,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  markCopy: {
    flex: 1,
    gap: 2,
  },
  markTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  markMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  markMass: {
    fontSize: 14,
    fontWeight: '700',
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  references: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  reference: {
    flexGrow: 1,
    flexBasis: 140,
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 4,
    minHeight: 168,
  },
  orb: {
    marginBottom: 4,
  },
  referenceLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  referenceNote: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  referenceMass: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  closest: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
});
