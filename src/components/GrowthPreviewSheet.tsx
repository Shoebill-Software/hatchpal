import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { SpeciesConfig } from '@/domain/types';
import { formatBiologicalWeight, useTranslation } from '@/i18n';

import { GrowthSilhouette } from './GrowthSilhouette';
import { SpeciesEggArt } from './SpeciesEggArt';

export interface GrowthPreviewSheetProps {
  species: SpeciesConfig | null;
  visible: boolean;
  onClose: () => void;
}

const COLUMN_MAX = 168;

export function GrowthPreviewSheet({ species, visible, onClose }: GrowthPreviewSheetProps) {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!species) {
    return null;
  }

  const eggCm = species.egg.lengthMm / 10;
  const hatchCm = species.growth.hatchlingMeasureCm;
  const adultCm = species.growth.adultMeasureCm;
  const referenceCm = species.growth.referenceCentimeters;
  const maxCm = Math.max(eggCm, hatchCm, adultCm, referenceCm, 1);
  const metricLabel =
    species.growth.adultMetricKind === 'wingspan'
      ? t('growth.projectedWingspan')
      : t('growth.projectedLength');
  const adultMass = formatBiologicalWeight(species.adultWeightGrams);
  const massUnit = adultMass.unit === 'kg' ? t('weight.kilograms') : t('weight.grams');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('growth.close')} style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: palette.text }]}>{t('growth.title')}</Text>
              <Text style={[styles.subtitle, { color: palette.text }]}>
                {species.commonName}
              </Text>
              <Text style={[styles.scientific, { color: palette.textMuted }]}>{species.scientificName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('growth.close')}
              onPress={onClose}
              style={[styles.close, { borderColor: palette.border }]}>
              <Text style={[styles.closeLabel, { color: palette.text }]}>{t('growth.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.section, { color: palette.textMuted }]}>{t('growth.timeline')}</Text>
            <Text style={[styles.scaleCaption, { color: palette.textMuted }]}>
              {t('growth.scale', { reference: species.growth.reference })}
            </Text>
            <View style={styles.columns}>
              <ScaleColumn
                label={t('growth.egg')}
                caption={t('growth.centimeters', { value: formatCm(eggCm) })}
                height={columnHeight(eggCm, maxCm)}>
                <SpeciesEggArt species={species} width={54} height={columnHeight(eggCm, maxCm)} />
              </ScaleColumn>
              <ScaleColumn
                label={t('growth.juvenileSilhouette')}
                caption={t('growth.centimeters', { value: formatCm(hatchCm) })}
                height={columnHeight(hatchCm, maxCm)}>
                <GrowthSilhouette
                  speciesId={species.id}
                  stage="juvenile"
                  width={64}
                  height={columnHeight(hatchCm, maxCm)}
                  fill={species.growth.shadow}
                />
              </ScaleColumn>
              <ScaleColumn
                label={t('growth.adultForm')}
                caption={t('growth.centimeters', { value: formatCm(adultCm) })}
                height={columnHeight(adultCm, maxCm)}>
                <GrowthSilhouette
                  speciesId={species.id}
                  stage="adult"
                  width={72}
                  height={columnHeight(adultCm, maxCm)}
                  fill={species.growth.body}
                />
              </ScaleColumn>
              <ScaleColumn
                label={t('growth.reference')}
                caption={t('growth.centimeters', { value: formatCm(referenceCm) })}
                height={columnHeight(referenceCm, maxCm)}>
                <ReferenceMark kind={species.growth.referenceScale} height={columnHeight(referenceCm, maxCm)} color={palette.text} />
              </ScaleColumn>
            </View>

            <View style={[styles.metrics, { borderColor: palette.border }]}>
              <Metric label={t('growth.timeline')} value={t('growth.incubation', { days: species.incubationDays })} />
              <Metric label={t('growth.adult')} value={t('growth.toAdult', { days: species.adultMaturationDays })} />
              <Metric
                label={metricLabel}
                value={t('growth.centimeters', { value: formatCm(adultCm) })}
              />
              <Metric label={t('growth.estimatedAdultWeight')} value={`${adultMass.value} ${massUnit}`} />
            </View>

            <Text style={[styles.section, { color: palette.textMuted }]}>{t('growth.behavior')}</Text>
            <Text style={[styles.prose, { color: palette.text }]}>
              {species.growth.behavior}
            </Text>
            <Text style={[styles.section, { color: palette.textMuted }]}>{t('growth.fieldNotes')}</Text>
            <Text style={[styles.prose, { color: palette.text }]}>
              {species.growth.fieldNotes}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScaleColumn({
  label,
  caption,
  height,
  children,
}: {
  label: string;
  caption: string;
  height: number;
  children: ReactNode;
}) {
  const palette = useNestPalette();
  return (
    <View style={styles.column}>
      <View style={[styles.figureSlot, { height: COLUMN_MAX }]}>
        <View style={{ height }}>{children}</View>
      </View>
      <Text style={[styles.columnLabel, { color: palette.text }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.columnCaption, { color: palette.textMuted }]}>{caption}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const palette = useNestPalette();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function ReferenceMark({
  kind,
  height,
  color,
}: {
  kind: SpeciesConfig['growth']['referenceScale'];
  height: number;
  color: string;
}) {
  const width = Math.max(36, height * 0.55);
  if (kind === 'coin') {
    const size = Math.max(28, height);
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="2" />
        <Circle cx="20" cy="20" r="10" fill="none" stroke={color} strokeWidth="1.4" />
      </Svg>
    );
  }
  if (kind === 'hand') {
    return (
      <Svg width={width} height={height} viewBox="0 0 60 90">
        <Path
          d="M24 88 L24 46 L16 40 L16 22 C16 16 22 14 24 20 L26 32 L26 14 C26 8 32 8 32 14 L32 34 L36 12 C36 6 42 6 42 12 L42 38 L48 22 C48 16 54 18 52 26 L44 48 L44 88 Z"
          fill={color}
          opacity={0.85}
        />
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height} viewBox="0 0 50 120">
      <Circle cx="25" cy="14" r="10" fill={color} />
      <Path d="M25 26 L25 72 M25 40 L8 58 M25 40 L42 58 M25 72 L12 112 M25 72 L38 112" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

function columnHeight(cm: number, maxCm: number): number {
  return Math.max(18, Math.min(COLUMN_MAX, (cm / maxCm) * COLUMN_MAX));
}

function formatCm(cm: number): string {
  const digits = cm >= 100 ? 0 : 1;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(cm);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 12, 8, 0.46)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9BBAE',
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  close: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  section: {
    marginTop: Spacing.two,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  scaleCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  figureSlot: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  columnCaption: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  metrics: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  metric: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  prose: {
    fontSize: 15,
    lineHeight: 22,
  },
});
