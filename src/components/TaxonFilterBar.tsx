import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HATCHERY } from '@/components/adoptionAtmosphere';
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
            style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.6 : 1 }]}>
            <Text
              maxFontSizeMultiplier={1.15}
              style={[styles.label, { color: selected ? HATCHERY.ink : HATCHERY.quiet }]}>
              {t(FILTER_LABEL[filter])}
            </Text>
            <View style={[styles.mark, { backgroundColor: selected ? HATCHERY.amber : 'transparent' }]} />
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
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
  },
  hit: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingTop: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  mark: {
    marginTop: 6,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
});
