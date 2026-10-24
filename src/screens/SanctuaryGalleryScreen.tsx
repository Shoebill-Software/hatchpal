import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrowthSilhouette } from '@/components/GrowthSilhouette';
import { NestStatusBar } from '@/components/NestStatusBar';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatLocaleDate, useTranslation } from '@/i18n';
import {
  countArchivedSpecies,
  useCollectionStore,
  type HatchedSpecimen,
} from '@/store/useCollectionStore';

const OBSIDIAN = '#0B0A0C';
const PANEL = '#15131A';
const FRAME = '#8A7A4E';
const FRAME_SOFT = '#3A3326';
const BRASS = '#D8C089';
const PARCHMENT = '#EFE6D2';
const MUTED = '#9A9183';
const PLINTH = '#1D1A22';

export default function SanctuaryGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const archive = useCollectionStore((state) => state.hatchedArchive);
  const speciesCount = useMemo(() => countArchivedSpecies(archive), [archive]);

  return (
    <View style={styles.flex}>
      <NestStatusBar variant="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{t('common.hatchpal')}</Text>
        <Text style={styles.title}>{t('sanctuary.title')}</Text>
        <Text style={styles.subtitle}>{t('sanctuary.subtitle')}</Text>

        <View style={styles.stats}>
          <StatBlock value={speciesCount} label={t('sanctuary.species')} />
          <View style={styles.statDivider} />
          <StatBlock value={archive.length} label={t('sanctuary.specimens')} />
        </View>

        {archive.length === 0 ? (
          <EmptyHall onAdopt={() => router.push('/adopt')} />
        ) : (
          <View style={styles.grid}>
            {archive.map((specimen, index) => (
              <SpecimenCard
                key={specimen.id}
                specimen={specimen}
                number={archive.length - index}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SpecimenCard({ specimen, number }: { specimen: HatchedSpecimen; number: number }) {
  const { t } = useTranslation();
  const hatchedOn = formatLocaleDate(specimen.hatchDateEpoch);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('sanctuary.cardA11y', {
        name: specimen.nickname,
        species: specimen.scientificName,
        date: hatchedOn,
      })}
      style={styles.card}>
      <View style={styles.cardFrame}>
        <Text style={styles.dossier}>{t('sanctuary.dossier', { number })}</Text>
        <View style={styles.portrait}>
          <GrowthSilhouette
            speciesId={specimen.adultSilhouette}
            stage="adult"
            width={112}
            height={128}
            fill={BRASS}
          />
        </View>
        <View style={styles.plate} />
        <Text style={styles.specimenName} numberOfLines={1}>
          {specimen.nickname}
        </Text>
        <Text style={styles.specimenScientific} numberOfLines={1}>
          {specimen.scientificName}
        </Text>
        <Text style={styles.specimenCommon} numberOfLines={1}>
          {specimen.commonName}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaLine}>{t('sanctuary.hatchedOn', { date: hatchedOn })}</Text>
          <Text style={styles.metaLine}>
            {t('sanctuary.incubation', { days: specimen.incubationDurationDays })}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyHall({ onAdopt }: { onAdopt: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyFrame}>
        <Text style={styles.emptyTitle}>{t('sanctuary.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('sanctuary.emptyBody')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onAdopt}
        style={({ pressed }) => [styles.emptyCta, { opacity: pressed ? 0.85 : 1 }]}>
        <Text style={styles.emptyCtaLabel}>{t('sanctuary.emptyCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: PARCHMENT,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    fontFamily: Fonts?.serif,
  },
  subtitle: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 420,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FRAME_SOFT,
    backgroundColor: PANEL,
    gap: Spacing.four,
  },
  statBlock: {
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: FRAME_SOFT,
  },
  statValue: {
    color: BRASS,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts?.serif,
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  card: {
    flexGrow: 1,
    flexBasis: 220,
    maxWidth: 360,
  },
  cardFrame: {
    borderWidth: 1,
    borderColor: FRAME,
    borderRadius: 10,
    backgroundColor: PANEL,
    padding: Spacing.three,
    gap: 4,
  },
  dossier: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: Fonts?.mono,
  },
  portrait: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: PLINTH,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FRAME_SOFT,
  },
  plate: {
    height: 1,
    backgroundColor: FRAME_SOFT,
    marginVertical: Spacing.two,
  },
  specimenName: {
    color: PARCHMENT,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts?.serif,
  },
  specimenScientific: {
    color: BRASS,
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: Fonts?.serif,
  },
  specimenCommon: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  cardMeta: {
    marginTop: Spacing.two,
    gap: 2,
  },
  metaLine: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Fonts?.mono,
  },
  empty: {
    marginTop: Spacing.three,
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  emptyFrame: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: FRAME_SOFT,
    borderRadius: 12,
    backgroundColor: PANEL,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    color: PARCHMENT,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts?.serif,
  },
  emptyBody: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyCta: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FRAME,
  },
  emptyCtaLabel: {
    color: OBSIDIAN,
    fontSize: 16,
    fontWeight: '700',
  },
});
