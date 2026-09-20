import { StyleSheet, Text, View } from 'react-native';

import { hexToRgba, useNestPalette, type NestPaletteTokens } from '@/constants/nest';
import { Spacing } from '@/constants/theme';

export type MetricStatus = 'optimal' | 'warning' | 'neutral';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
}

const STATUS_LABEL: Record<MetricStatus, string> = {
  optimal: 'Optimal',
  warning: 'Needs care',
  neutral: 'Stable',
};

export function MetricCard({ label, value, unit, status = 'neutral' }: MetricCardProps) {
  const palette = useNestPalette();
  const accent = statusAccent(palette, status);
  const displayValue = typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value);
  const accessibilityValue = unit ? `${displayValue} ${unit}` : displayValue;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${accessibilityValue}, ${STATUS_LABEL[status]}`}
      style={[
        styles.card,
        {
          backgroundColor: hexToRgba(accent, 0.1),
          borderColor: hexToRgba(accent, 0.28),
        },
      ]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
          <View style={[styles.badge, { backgroundColor: hexToRgba(accent, 0.16) }]}>
            <View style={[styles.statusDot, { backgroundColor: accent }]} />
            <Text style={[styles.badgeLabel, { color: accent }]}>{STATUS_LABEL[status]}</Text>
          </View>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: palette.text }]}>{displayValue}</Text>
          {unit ? <Text style={[styles.unit, { color: palette.textMuted }]}>{unit}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function statusAccent(palette: NestPaletteTokens, status: MetricStatus): string {
  if (status === 'optimal') {
    return palette.optimal;
  }
  if (status === 'warning') {
    return palette.warning;
  }
  return palette.neutral;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 148,
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
  },
});
