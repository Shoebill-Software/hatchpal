import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EggCarousel } from '@/components/EggCarousel';
import { GrowthPreviewSheet } from '@/components/GrowthPreviewSheet';
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
  const params = useLocalSearchParams<{ replacing?: string }>();
  const { pet, adoptPet } = useActivePet();
  const replacing = params.replacing === '1' || pet != null;
  const [selectedId, setSelectedId] = useState<SpeciesId>(SPECIES[0]?.id ?? 'silkie_chicken');
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [previewId, setPreviewId] = useState<SpeciesId | null>(null);
  const [nickname, setNickname] = useState('Pip');
  const [error, setError] = useState<string | null>(null);

  const roster = useMemo(() => speciesMatchingFilter(SPECIES, filter), [filter]);
  const cardWidth = Math.min(Math.max(width - Spacing.four * 2, 260), 420);
  const selected = roster.find((species) => species.id === selectedId) ?? roster[0] ?? SPECIES[0];
  const previewSpecies = SPECIES.find((species) => species.id === previewId) ?? null;

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

  const submit = () => {
    if (!selected) {
      setError(t('adoption.error'));
      return;
    }
    try {
      adoptPet(selected.id, nickname);
      router.replace('/');
    } catch {
      setError(t('adoption.error'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NestStatusBar />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.four,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: palette.text }]}>
          {replacing ? t('adoption.replaceTitle') : t('adoption.title')}
        </Text>
        <Text style={[styles.body, { color: palette.textMuted }]}>
          {replacing ? t('adoption.replaceBody') : t('adoption.body')}
        </Text>

        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{t('adoption.selectSpecies')}</Text>
        <TaxonFilterBar
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setError(null);
          }}
        />
        <EggCarousel
          species={roster}
          selectedId={selected?.id ?? selectedId}
          cardWidth={cardWidth}
          onSelect={(id) => {
            setSelectedId(id);
            setError(null);
          }}
          onInspect={setPreviewId}
        />
        <GrowthPreviewSheet
          species={previewSpecies}
          visible={previewSpecies != null}
          onClose={() => setPreviewId(null)}
        />

        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{t('adoption.nickname')}</Text>
        <TextInput
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            setError(null);
          }}
          maxLength={24}
          autoCorrect={false}
          placeholder={t('adoption.placeholder')}
          placeholderTextColor={palette.textMuted}
          accessibilityLabel={t('adoption.nicknameA11y')}
          style={[
            styles.input,
            {
              color: palette.text,
              backgroundColor: palette.surface,
              borderColor: error ? palette.warning : palette.border,
            },
          ]}
        />
        {error ? <Text style={[styles.error, { color: palette.warning }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
          ]}>
          <Text style={[styles.submitLabel, { color: palette.actionText }]}>
            {replacing ? t('adoption.replaceSubmit') : t('adoption.submit')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  submit: {
    marginTop: Spacing.two,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
