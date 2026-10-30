import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fitSilhouette, GrowthSilhouette } from '@/components/GrowthSilhouette';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsCorner } from '@/components/SettingsMenu';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { getSpeciesConfig } from '@/data/species';
import { cradleAllowance, SANCTUARY_CRADLE_LIMIT } from '@/domain/cradleCapacity';
import { priceStringFor, productIdForSpecies, SANCTUARY_PASS_PRODUCT_ID } from '@/domain/entitlements';
import {
  isKeeperMilestoneId,
  RESERVE_SPECIES_IDS,
  rewardsForMilestone,
  type KeeperMilestone,
  type KeeperReward,
} from '@/domain/keeperRewards';
import type { ShellPaint, SpeciesId, Temperament } from '@/domain/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  KEEPER_DETAIL_KEY,
  KEEPER_PROGRESS_KEY,
  KEEPER_TITLE_KEY,
  keeperRewardLabel,
  useKeeperAccess,
} from '@/hooks/useKeeperMilestones';
import { formatLocaleDate, useTranslation } from '@/i18n';
import type { TranslateFn } from '@/i18n/translate';
import { NotificationFeedbackType, triggerImpact, triggerNotification, ImpactFeedbackStyle } from '@/services/hapticFeedback';
import { isPurchaseCancelled } from '@/services/purchaseErrors';
import { orderedCradleIds } from '@/store/createPetStore';
import { countArchivedSpecies, useCollectionStore, type HatchedSpecimen } from '@/store/useCollectionStore';
import { usePetStore } from '@/store/usePetStore';
import { usePurchasesStore } from '@/store/usePurchasesStore';

type LedgerPalette = {
  ground: string;
  paper: string;
  ink: string;
  muted: string;
  line: string;
  moss: string;
  mossInk: string;
  clay: string;
  clayInk: string;
};

const LEDGER: Record<'light' | 'dark', LedgerPalette> = {
  light: {
    ground: '#E4EFE6',
    paper: '#F7FBF6',
    ink: '#1A2B22',
    muted: '#5C7364',
    line: '#C9DCCE',
    moss: '#1F6B45',
    mossInk: '#F4FFF7',
    clay: '#C4622D',
    clayInk: '#FFF8F3',
  },
  dark: {
    ground: '#101612',
    paper: '#1A2420',
    ink: '#E7F2EA',
    muted: '#9BB0A4',
    line: '#2E4036',
    moss: '#8FCB9A',
    mossInk: '#102016',
    clay: '#E0A15A',
    clayInk: '#1A1410',
  },
};

const TEMPERAMENT_TINT: Record<Temperament, string> = {
  sunny: '#E89B3A',
  dewy: '#5FA8CC',
  songful: '#B07CC6',
  curious: '#6BAF7A',
  easygoing: '#C4A15A',
};

export default function SanctuaryGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const palette = LEDGER[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const nest = useNestPalette();
  const archive = useCollectionStore((state) => state.hatchedArchive);
  const pets = usePetStore((state) => state.pets);
  const cradleOrder = usePetStore((state) => state.cradleOrder);
  const packages = usePurchasesStore((state) => state.availablePackages);
  const purchaseProduct = usePurchasesStore((state) => state.purchaseProduct);
  const { milestones, isAvailable, isProUnlocked } = useKeeperAccess();
  const [buying, setBuying] = useState(false);
  const params = useLocalSearchParams<{ reward?: string | string[] }>();
  const rewardParam = Array.isArray(params.reward) ? params.reward[0] : params.reward;
  const rewardKey = rewardParam ?? '';
  const [dismissedReward, setDismissedReward] = useState('');
  const cradles = orderedCradleIds(pets, cradleOrder).flatMap((id) => {
    const pet = pets[id];
    return pet ? [pet] : [];
  });
  const allowance = cradleAllowance(isProUnlocked, archive.length);
  const speciesCount = countArchivedSpecies(archive);
  const passPrice = priceStringFor(packages, SANCTUARY_PASS_PRODUCT_ID);
  const reserve = RESERVE_SPECIES_IDS.filter((speciesId) => !isAvailable(speciesId));
  const rewardLabels = rewardLabelsFor(rewardKey, t);
  const showReward = rewardLabels.length > 0 && dismissedReward !== rewardKey;

  const buyPass = () => {
    setBuying(true);
    void purchaseProduct(SANCTUARY_PASS_PRODUCT_ID)
      .then(() => {
        void triggerNotification(NotificationFeedbackType.Success);
      })
      .catch((error: unknown) => {
        if (!isPurchaseCancelled(error)) {
          Alert.alert(t('settings.restoreTitle'), t('showcase.purchaseFailed'));
        }
      })
      .finally(() => {
        setBuying(false);
      });
  };

  const openNest = (index: number) => {
    if (index < cradles.length) {
      usePetStore.getState().switchCradle(index);
      void triggerImpact(ImpactFeedbackStyle.Light);
      router.push('/');
      return;
    }
    if (index < allowance) {
      void triggerImpact(ImpactFeedbackStyle.Light);
      router.push(cradles.length === 0 ? '/adopt' : { pathname: '/adopt', params: { adding: '1' } });
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: palette.ground }]}>
      <NestStatusBar />
      <SettingsCorner />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: palette.muted }]}>{t('common.hatchpal')}</Text>
        <Text style={[styles.title, { color: palette.ink, fontFamily: Fonts?.serif }]}>{t('sanctuary.title')}</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>{t('sanctuary.subtitle')}</Text>

        <View style={styles.stats}>
          <Text style={[styles.stat, { color: palette.ink }]}>
            {t('sanctuary.speciesCount', { count: speciesCount })}
          </Text>
          <Text style={[styles.statDot, { color: palette.line }]}>·</Text>
          <Text style={[styles.stat, { color: palette.ink }]}>
            {archive.length} {t('sanctuary.specimens')}
          </Text>
        </View>

        {showReward ? (
          <View style={[styles.banner, { backgroundColor: palette.moss }]}>
            <Text style={[styles.bannerBody, { color: palette.mossInk }]}>
              {t('sanctuary.rewardBanner', { rewards: englishList(rewardLabels) })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('sanctuary.dismissReward')}
              onPress={() => setDismissedReward(rewardKey)}
              hitSlop={8}>
              <Text style={[styles.bannerDismiss, { color: palette.mossInk }]}>{t('sanctuary.dismissReward')}</Text>
            </Pressable>
          </View>
        ) : null}

        <SectionLabel label={t('sanctuary.nests')} color={palette.muted} />
        <View style={styles.nestRow}>
          {Array.from({ length: SANCTUARY_CRADLE_LIMIT }, (_, index) => (
            <NestWell
              key={index}
              index={index}
              palette={palette}
              occupant={cradles[index] ?? null}
              open={index < allowance}
              onOpen={() => openNest(index)}
            />
          ))}
        </View>
        {allowance < SANCTUARY_CRADLE_LIMIT ? (
          <View style={styles.passBlock}>
            <Text style={[styles.passNote, { color: palette.muted }]}>
              {t(allowance < 2 ? 'sanctuary.passNote' : 'sanctuary.passNoteThird')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('sanctuary.getPass', { price: passPrice })}
              disabled={buying}
              onPress={buyPass}
              style={({ pressed }) => [
                styles.passRow,
                { backgroundColor: palette.clay, opacity: buying ? 0.6 : pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.passRowLabel, { color: nest.actionText }]}>
                {t('sanctuary.getPass', { price: passPrice })}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <SectionLabel label={t('sanctuary.path')} color={palette.muted} />
        <View style={styles.stack}>
          {milestones.map((milestone) => (
            <PathCard
              key={milestone.id}
              milestone={milestone}
              palette={palette}
              next={!milestone.unlocked && milestones.find((item) => !item.unlocked)?.id === milestone.id}
              speciesOwned={(speciesId) => isAvailable(speciesId)}
              nestOwned={allowance >= 2}
            />
          ))}
        </View>

        <SectionLabel label={t('sanctuary.residents')} color={palette.muted} />
        {archive.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.paper, borderColor: palette.line }]}>
            <Text style={[styles.emptyTitle, { color: palette.ink, fontFamily: Fonts?.serif }]}>
              {t('sanctuary.emptyTitle')}
            </Text>
            <Text style={[styles.emptyBody, { color: palette.muted }]}>{t('sanctuary.emptyBody')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/adopt')}
              style={({ pressed }) => [
                styles.adopt,
                { backgroundColor: palette.moss, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.adoptLabel, { color: palette.mossInk }]}>{t('sanctuary.emptyCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stack}>
            {archive.map((specimen) => (
              <ResidentRow key={specimen.id} specimen={specimen} palette={palette} />
            ))}
          </View>
        )}

        {reserve.length > 0 ? (
          <>
            <SectionLabel label={t('sanctuary.reserveTitle')} color={palette.muted} />
            <Text style={[styles.reserveBody, { color: palette.muted }]}>{t('sanctuary.reserveBody')}</Text>
            <View style={styles.reserveGrid}>
              {reserve.map((speciesId) => (
                <ReserveCard
                  key={speciesId}
                  speciesId={speciesId}
                  palette={palette}
                  price={priceStringFor(packages, productIdForSpecies(speciesId) ?? '')}
                  onPress={() => router.push({ pathname: '/showcase', params: { speciesId } })}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.section, { color }]} accessibilityRole="header">
      {label}
    </Text>
  );
}

function NestWell({
  index,
  palette,
  occupant,
  open,
  onOpen,
}: {
  index: number;
  palette: LedgerPalette;
  occupant: { nickname: string; speciesId: SpeciesId; isHatched: boolean } | null;
  open: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const species = occupant ? getSpeciesConfig(occupant.speciesId) : null;
  const status = occupant
    ? `${occupant.nickname}. ${t('sanctuary.nestInUse')}`
    : open
      ? t('sanctuary.nestEmpty')
      : index === 1
        ? t('sanctuary.nestEarn')
        : t('sanctuary.nestPass');
  const label = t('sanctuary.nestA11y', { index: index + 1, status });
  const bowl = (
    <>
      <Text style={[styles.wellIndex, { color: open ? palette.moss : palette.muted, fontFamily: Fonts?.serif }]}>
        {index + 1}
      </Text>
      <NestBowl
        palette={palette}
        open={open}
        egg={species && !occupant?.isHatched ? species.egg.nest : null}
        speciesId={occupant?.isHatched ? occupant.speciesId : null}
        filterSuffix={`nest-${index}`}
      />
      {occupant ? (
        <>
          <Text style={[styles.wellName, { color: palette.ink }]} numberOfLines={1}>
            {occupant.nickname}
          </Text>
          <Text style={[styles.wellMeta, { color: palette.muted }]} numberOfLines={2}>
            {species?.commonName}
          </Text>
        </>
      ) : open ? (
        <>
          <Text style={[styles.wellName, { color: palette.ink }]}>{t('sanctuary.nestEmpty')}</Text>
          <Text style={[styles.wellMeta, { color: palette.moss }]}>{t('sanctuary.nestChoose')}</Text>
        </>
      ) : (
        <Text style={[styles.wellName, { color: palette.ink }]} numberOfLines={3}>
          {index === 1 ? t('sanctuary.nestEarn') : t('sanctuary.nestPass')}
        </Text>
      )}
    </>
  );

  if (!open) {
    return (
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.well, { backgroundColor: palette.paper, borderColor: palette.line }]}>
        {bowl}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onOpen}
      style={[styles.well, { backgroundColor: palette.paper, borderColor: palette.moss }]}>
      {bowl}
    </Pressable>
  );
}

function NestBowl({
  palette,
  open,
  egg,
  speciesId,
  filterSuffix,
}: {
  palette: LedgerPalette;
  open: boolean;
  egg: ShellPaint | null;
  speciesId: SpeciesId | null;
  filterSuffix: string;
}) {
  const straw = open ? palette.moss : palette.muted;
  return (
    <View style={styles.bowl}>
      <Svg width="100%" height={78} viewBox="0 0 120 86">
        <Ellipse cx="60" cy="74" rx="42" ry="7" fill={hexToRgba(straw, open ? 0.28 : 0.16)} />
        <Path
          d="M16 56 C24 80 96 80 104 56"
          fill={hexToRgba(straw, open ? 0.2 : 0.1)}
          stroke={straw}
          strokeWidth={2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d="M22 58 C36 50 48 64 64 54 C78 46 90 58 102 52"
          stroke={straw}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
        {egg ? (
          <>
            <Ellipse cx="60" cy="44" rx="15" ry="20" fill={egg.body} stroke={egg.stroke} strokeWidth={1.4} />
            <Ellipse cx="54" cy="36" rx="4.5" ry="7" fill={egg.highlight} opacity={0.7} />
          </>
        ) : speciesId == null && open ? (
          <Ellipse
            cx="60"
            cy="44"
            rx="14"
            ry="19"
            fill="none"
            stroke={palette.muted}
            strokeWidth={1.5}
            strokeDasharray="3 3.5"
          />
        ) : null}
      </Svg>
      {speciesId ? (
        <View pointerEvents="none" style={styles.bowlCreature}>
          <FramedSilhouette
            speciesId={speciesId}
            width={56}
            height={46}
            fill={palette.ink}
            filterSuffix={filterSuffix}
          />
        </View>
      ) : null}
    </View>
  );
}

function FramedSilhouette({
  speciesId,
  width,
  height,
  fill,
  filterSuffix,
}: {
  speciesId: SpeciesId;
  width: number;
  height: number;
  fill: string;
  filterSuffix: string;
}) {
  const fitted = fitSilhouette(speciesId, width, height);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <GrowthSilhouette
        speciesId={speciesId}
        stage="adult"
        width={fitted.width}
        height={fitted.height}
        fill={fill}
        align="center"
        filterSuffix={filterSuffix}
      />
    </View>
  );
}

function PathCard({
  milestone,
  palette,
  next,
  speciesOwned,
  nestOwned,
}: {
  milestone: KeeperMilestone;
  palette: LedgerPalette;
  next: boolean;
  speciesOwned: (speciesId: string) => boolean;
  nestOwned: boolean;
}) {
  const { t } = useTranslation();
  const ratio = milestone.goal === 0 ? 0 : milestone.progress / milestone.goal;
  const borderColor = milestone.unlocked ? palette.moss : next ? palette.clay : palette.line;

  return (
    <View style={[styles.card, { backgroundColor: palette.paper, borderColor }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { color: palette.ink, fontFamily: Fonts?.serif }]}>
          {t(KEEPER_TITLE_KEY[milestone.id])}
        </Text>
        {milestone.unlocked ? (
          <Text style={[styles.opened, { color: palette.moss }]}>{t('sanctuary.opened')}</Text>
        ) : null}
      </View>
      <Text style={[styles.cardDetail, { color: palette.muted }]}>{t(KEEPER_DETAIL_KEY[milestone.id])}</Text>
      <Text style={[styles.cardProgress, { color: palette.ink }]}>
        {t(KEEPER_PROGRESS_KEY[milestone.id], { current: milestone.progress, goal: milestone.goal })}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: milestone.goal, now: milestone.progress }}
        style={[styles.track, { backgroundColor: palette.line }]}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: palette.moss }]} />
      </View>
      <View style={styles.chips}>
        {milestone.rewards.map((reward) => (
          <RewardChip
            key={rewardKey(reward)}
            reward={reward}
            palette={palette}
            owned={reward.kind === 'cradle' ? nestOwned : speciesOwned(reward.speciesId)}
            unlocked={milestone.unlocked}
          />
        ))}
      </View>
    </View>
  );
}

function RewardChip({
  reward,
  palette,
  owned,
  unlocked,
}: {
  reward: KeeperReward;
  palette: LedgerPalette;
  owned: boolean;
  unlocked: boolean;
}) {
  const { t } = useTranslation();
  const label = keeperRewardLabel(reward, t);
  return (
    <View style={[styles.chip, { backgroundColor: hexToRgba(palette.moss, 0.14) }]}>
      {reward.kind === 'species' ? (
        <FramedSilhouette
          speciesId={reward.speciesId}
          width={44}
          height={28}
          fill={palette.ink}
          filterSuffix={`reward-${reward.speciesId}`}
        />
      ) : (
        <Text style={[styles.chipMark, { color: palette.moss }]}>2</Text>
      )}
      <View style={styles.chipCopy}>
        <Text style={[styles.chipLabel, { color: palette.ink }]} numberOfLines={2}>
          {label}
        </Text>
        {owned && !unlocked ? (
          <Text style={[styles.chipYours, { color: palette.moss }]}>{t('sanctuary.yours')}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ResidentRow({ specimen, palette }: { specimen: HatchedSpecimen; palette: LedgerPalette }) {
  const { t } = useTranslation();
  const hatchedOn = formatLocaleDate(specimen.hatchDateEpoch);
  const temperament = specimen.temperament;
  const hearts = specimen.hearts ?? 0;
  const temperamentLabel = temperament
    ? t('sanctuary.temperament', { temperament: t(`temperament.${temperament}`) })
    : null;

  return (
    <View
      accessible
      accessibilityLabel={[
        t('sanctuary.cardA11y', {
          name: specimen.nickname,
          species: specimen.scientificName,
          date: hatchedOn,
        }),
        temperamentLabel,
        hearts > 0 ? t('sanctuary.heartsA11y', { count: hearts }) : null,
      ]
        .filter(Boolean)
        .join('. ')}
      style={[styles.resident, { backgroundColor: palette.paper, borderColor: palette.line }]}>
      <View style={[styles.disc, { backgroundColor: hexToRgba(palette.moss, 0.16) }]}>
        <FramedSilhouette
          speciesId={specimen.adultSilhouette}
          width={80}
          height={88}
          fill={palette.ink}
          filterSuffix={specimen.id}
        />
      </View>
      <View style={styles.residentCopy}>
        <Text style={[styles.residentName, { color: palette.ink, fontFamily: Fonts?.serif }]} numberOfLines={1}>
          {specimen.nickname}
        </Text>
        <Text style={[styles.residentLatin, { color: palette.moss, fontFamily: Fonts?.serif }]} numberOfLines={1}>
          {specimen.scientificName}
        </Text>
        <Text style={[styles.residentMeta, { color: palette.muted }]} numberOfLines={1}>
          {specimen.commonName}
        </Text>
        <Text style={[styles.residentMeta, { color: palette.muted }]}>
          {t('sanctuary.hatchedOn', { date: hatchedOn })}
        </Text>
        <Text style={[styles.residentMeta, { color: palette.muted }]}>
          {t('sanctuary.incubation', { days: specimen.incubationDurationDays })}
        </Text>
        {temperamentLabel || hearts > 0 ? (
          <View style={styles.traits}>
            {temperamentLabel ? (
              <Text
                style={[
                  styles.trait,
                  {
                    color: palette.ink,
                    backgroundColor: hexToRgba(TEMPERAMENT_TINT[temperament ?? 'easygoing'], 0.18),
                  },
                ]}>
                {temperamentLabel}
              </Text>
            ) : null}
            {hearts > 0 ? (
              <Text style={[styles.trait, { color: palette.ink, backgroundColor: hexToRgba('#E07A8D', 0.16) }]}>
                {t('sanctuary.hearts', { count: hearts })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ReserveCard({
  speciesId,
  palette,
  price,
  onPress,
}: {
  speciesId: SpeciesId;
  palette: LedgerPalette;
  price: string;
  onPress: () => void;
}) {
  const species = getSpeciesConfig(speciesId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${species.commonName}, ${price}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reserveCard,
        { backgroundColor: palette.paper, borderColor: palette.line, opacity: pressed ? 0.86 : 1 },
      ]}>
      <FramedSilhouette
        speciesId={speciesId}
        width={86}
        height={52}
        fill={palette.ink}
        filterSuffix={`reserve-${speciesId}`}
      />
      <Text style={[styles.reserveName, { color: palette.ink }]} numberOfLines={2}>
        {species.commonName}
      </Text>
      <Text style={[styles.reservePrice, { color: palette.clay }]}>{price}</Text>
    </Pressable>
  );
}

function rewardKey(reward: KeeperReward): string {
  return reward.kind === 'cradle' ? 'cradle' : reward.speciesId;
}

function rewardLabelsFor(rewardKeyValue: string, t: TranslateFn): string[] {
  return rewardKeyValue.split(',').flatMap((id) => {
    const trimmed = id.trim();
    if (!isKeeperMilestoneId(trimmed)) {
      return [];
    }
    return rewardsForMilestone(trimmed).map((reward) => keeperRewardLabel(reward, t, 'sentence'));
  });
}

function englishList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    paddingRight: 40,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 460,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  stat: {
    fontSize: 14,
    fontWeight: '700',
  },
  statDot: {
    fontSize: 18,
  },
  banner: {
    marginTop: Spacing.two,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  bannerBody: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  bannerDismiss: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  section: {
    marginTop: Spacing.four,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  nestRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  well: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  wellIndex: {
    alignSelf: 'flex-start',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  bowl: {
    width: '100%',
    height: 78,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bowlCreature: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  wellName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  wellMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  passBlock: {
    gap: Spacing.two,
  },
  passNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  passRow: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  passRowLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  stack: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: 6,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  opened: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardDetail: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardProgress: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 99,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  chipMark: {
    width: 28,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  chipCopy: {
    flexShrink: 1,
  },
  chipLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  chipYours: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  adopt: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  resident: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  disc: {
    width: 92,
    height: 104,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  residentCopy: {
    flex: 1,
    gap: 2,
  },
  residentName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  residentLatin: {
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  residentMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  traits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  trait: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  reserveBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.one,
  },
  reserveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  reserveCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.two,
    minHeight: 148,
    justifyContent: 'flex-end',
    gap: 2,
  },
  reserveName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  reservePrice: {
    fontSize: 13,
    fontWeight: '800',
  },
});
