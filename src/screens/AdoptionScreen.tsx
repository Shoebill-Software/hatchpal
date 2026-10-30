import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADOPTION_ATMOSPHERE, useHatcheryPalette } from '@/components/adoptionAtmosphere';
import { ClutchRail } from '@/components/ClutchRail';
import { HatcheryStage, HatcheryWash } from '@/components/HatcheryStage';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsButton, SettingsSheetHost, useSettings } from '@/components/SettingsMenu';
import { TaxonFilterBar } from '@/components/TaxonFilterBar';
import { PipTip } from '@/components/tutorial/PipTip';
import { useHatcheryWelcome } from '@/components/tutorial/useHatcheryWelcome';
import { WelcomeIntro } from '@/components/tutorial/WelcomeIntro';
import { Fonts } from '@/constants/theme';
import { listSpeciesConfigs } from '@/data/species';
import { speciesMatchingFilter, type RosterFilter } from '@/data/species/roster';
import { adoptionIntent, type AdoptionIntent } from '@/domain/cradleCapacity';
import { isReserveSpecies, type KeeperMilestone } from '@/domain/keeperRewards';
import type { DifficultyTag, RosterTag, SpeciesConfig, SpeciesId } from '@/domain/types';
import { useActivePet } from '@/hooks/useActivePet';
import { KEEPER_PROGRESS_KEY, useKeeperAccess } from '@/hooks/useKeeperMilestones';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const SPECIES = listSpeciesConfigs();

const TAG_LABEL: Record<RosterTag, TranslationKey> = {
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

const DIFFICULTY_LABEL: Record<DifficultyTag, TranslationKey> = {
  gentle: 'showcase.difficulty.gentle',
  intermediate: 'showcase.difficulty.intermediate',
  patience_master: 'showcase.difficulty.patience_master',
};

export default function AdoptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    adding?: string | string[];
    speciesId?: string | string[];
  }>();
  const { pet } = useActivePet();
  const palette = useHatcheryPalette();
  const { visible: settingsVisible } = useSettings();
  const welcomeVisible = useHatcheryWelcome(settingsVisible);
  const completeWelcome = usePreferencesStore((state) => state.completeWelcome);
  const skipAllTutorials = usePreferencesStore((state) => state.skipAllTutorials);
  const { isAvailable, gateFor } = useKeeperAccess();
  const addingParam = Array.isArray(params.adding) ? params.adding[0] : params.adding;
  const speciesParam = Array.isArray(params.speciesId) ? params.speciesId[0] : params.speciesId;
  const adding = addingParam === '1';
  const intent = adoptionIntent({ adding, hasPet: pet != null });
  const requested = SPECIES.find((species) => species.id === speciesParam);
  const [selectedId, setSelectedId] = useState<SpeciesId>(requested?.id ?? SPECIES[0]?.id ?? 'silkie_chicken');
  const [filter, setFilter] = useState<RosterFilter>('all');
  const routed = useRef(false);
  const compact = height < 700;

  const roster = useMemo(() => speciesMatchingFilter(SPECIES, filter), [filter]);
  const selected = roster.find((species) => species.id === selectedId) ?? roster[0] ?? null;
  const index = selected ? roster.findIndex((species) => species.id === selected.id) : -1;

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

  useFocusEffect(
    useCallback(() => {
      routed.current = false;
    }, [])
  );

  const close = () => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const openId = (id: SpeciesId) => {
    if (routed.current) {
      return;
    }
    routed.current = true;
    void triggerImpact(ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/showcase',
      params: { speciesId: id, replacing: intent === 'replace' ? '1' : '0', adding: intent === 'add' ? '1' : '0' },
    });
  };

  const step = (delta: 1 | -1) => {
    const next = roster[index + delta];
    if (!next) {
      return;
    }
    void triggerImpact(ImpactFeedbackStyle.Light);
    setSelectedId(next.id);
  };

  const choose = (id: SpeciesId) => {
    if (selected && id === selected.id) {
      openId(id);
      return;
    }
    setSelectedId(id);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <NestStatusBar />
      {selected ? <HatcheryWash speciesId={selected.id} /> : null}
      <View style={[styles.column, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.framed}>
          <View style={styles.header}>
            <View style={styles.side}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('adoption.close')}
                onPress={close}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.close,
                  { opacity: pressed ? 0.6 : 1, backgroundColor: `rgba(${palette.veil}, 0.08)` },
                ]}>
                <Text style={[styles.closeGlyph, { color: palette.ink }]}>×</Text>
              </Pressable>
            </View>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={[styles.headerTitle, { fontFamily: Fonts?.serif, color: palette.ink }]}>
              {t(adoptionTitleKey(intent))}
            </Text>
            <View style={styles.sideEnd}>
              {selected && roster.length > 0 ? (
                <Text
                  maxFontSizeMultiplier={1.15}
                  accessibilityLabel={t('adoption.positionA11y', {
                    current: index + 1,
                    total: roster.length,
                  })}
                  style={[styles.count, { color: palette.quiet }]}>
                  {t('adoption.position', { current: index + 1, total: roster.length })}
                </Text>
              ) : null}
              <SettingsButton tint={palette.ink} />
            </View>
          </View>
          <TaxonFilterBar value={filter} onChange={setFilter} />
        </View>

        <View style={styles.stageSlot}>
          {selected ? (
            <HatcheryStage
              species={selected}
              canGoBack={index > 0}
              canGoForward={index < roster.length - 1}
              locked={!isAvailable(selected.id)}
              onOpen={() => openId(selected.id)}
              onStep={step}
            />
          ) : null}
        </View>

        {selected ? <SpeciesPlate species={selected} compact={compact} /> : null}
        <ClutchRail
          species={roster}
          selectedId={selected?.id ?? selectedId}
          isLocked={(id) => !isAvailable(id)}
          onSelect={choose}
        />

        <View style={styles.dock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('adoption.study')}
            accessibilityHint={t('adoption.openDossier')}
            disabled={!selected}
            onPress={() => {
              if (selected) {
                openId(selected.id);
              }
            }}
            style={({ pressed }) => [
              styles.study,
              { backgroundColor: palette.amber, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
            ]}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.studyLabel, { color: palette.amberInk }]}>
              {t('adoption.study')}
            </Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.15} style={[styles.caption, { color: palette.quiet }]}>
            {adoptionCaption(selected, isAvailable, gateFor, intent, t)}
          </Text>
        </View>
      </View>
      <PipTip />
      <WelcomeIntro visible={welcomeVisible} mode="adopt" onFinish={completeWelcome} onSkip={skipAllTutorials} />
      <SettingsSheetHost />
    </View>
  );
}

function adoptionTitleKey(intent: AdoptionIntent): 'adoption.addTitle' | 'adoption.replaceTitle' | 'adoption.title' {
  if (intent === 'add') {
    return 'adoption.addTitle';
  }
  if (intent === 'replace') {
    return 'adoption.replaceTitle';
  }
  return 'adoption.title';
}

function adoptionCaption(
  selected: SpeciesConfig | null,
  isAvailable: (speciesId: string) => boolean,
  gateFor: (speciesId: string) => KeeperMilestone | null,
  intent: AdoptionIntent,
  t: TranslateFn
): string {
  if (selected && !isAvailable(selected.id)) {
    const gate = gateFor(selected.id);
    if (gate) {
      return t('adoption.earnHint', {
        progress: t(KEEPER_PROGRESS_KEY[gate.id], { current: gate.progress, goal: gate.goal }),
      });
    }
    if (isReserveSpecies(selected.id)) {
      return t('adoption.reserveHint');
    }
  }
  if (intent === 'add') {
    return t('adoption.addBody');
  }
  if (intent === 'replace') {
    return t('adoption.replaceBody');
  }
  return t('adoption.body');
}

function SpeciesPlate({ species, compact }: { species: SpeciesConfig; compact: boolean }) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const palette = useHatcheryPalette();
  const { width } = useWindowDimensions();
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  // iOS ignores minimumFontScale here and collapses the title, so the fit is computed instead.
  const titleSize = Math.max(24, Math.min(34, Math.floor((Math.min(width, 480) - 56) / (species.commonName.length * 0.5))));
  const presence = useSharedValue(1);
  const seen = useRef<SpeciesId | null>(null);

  useEffect(() => {
    if (seen.current === species.id) {
      return;
    }
    const first = seen.current === null;
    seen.current = species.id;
    if (first || reduceMotion) {
      presence.value = 1;
      return;
    }
    presence.value = 0.35;
    presence.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [presence, reduceMotion, species.id]);

  const fade = useAnimatedStyle(() => ({ opacity: presence.value }));

  return (
    <Animated.View style={[styles.plate, fade]}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
        style={[styles.taxon, { color: palette.scheme === 'dark' ? atmosphere.rim : atmosphere.low }]}>
        {t(TAG_LABEL[species.tag])}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[
          styles.common,
          { fontFamily: Fonts?.serif, color: palette.ink, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.18) },
        ]}>
        {species.commonName}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.15}
        style={[styles.scientific, { fontFamily: Fonts?.serif, color: palette.muted }]}>
        {species.scientificName}
      </Text>
      {compact ? null : (
        <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[styles.shell, { color: palette.muted }]}>
          {species.egg.description}
        </Text>
      )}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.15}
        style={[styles.commitment, { color: palette.quiet }]}>
        {t('adoption.commitment', {
          days: species.incubationDays,
          care: t(DIFFICULTY_LABEL[species.showcase.difficultyTag]),
        })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  framed: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
  },
  side: {
    width: 72,
    alignItems: 'flex-start',
  },
  sideEnd: {
    minWidth: 72,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '500',
  },
  count: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  stageSlot: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  plate: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 2,
    marginBottom: 4,
  },
  taxon: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  common: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  scientific: {
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
  },
  shell: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  commitment: {
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dock: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  study: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  caption: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
});
