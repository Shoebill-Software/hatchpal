import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EggCarousel } from '@/components/EggCarousel';
import { NestStatusBar } from '@/components/NestStatusBar';
import { TaxonFilterBar } from '@/components/TaxonFilterBar';
import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { listSpeciesConfigs } from '@/data/species';
import { speciesMatchingFilter, type RosterFilter } from '@/data/species/roster';
import type { SpeciesId } from '@/domain/types';
import { useActivePet } from '@/hooks/useActivePet';
import { useTranslation } from '@/i18n';

const SPECIES = listSpeciesConfigs();

export default function AdoptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ replacing?: string | string[] }>();
  const { pet } = useActivePet();
  const replacingParam = Array.isArray(params.replacing) ? params.replacing[0] : params.replacing;
  const replacing = replacingParam === '1' || pet != null;
  const [selectedId, setSelectedId] = useState<SpeciesId>(SPECIES[0]?.id ?? 'silkie_chicken');
  const [filter, setFilter] = useState<RosterFilter>('all');

  const roster = useMemo(() => speciesMatchingFilter(SPECIES, filter), [filter]);
  const cardWidth = Math.min(Math.max(width - Spacing.four * 2, 260), 420);
  const selected = roster.find((species) => species.id === selectedId) ?? roster[0] ?? SPECIES[0];

  useEffect(() => {
    if (roster.length === 0) {
      return;
    }
    if (!roster.some((species) => species.id === selectedId)) {
      const first = roster[0];
      if (first) {
        setSelectedId(first.id);
      }
    }
  }, [roster, selectedId]);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.four,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}>
        <Text style={[styles.title, { color: palette.text }]}>
          {replacing ? t('adoption.replaceTitle') : t('adoption.title')}
        </Text>
        <Text style={[styles.body, { color: palette.textMuted }]}>
          {replacing ? t('adoption.replaceBody') : t('adoption.body')}
        </Text>

        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{t('adoption.selectSpecies')}</Text>
        <TaxonFilterBar value={filter} onChange={setFilter} />
        <EggCarousel
          species={roster}
          selectedId={selected?.id ?? selectedId}
          cardWidth={cardWidth}
          onSelect={setSelectedId}
          onInspect={(id) => {
            setSelectedId(id);
            router.push({
              pathname: '/showcase',
              params: { speciesId: id, replacing: replacing ? '1' : '0' },
            });
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
