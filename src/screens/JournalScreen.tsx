import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { GrowthLog } from '@/components/GrowthLog';
import { MilestoneDetailModal } from '@/components/MilestoneDetailModal';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SpeciesPortrait } from '@/components/portraits/SpeciesPortrait';
import { SettingsCorner } from '@/components/SettingsMenu';
import { hexToRgba, useNestPalette, type NestPaletteTokens } from '@/constants/nest';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { buildFieldJournalExport, journalExportMilestone } from '@/domain/journalExport';
import {
  buildJournalTimeline,
  generateWeightHistory,
  getWeightMarks,
  type JournalMilestone,
} from '@/domain/milestones';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import type { PetInstance, PetSnapshot, RosterTag, SpeciesConfig } from '@/domain/types';
import { useActivePet } from '@/hooks/useActivePet';
import {
  formatBiologicalDay,
  formatLocaleDate,
  formatPostHatchAge,
  formatWholePercent,
  lifeStageLabelKey,
  useTranslation,
} from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import { usePurchasesStore } from '@/store/usePurchasesStore';

const PLATE_PAPER = '#F7F1E6';

const TAXON_KEY: Record<RosterTag, TranslationKey> = {
  galliform: 'taxon.galliform',
  raptor: 'taxon.raptor',
  strigiform: 'taxon.strigiform',
  waterfowl: 'taxon.waterfowl',
  passerine: 'taxon.passerine',
  sphenisciform: 'taxon.sphenisciform',
  ratite: 'taxon.ratite',
  squamate: 'taxon.squamate',
  testudine: 'taxon.testudine',
  crocodilian: 'taxon.crocodilian',
  monotreme: 'taxon.monotreme',
};

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { pet, species, snapshot, hasHydrated, nowEpoch } = useActivePet();
  const canExportFieldJournal = usePurchasesStore((state) => state.canExportFieldJournal);
  const recordJournalExport = usePurchasesStore((state) => state.recordJournalExport);
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
      closed: snapshot.isUnviable,
    });
  }, [hatchEpoch, pet, species, snapshot]);

  const weightSamples = useMemo(() => {
    if (!species || !snapshot?.isHatched) {
      return [];
    }
    return generateWeightHistory(species, hatchEpoch, nowEpoch);
  }, [hatchEpoch, nowEpoch, species, snapshot?.isHatched]);

  const weightMarks = useMemo(() => {
    if (!species || !snapshot?.isHatched) {
      return [];
    }
    return getWeightMarks(species, hatchEpoch, nowEpoch);
  }, [hatchEpoch, nowEpoch, species, snapshot?.isHatched]);

  const openMilestone = timeline.find((entry) => entry.id === openId) ?? null;
  const active = timeline.find((entry) => entry.status === 'active') ?? null;

  const exportJournal = () => {
    if (!pet || !species || !snapshot) {
      return;
    }
    if (!canExportFieldJournal()) {
      Alert.alert(t('journal.export'), t('journal.exportLimited'));
      return;
    }
    const current = journalExportMilestone(timeline, snapshot.currentMilestone, snapshot.isUnviable);
    const message = buildFieldJournalExport({
      nickname: pet.nickname,
      commonName: species.commonName,
      scientificName: species.scientificName,
      laidAtEpoch: pet.laidAtEpoch,
      ageDays: snapshot.ageDays,
      lifeStage: t(lifeStageLabelKey(snapshot.lifeStage)),
      milestoneTitle: current.title,
      milestoneSummary: current.scientificSummary,
      closedNote: snapshot.isUnviable ? t('nest.unviableBody') : undefined,
    });
    void Share.share({ message }).then(
      (result) => {
        if (result.action === Share.sharedAction) {
          recordJournalExport();
        }
      },
      () => {
        Alert.alert(t('journal.export'), t('journal.exportFailed'));
      }
    );
  };

  const openEntry = (entry: JournalMilestone) => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    setOpenId(entry.id);
  };

  if (!hasHydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
        <SettingsCorner />
      </View>
    );
  }

  const contentPadding = {
    paddingTop: insets.top + Spacing.four,
    paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
  };

  if (!pet || !species || !snapshot) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.emptyContent, contentPadding]}
          showsVerticalScrollIndicator={false}>
          <EmptyJournal onAdopt={() => router.push('/adopt')} />
        </ScrollView>
        <SettingsCorner />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: palette.textMuted }]}>{t('common.hatchpal')}</Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text, fontFamily: Fonts?.serif }]}>
            {t('nav.journal')}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>{t('journal.subtitle')}</Text>
        </View>

        {snapshot.isClockTampered ? (
          <View style={[styles.banner, { backgroundColor: palette.banner, borderColor: palette.bannerBorder }]}>
            <Text style={[styles.bannerText, { color: palette.bannerText }]}>{t('clock.paused')}</Text>
          </View>
        ) : null}

        {snapshot.isUnviable ? (
          <View style={[styles.banner, { backgroundColor: palette.banner, borderColor: palette.bannerBorder }]}>
            <Text style={[styles.bannerTitle, { color: palette.bannerText }]}>{t('nest.unviableTitle')}</Text>
            <Text style={[styles.bannerText, { color: palette.bannerText }]}>{t('nest.unviableBody')}</Text>
          </View>
        ) : null}

        <SpecimenPlate
          pet={pet}
          species={species}
          snapshot={snapshot}
          active={active}
          closed={snapshot.isUnviable}
          palette={palette}
          onOpenActive={openEntry}
          onExport={exportJournal}
        />

        <MilestoneTimeline milestones={timeline} closed={snapshot.isUnviable} onSelect={openEntry} />

        <GrowthLog
          species={species}
          isHatched={snapshot.isHatched}
          currentWeightGrams={snapshot.currentWeightGrams}
          samples={weightSamples}
          marks={weightMarks}
        />
      </ScrollView>

      <MilestoneDetailModal
        visible={openMilestone != null}
        milestone={openMilestone}
        speciesId={species.id}
        onClose={() => setOpenId(null)}
      />
      <SettingsCorner />
    </View>
  );
}

function SpecimenPlate({
  pet,
  species,
  snapshot,
  active,
  closed,
  palette,
  onOpenActive,
  onExport,
}: {
  pet: PetInstance;
  species: SpeciesConfig;
  snapshot: PetSnapshot;
  active: JournalMilestone | null;
  closed: boolean;
  palette: NestPaletteTokens;
  onOpenActive: (entry: JournalMilestone) => void;
  onExport: () => void;
}) {
  const { t } = useTranslation();
  const grown = snapshot.lifeStage === 'juvenile' || snapshot.lifeStage === 'adult';
  const illustration = grown ? species.showcase.adultIllustration : species.showcase.babyIllustration;
  const progress = progressFraction(snapshot);
  const caption = progressCaption(snapshot, species, t);
  const percent = t('journal.percentValue', { percent: formatWholePercent(progress) });
  const recorded = active ? recordedLine(active, t) : '';

  return (
    <View style={[styles.plate, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.ribbon, { backgroundColor: species.growth.glow }]} />

      <View style={styles.identity}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t(grown ? 'showcase.a11y.adult' : 'showcase.a11y.baby', {
            name: species.commonName,
          })}
          style={[styles.well, { borderColor: hexToRgba('#2A2118', 0.08) }]}>
          <View style={[styles.glow, { backgroundColor: hexToRgba(species.growth.glow, 0.55) }]} />
          <SpeciesPortrait illustration={illustration} width={96} height={116} />
        </View>

        <View style={styles.identityCopy}>
          <Text style={[styles.taxon, { color: palette.textMuted }]}>{t(TAXON_KEY[species.tag])}</Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.nickname, { color: palette.text, fontFamily: Fonts?.serif }]}>
            {pet.nickname}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.scientific, { color: palette.secondaryAction, fontFamily: Fonts?.serif }]}>
            {species.scientificName}
          </Text>
          <Text style={[styles.commonName, { color: palette.textMuted }]}>{species.commonName}</Text>
        </View>
      </View>

      <View style={[styles.facts, { borderColor: palette.border }]}>
        <Fact label={t('metric.lifeStage')} value={t(lifeStageLabelKey(snapshot.lifeStage))} palette={palette} />
        <View style={[styles.factRule, { backgroundColor: palette.border }]} />
        <Fact
          label={t('journal.adoptedLabel')}
          value={formatLocaleDate(pet.laidAtEpoch)}
          palette={palette}
        />
      </View>

      {closed ? (
        <View style={styles.progressBlock}>
          <Text style={[styles.progressCaption, { color: palette.text }]}>{t('journal.closedProgress')}</Text>
        </View>
      ) : (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${caption}, ${percent}`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={styles.progressBlock}>
          <View style={styles.progressHead}>
            <Text style={[styles.progressCaption, { color: palette.text }]}>{caption}</Text>
            <Text style={[styles.progressPercent, { color: palette.textMuted }]}>{percent}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: palette.progressTrack }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.progressFill },
              ]}
            />
          </View>
        </View>
      )}

      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('journal.current')}. ${active.title}. ${recorded}`}
          onPress={() => onOpenActive(active)}
          style={({ pressed }) => [
            styles.current,
            { borderColor: palette.border, backgroundColor: pressed ? hexToRgba(palette.action, 0.06) : 'transparent' },
          ]}>
          <View style={styles.currentCopy}>
            <Text style={[styles.currentKicker, { color: palette.action }]}>{t('journal.current')}</Text>
            <Text style={[styles.currentTitle, { color: palette.text, fontFamily: Fonts?.serif }]}>
              {active.title}
            </Text>
            <Text numberOfLines={3} style={[styles.excerpt, { color: palette.textMuted, fontFamily: Fonts?.serif }]}>
              {active.scientificSummary}
            </Text>
            <Text style={[styles.currentDate, { color: palette.textMuted }]}>{recorded}</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor={palette.textMuted}
            fallback={<Text style={[styles.chevron, { color: palette.textMuted }]}>›</Text>}
          />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onExport}
        style={({ pressed }) => [
          styles.exportHit,
          { borderColor: palette.border, opacity: pressed ? 0.6 : 1 },
        ]}>
        <SymbolView
          name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
          size={16}
          tintColor={palette.action}
          fallback={<Text style={[styles.exportMark, { color: palette.action }]}>↑</Text>}
        />
        <Text style={[styles.exportLabel, { color: palette.action }]}>{t('journal.export')}</Text>
      </Pressable>
    </View>
  );
}

function Fact({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: NestPaletteTokens;
}) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: palette.text, fontFamily: Fonts?.serif }]}>{value}</Text>
    </View>
  );
}

function EmptyJournal({ onAdopt }: { onAdopt: () => void }) {
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <View style={styles.empty}>
      <Text style={[styles.kicker, styles.emptyKicker, { color: palette.warning }]}>{t('nav.journal')}</Text>
      <View style={[styles.blank, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Svg width={148} height={168} viewBox="0 0 148 168">
          <Ellipse
            cx="74"
            cy="62"
            rx="28"
            ry="36"
            fill="none"
            stroke={palette.border}
            strokeWidth={1.4}
            strokeDasharray="3 4"
          />
          <Path d="M36 118 H112" stroke={palette.border} strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M48 132 H100" stroke={palette.border} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
          <Path d="M60 146 H88" stroke={palette.border} strokeWidth={1.2} strokeLinecap="round" opacity={0.4} />
        </Svg>
      </View>
      <Text
        accessibilityRole="header"
        style={[styles.emptyTitle, { color: palette.text, fontFamily: Fonts?.serif }]}>
        {t('journal.emptyTitle')}
      </Text>
      <Text style={[styles.emptyBody, { color: palette.textMuted }]}>{t('journal.emptyBody')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAdopt}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.action, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}>
        <Text style={[styles.buttonLabel, { color: palette.actionText }]}>{t('nest.adoptEgg')}</Text>
      </Pressable>
    </View>
  );
}

function progressFraction(snapshot: PetSnapshot): number {
  const value = snapshot.isHatched ? snapshot.maturationProgress : snapshot.incubationProgress;
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function progressCaption(snapshot: PetSnapshot, species: SpeciesConfig, t: TranslateFn): string {
  if (!snapshot.isHatched) {
    return t('metric.dayOf', {
      day: snapshot.ageDays,
      total: formatBiologicalDay(species.incubationDays),
    });
  }
  if (snapshot.lifeStage === 'adult' || snapshot.daysUntilAdult <= 0) {
    return t('metric.mature');
  }
  return formatPostHatchAge(snapshot.postHatchAgeDays, t);
}

function recordedLine(entry: JournalMilestone, t: TranslateFn): string {
  const date = formatLocaleDate(entry.unlockEpoch);
  return entry.status === 'upcoming' ? t('journal.expectedOn', { date }) : t('journal.unlockedOn', { date });
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 6,
    paddingRight: 44,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 460,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.three,
  },
  bannerTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  plate: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  ribbon: {
    height: 4,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  well: {
    width: 104,
    height: 126,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLATE_PAPER,
    flexShrink: 0,
  },
  glow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    bottom: 14,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  taxon: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  nickname: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
  },
  scientific: {
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  commonName: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  facts: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  fact: {
    flex: 1,
    gap: 3,
  },
  factRule: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  factValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  progressBlock: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: 8,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressCaption: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  currentCopy: {
    flex: 1,
    gap: 4,
  },
  currentKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  currentTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentDate: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '500',
  },
  exportHit: {
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
  },
  exportMark: {
    fontSize: 16,
    fontWeight: '700',
  },
  exportLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  emptyKicker: {
    letterSpacing: 3.2,
  },
  blank: {
    width: 196,
    height: 210,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  emptyTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    minHeight: 52,
    minWidth: 196,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
