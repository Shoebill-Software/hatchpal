import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
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
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
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
            style={[
              styles.pill,
              {
                backgroundColor: selected ? palette.action : palette.surface,
                borderColor: selected ? palette.action : palette.border,
              },
            ]}>
            <Text style={[styles.label, { color: selected ? palette.actionText : palette.text }]}>
              {t(FILTER_LABEL[filter])}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
