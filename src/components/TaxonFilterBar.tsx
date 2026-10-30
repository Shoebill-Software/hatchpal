import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHatcheryPalette } from '@/components/adoptionAtmosphere';
import { ROSTER_FILTERS, type RosterFilter } from '@/data/species/roster';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

const FILTER_LABEL: Record<RosterFilter, TranslationKey> = {
  all: 'adoption.filter.all',
  aves: 'adoption.filter.birds',
  reptilia: 'adoption.filter.reptiles',
  monotremata: 'adoption.filter.exotics',
};

export interface TaxonFilterBarProps {
  value: RosterFilter;
  onChange: (filter: RosterFilter) => void;
}

export function TaxonFilterBar({ value, onChange }: TaxonFilterBarProps) {
  const { t } = useTranslation();
  const palette = useHatcheryPalette();

  return (
    <View style={styles.row}>
      {ROSTER_FILTERS.map((filter) => {
        const selected = filter === value;
        return (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (filter === value) {
                return;
              }
              void triggerImpact(ImpactFeedbackStyle.Light);
              onChange(filter);
            }}
            style={({ pressed }) => [
              styles.hit,
              {
                backgroundColor: selected ? `rgba(${palette.veil}, 0.08)` : 'transparent',
                borderColor: `rgba(${palette.veil}, ${selected ? 0.28 : 0.12})`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text
              maxFontSizeMultiplier={1.15}
              style={[styles.label, { color: selected ? palette.ink : palette.quiet }]}>
              {t(FILTER_LABEL[filter])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  hit: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
