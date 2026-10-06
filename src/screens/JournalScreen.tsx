import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrowthLog } from '@/components/GrowthLog';
import { NestStatusBar } from '@/components/NestStatusBar';
import { MilestoneDetailModal } from '@/components/MilestoneDetailModal';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { useNestPalette } from '@/constants/nest';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  buildJournalTimeline,
  closestSizeReference,
  generateWeightHistory,
  getSizeReferences,
  getWeightMarks,
  type JournalMilestone,
} from '@/domain/milestones';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import { useActivePet } from '@/hooks/useActivePet';
import { formatLocaleDate, localizeCopy, useTranslation } from '@/i18n';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { t, locale } = useTranslation();
  const { pet, species, snapshot, hasHydrated } = useActivePet();
  const [openId, setOpenId] = useState<string | null>(null);

  const hatchEpoch = pet && species ? resolveHatchEpoch(pet, species) : 0;
  const timeline = useMemo(() => {
    if (!pet || !species || !snapshot) {
      return [];
    }
    return buildJournalTimeline({
      species,
      laidAtEpoch: pet.laidAtEpoch,
      progress: snapshot.incubationProgress,
      isHatched: snapshot.isHatched,
      postHatchAgeDays: snapshot.postHatchAgeDays,
      hatchEpoch,
    });
  }, [hatchEpoch, pet, species, snapshot]);

  const growth = useMemo(() => {
    if (!pet || !species || !snapshot || !snapshot.isHatched) {
      return { samples: [], marks: [] };
    }
    const currentEpoch = Math.max(hatchEpoch, pet.laidAtEpoch + snapshot.ageSeconds * 1000);
    return {
      samples: generateWeightHistory(species, hatchEpoch, currentEpoch),
      marks: getWeightMarks(species, hatchEpoch, currentEpoch),
    };
  }, [hatchEpoch, pet, species, snapshot]);

  const openMilestone = timeline.find((entry) => entry.id === openId) ?? null;

  if (!hasHydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
      </View>
    );
  }

  const contentPadding = {
    paddingTop: insets.top + Spacing.four,
    paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
  };

  if (!pet || !species || !snapshot) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
        <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentPadding]}>
          <EmptyNotebook onAdopt={() => router.push('/adopt')} />
        </ScrollView>
      </View>
    );
  }

  const dayCount = snapshot.ageDays;
  const references = getSizeReferences(species);
  const activeReference = snapshot.isHatched
    ? closestSizeReference(species, snapshot.currentWeightGrams)
    : null;

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentPadding]}>
        <Text style={[styles.kicker, { color: palette.textMuted }]}>{t('common.hatchpal')}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{t('nav.journal')}</Text>

        {snapshot.isClockTampered ? (
          <View style={[styles.banner, { backgroundColor: palette.banner, borderColor: palette.bannerBorder }]}>
            <Text style={[styles.bannerText, { color: palette.bannerText }]}>{t('clock.paused')}</Text>
          </View>
        ) : null}

        <View style={styles.identity}>
          <Text style={[styles.nickname, { color: palette.text }]}>{pet.nickname}</Text>
          <Text style={[styles.scientific, { color: palette.text, fontFamily: Fonts?.serif }]}>
            {species.scientificName}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {localizeCopy(species.commonName, locale)}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {t('journal.adoptedOn', { date: formatLocaleDate(pet.laidAtEpoch, locale) })}
          </Text>
          <Text style={[styles.meta, { color: palette.text }]}>
            {t(dayCount === 1 ? 'journal.dayRecorded' : 'journal.daysRecorded', { count: dayCount })}
          </Text>
        </View>

        <MilestoneTimeline milestones={timeline} onSelect={(entry: JournalMilestone) => setOpenId(entry.id)} />

        <GrowthLog
          species={species}
          isHatched={snapshot.isHatched}
          currentWeightGrams={snapshot.currentWeightGrams}
          samples={growth.samples}
          marks={growth.marks}
          references={references}
          activeReferenceId={activeReference?.id ?? null}
        />
      </ScrollView>

      <MilestoneDetailModal
        visible={openMilestone != null}
        milestone={openMilestone}
        speciesId={species.id}
        onClose={() => setOpenId(null)}
      />
    </View>
  );
}

function EmptyNotebook({ onAdopt }: { onAdopt: () => void }) {
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <View style={styles.empty}>
      <Text style={[styles.kicker, { color: palette.textMuted }]}>{t('common.hatchpal')}</Text>
      <Text style={[styles.title, { color: palette.text }]}>{t('nav.journal')}</Text>
      <View style={[styles.notebook, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.notebookSpine, { backgroundColor: palette.action }]} />
        <View style={styles.notebookPage}>
          <Text style={[styles.emptyTitle, { color: palette.text, fontFamily: Fonts?.serif }]}>
            {t('journal.emptyTitle')}
          </Text>
          {[0, 1, 2, 3].map((line) => (
            <View key={line} style={[styles.rule, { backgroundColor: palette.border }]} />
          ))}
          <Text style={[styles.emptyBody, { color: palette.textMuted }]}>{t('journal.emptyBody')}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onAdopt}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
        ]}>
        <Text style={[styles.buttonLabel, { color: palette.actionText }]}>{t('nest.adoptEgg')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  identity: {
    gap: 4,
  },
  nickname: {
    fontSize: 22,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    gap: Spacing.three,
  },
  notebook: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 220,
  },
  notebookSpine: {
    width: 14,
  },
  notebookPage: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  rule: {
    height: 1,
    opacity: 0.7,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.one,
  },
  button: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
