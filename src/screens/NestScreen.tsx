import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChangeEggDialog } from '@/components/ChangeEggDialog';
import { ClimateControls, describeClimate } from '@/components/ClimateControls';
import { EGG_FRAME, EggContainer } from '@/components/EggContainer';
import { EmptyNestView } from '@/components/EmptyNestView';
import { HatchingCeremony } from '@/components/HatchingCeremony';
import { HatchlingContainer } from '@/components/HatchlingContainer';
import { NestPresence } from '@/components/NestPresence';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsModal } from '@/components/SettingsModal';
import { SpotlightOverlay } from '@/components/tutorial/SpotlightOverlay';
import { TutorialAnchor, TutorialAnchorProvider, useTutorialAnchor } from '@/components/tutorial/TutorialAnchor';
import { useNestTutorialTrigger } from '@/components/tutorial/useNestTutorialTrigger';
import type { TutorialTargetId } from '@/constants/tutorial';
import { useNestPalette } from '@/constants/nest';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { readClimate, caredHeartRate } from '@/domain/climateEngine';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import type { PetInstance, PetSnapshot, SpeciesConfig } from '@/domain/types';
import { useActivePet, type ActivePetView } from '@/hooks/useActivePet';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNestPipAudio, useSoundEffects } from '@/hooks/useSoundEffects';
import {
  formatBiologicalWeight,
  formatCarePhrase,
  formatCompactDate,
  formatPostHatchAge,
  getElapsedSpan,
  lifeStageLabelKey,
  useTranslation,
} from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

const HEART = '#C45B5B';
const FIGURE = { width: 220, height: 246 };
/** Clears the floating iOS tab bar, including the labels under the care buttons. */
const TAB_CLEARANCE = Platform.select({ ios: 136, android: 108, default: 108 }) ?? 108;

export default function NestScreen() {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const [changeEggVisible, setChangeEggVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const {
    pet,
    species,
    snapshot,
    isClockTampered,
    hasHydrated,
    nowEpoch,
    abandonActivePet,
    recordInteraction,
    markHatched,
  } = useActivePet();
  useNestPipAudio(Boolean(snapshot?.isPipped), snapshot?.currentMilestone.stage ?? null);

  const showCreature = Boolean(hasHydrated && pet && species && snapshot);
  const incubating = Boolean(showCreature && pet && !pet.isHatched);
  const ceremony = Boolean(snapshot?.isReadyToHatch && pet && !pet.isHatched);
  const nestFocused = useIsFocused();
  useNestTutorialTrigger({
    incubating,
    blocked: !nestFocused || settingsVisible || changeEggVisible || ceremony,
    shouldSuspend: !incubating || ceremony,
  });

  const confirmChangeEgg = () => {
    setChangeEggVisible(false);
    abandonActivePet();
    router.push({ pathname: '/adopt', params: { replacing: '1' } });
  };

  return (
    <TutorialAnchorProvider>
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      {hasHydrated ? (
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={[styles.flex, styles.frame, { paddingBottom: TAB_CLEARANCE }]}>
            <NestTopBar
              title={pet?.nickname ?? t('common.hatchpal')}
              onOpenSettings={() => setSettingsVisible(true)}
              accessory={
                showCreature && pet
                  ? {
                      label: pet.isHatched ? t('nest.changeCompanion') : t('nest.changeEgg'),
                      onPress: () => setChangeEggVisible(true),
                    }
                  : undefined
              }
            />
            <NestPresence
              token={showCreature && pet ? pet.id : 'empty'}
              empty={<EmptyNestView />}
              occupied={
                pet && species && snapshot ? (
                  <OccupiedNest
                    pet={pet}
                    species={species}
                    snapshot={snapshot}
                    isClockTampered={isClockTampered}
                    nowEpoch={nowEpoch}
                    recordInteraction={recordInteraction}
                    markHatched={markHatched}
                  />
                ) : (
                  <View style={styles.flex} />
                )
              }
            />
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.flex} />
      )}
      <SpotlightOverlay />
      <ChangeEggDialog
        visible={changeEggVisible}
        onKeepCurrent={() => setChangeEggVisible(false)}
        onConfirm={confirmChangeEgg}
      />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </View>
    </TutorialAnchorProvider>
  );
}

function OccupiedNest({
  pet,
  species,
  snapshot,
  isClockTampered,
  nowEpoch,
  recordInteraction,
  markHatched,
}: {
  pet: PetInstance;
  species: SpeciesConfig;
  snapshot: PetSnapshot;
  isClockTampered: boolean;
  nowEpoch: number;
  recordInteraction: ActivePetView['recordInteraction'];
  markHatched: ActivePetView['markHatched'];
}) {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { play } = useSoundEffects();
  const mistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warmPulse, setWarmPulse] = useState(0);
  const [mistPulse, setMistPulse] = useState(0);
  const [stageBox, setStageBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    return () => {
      if (mistTimer.current != null) {
        clearTimeout(mistTimer.current);
      }
    };
  }, []);

  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);

  const hatched = pet.isHatched;
  const incubationDay = Math.min(snapshot.ageDays, species.incubationDays);
  const progressPct = Math.round((hatched ? snapshot.maturationProgress : snapshot.progress) * 100);
  const climate = readClimate(pet, species, nowEpoch);
  const heartRate = caredHeartRate(snapshot.currentHeartRate, climate.vitalityScore);
  const heartDetected = heartRate > 0;
  const stageLabel = t(lifeStageLabelKey(snapshot.lifeStage));
  const hatchLabel = formatCompactDate(resolveHatchEpoch(pet, species));
  const dayValue = t('metric.spanOf', {
    day: Math.floor(incubationDay),
    total: species.incubationDays,
  });
  const heartValue = heartDetected ? `${heartRate} ${t('common.bpm')}` : t('metric.none');
  const climateValue = t('metric.climatePair', {
    temp: climate.temperatureCelsius.toFixed(1),
    humidity: Math.round(climate.humidityPct),
  });
  const weight = formatBiologicalWeight(snapshot.currentWeightGrams);
  const weightUnit = t(weight.unit === 'kg' ? 'weight.kilograms' : 'weight.grams');
  const daysLeft = snapshot.daysUntilAdult;
  const fedPhrase = formatCarePhrase(
    'feed',
    pet.lastFedEpoch != null,
    getElapsedSpan(pet.lastFedEpoch ?? nowEpoch, nowEpoch),
    t
  );
  const weighPhrase = formatCarePhrase(
    'weigh',
    pet.lastWeighedEpoch != null,
    getElapsedSpan(pet.lastWeighedEpoch ?? nowEpoch, nowEpoch),
    t
  );
  const eggScale = fitToStage(stageBox, EGG_FRAME);
  const figureScale = fitToStage(stageBox, FIGURE);
  const holdHint = t('nest.holdToCandle');

  const warmNest = () => {
    recordInteraction('warm_nest');
    setWarmPulse((pulse) => pulse + 1);
    void triggerImpact(ImpactFeedbackStyle.Medium);
    play('thermal_hum');
  };

  const mistSubstrate = () => {
    recordInteraction('mist_nest');
    setMistPulse((pulse) => pulse + 1);
    void triggerImpact(ImpactFeedbackStyle.Light);
    play('mist_whoosh');
    if (mistTimer.current != null) {
      clearTimeout(mistTimer.current);
    }
    mistTimer.current = setTimeout(() => {
      void triggerImpact(ImpactFeedbackStyle.Light);
      mistTimer.current = null;
    }, 110);
  };

  const leftTop: Reading = hatched
    ? { label: t('nest.ageLabel'), value: formatPostHatchAge(snapshot.postHatchAgeDays, t) }
    : {
        label: t('nest.dayLabel'),
        value: dayValue,
        accessibilityLabel: `${t('nest.dayLabel')}, ${dayValue}. ${t('nest.incubationA11y', { percent: progressPct })}`,
      };
  const leftBottom: Reading = hatched
    ? { label: t('nest.stageLabel'), value: stageLabel }
    : { label: t('nest.hatchLabel'), value: hatchLabel };
  const rightTop: Reading = hatched
    ? { label: t('nest.weightLabel'), value: `${weight.value} ${weightUnit}` }
    : {
        label: t('nest.heartLabel'),
        value: heartValue,
        dot: heartDetected ? { color: HEART, pulse: true } : undefined,
      };
  const rightBottom: Reading = hatched
    ? {
        label: t('nest.maturityLabel'),
        value: daysLeft === 0 ? t('metric.mature') : `${daysLeft} ${t(daysLeft === 1 ? 'metric.dayUnit' : 'metric.daysUnit')}`,
      }
    : {
        label: t('nest.climateLabel'),
        value: climateValue,
        dot: { color: climate.inSweetSpot ? palette.optimal : palette.warning, pulse: false },
      };

  return (
    <View style={styles.flex}>
      {isClockTampered ? (
        <Text accessibilityRole="alert" numberOfLines={2} style={[styles.clock, { color: palette.bannerText }]}>
          {t('clock.paused')}
        </Text>
      ) : null}

      <View style={styles.stage} onLayout={onStageLayout}>
            <View style={styles.specimen}>
              <View
                style={[
                  styles.eggWell,
                  { height: Math.round((hatched ? FIGURE.height * figureScale : EGG_FRAME.height * eggScale) + 8) },
                ]}>
                <View pointerEvents="none" style={styles.haloLayer}>
                  <NestHalo
                    color={species.growth.glow}
                    sweet={hatched || climate.inSweetSpot}
                    scale={hatched ? figureScale : eggScale}
                  />
                </View>
                {hatched ? (
                  <HatchlingContainer
                    speciesId={species.id}
                    maturationProgress={snapshot.maturationProgress}
                    accessibilityLabel={t('hatchling.a11y', { name: pet.nickname, stage: stageLabel })}
                    hint={t('care.chirpHint')}
                    scaleLabel=""
                    showCaption={false}
                    width={Math.round(FIGURE.width * figureScale)}
                    height={Math.round(FIGURE.height * figureScale)}
                    onPet={() => {
                      recordInteraction('pet');
                    }}
                  />
                ) : (
                  <TutorialAnchor targetId="egg">
                    <EggContainer
                      snapshot={snapshot}
                      species={species}
                      vitalityScore={climate.vitalityScore}
                      inSweetSpot={climate.inSweetSpot}
                      temper={climate.temper}
                      temperatureStatus={climate.temperatureStatus}
                      humidityStatus={climate.humidityStatus}
                      heartRate={heartRate}
                      warmPulse={warmPulse}
                      mistPulse={mistPulse}
                      fitScale={eggScale}
                      accessibilityLabel={eggLabel(
                        t('egg.a11y', { name: species.commonName, status: holdHint }),
                        describeClimate(climate, species, t)
                      )}
                      accessibilityHint={t('nest.eggGestureHint')}
                      candleLabel={t('nest.candleEgg')}
                      onCandle={() => router.push('/candling')}
                    />
                  </TutorialAnchor>
                )}
                <View pointerEvents="box-none" style={styles.sideLabels}>
                  <TelemetryColumn align="end" top={leftTop} bottom={leftBottom} />
                  <TelemetryColumn
                    align="start"
                    top={rightTop}
                    bottom={rightBottom}
                    topTarget={hatched ? undefined : 'telemetry_heart'}
                  />
                </View>
              </View>
              <Text maxFontSizeMultiplier={1.2} style={[styles.hint, { color: palette.textMuted }]}>
                {hatched ? t('care.chirpHint') : holdHint}
              </Text>
            </View>
          </View>
          <View style={styles.dock}>
            {hatched ? (
              <CareDock
                fedLabel={t('care.feed')}
                weighLabel={t('care.weigh')}
                fedHint={fedPhrase}
                weighHint={weighPhrase}
                onFeed={() => {
                  recordInteraction('feed');
                  void triggerImpact(ImpactFeedbackStyle.Light);
                }}
                onWeigh={() => {
                  recordInteraction('weigh');
                  void triggerImpact(ImpactFeedbackStyle.Light);
                }}
              />
            ) : (
              <ClimateControls species={species} climate={climate} onWarm={warmNest} onMist={mistSubstrate} />
            )}
      </View>

      <HatchingCeremony
        visible={snapshot.isReadyToHatch && !pet.isHatched}
        nickname={pet.nickname}
        speciesId={species.id}
        onComplete={() => {
          markHatched();
        }}
      />
    </View>
  );
}

interface Reading {
  label: string;
  value: string;
  accessibilityLabel?: string;
  dot?: { color: string; pulse: boolean };
}

function NestTopBar({
  title,
  onOpenSettings,
  accessory,
}: {
  title: string;
  onOpenSettings: () => void;
  accessory?: { label: string; onPress: () => void };
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <View style={styles.topBar}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.2}
        style={[styles.wordmark, { color: palette.text }]}>
        {title}
      </Text>
      {accessory ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessory.label}
          onPress={accessory.onPress}
          hitSlop={8}
          style={({ pressed }) => [styles.changeHit, { opacity: pressed ? 0.6 : 1 }]}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.changeLabel, { color: palette.textMuted }]}>
            {accessory.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.open')}
        onPress={onOpenSettings}
        hitSlop={8}
        style={({ pressed }) => [styles.settingsHit, { opacity: pressed ? 0.55 : 1 }]}>
        <SymbolView
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={20}
          tintColor={palette.textMuted}
          fallback={<Text style={[styles.settingsGlyph, { color: palette.textMuted }]}>⚙</Text>}
        />
      </Pressable>
    </View>
  );
}

function TelemetryColumn({
  align,
  top,
  bottom,
  topTarget,
}: {
  align: 'start' | 'end';
  top: Reading;
  bottom: Reading;
  topTarget?: TutorialTargetId;
}) {
  return (
    <View style={[styles.flank, align === 'end' ? styles.flankEnd : styles.flankStart]}>
      <ReadingBlock align={align} reading={top} targetId={topTarget} />
      <ReadingBlock align={align} reading={bottom} />
    </View>
  );
}

function ReadingBlock({
  align,
  reading,
  targetId,
}: {
  align: 'start' | 'end';
  reading: Reading;
  targetId?: TutorialTargetId;
}) {
  const palette = useNestPalette();
  const ended = align === 'end';
  const anchor = useTutorialAnchor(targetId ?? null);

  return (
    <View
      ref={anchor.ref}
      collapsable={false}
      onLayout={anchor.onLayout}
      accessible
      accessibilityLabel={reading.accessibilityLabel ?? `${reading.label}, ${reading.value}`}
      style={styles.reading}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        maxFontSizeMultiplier={1.15}
        style={[styles.readingLabel, ended ? styles.alignEnd : styles.alignStart, { color: palette.textMuted }]}>
        {reading.label}
      </Text>
      <View style={[styles.valueRow, ended ? styles.flankEnd : styles.flankStart]}>
        {reading.dot ? <PulseDot color={reading.dot.color} pulse={reading.dot.pulse} /> : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.15}
          style={[styles.readingValue, ended ? styles.alignEnd : styles.alignStart, { color: palette.text }]}>
          {reading.value}
        </Text>
      </View>
    </View>
  );
}

function PulseDot({ color, pulse }: { color: string; pulse: boolean }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulse || reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity, pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function CareDock({
  fedLabel,
  weighLabel,
  fedHint,
  weighHint,
  onFeed,
  onWeigh,
}: {
  fedLabel: string;
  weighLabel: string;
  fedHint: string;
  weighHint: string;
  onFeed: () => void;
  onWeigh: () => void;
}) {
  return (
    <View style={styles.careRow}>
      <MicroAction label={fedLabel} hint={fedHint} onPress={onFeed} glyph="feed" />
      <MicroAction label={weighLabel} hint={weighHint} onPress={onWeigh} glyph="weigh" />
    </View>
  );
}

function MicroAction({
  label,
  hint,
  onPress,
  glyph,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  glyph: 'feed' | 'weigh';
}) {
  const palette = useNestPalette();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.micro, { opacity: pressed ? 0.62 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={[styles.microGlyph, { borderColor: palette.border }]}>
        {glyph === 'feed' ? <FeedGlyph color={palette.text} /> : <WeighGlyph color={palette.text} />}
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.microHint, { color: palette.textMuted }]}>
        {hint}
      </Text>
    </Pressable>
  );
}

function FeedGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 20 C8 16.5 6.5 13 8.5 10.5 C10 12 11 13.2 12 14.5 C13 13.2 14 12 15.5 10.5 C17.5 13 16 16.5 12 20 Z"
        stroke={color}
        strokeWidth={1.35}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M12 14.5 C12 10 13.5 6.5 17 4.5" stroke={color} strokeWidth={1.35} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function WeighGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M12 4 V15" stroke={color} strokeWidth={1.35} strokeLinecap="round" />
      <Path d="M5 8 H19" stroke={color} strokeWidth={1.35} strokeLinecap="round" />
      <Path d="M5 8 L2.5 13.5 H7.5 Z" stroke={color} strokeWidth={1.2} strokeLinejoin="round" fill="none" />
      <Path d="M19 8 L16.5 13.5 H21.5 Z" stroke={color} strokeWidth={1.2} strokeLinejoin="round" fill="none" />
      <Path d="M8 18.5 H16" stroke={color} strokeWidth={1.35} strokeLinecap="round" />
    </Svg>
  );
}

function NestHalo({ color, sweet, scale }: { color: string; sweet: boolean; scale: number }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const size = Math.round(332 * Math.min(Math.max(scale, 0.82), 1));
  const presence = (sweet ? 1 : 0.86) * (dark ? 1 : 0.58);
  const peak = 0.76 * presence;
  const id = `nest-halo-${color.replace('#', '')}-${dark ? 'd' : 'l'}-${sweet ? '1' : '0'}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx={size / 2} cy={size * 0.54} r={size * 0.48} gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={color} stopOpacity={peak} />
          <Stop offset="40%" stopColor={color} stopOpacity={peak * 0.36} />
          <Stop offset="68%" stopColor={color} stopOpacity={peak * 0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={size / 2} cy={size * 0.54} rx={size * 0.46} ry={size * 0.42} fill={`url(#${id})`} />
    </Svg>
  );
}

function eggLabel(base: string, aside: string | null): string {
  return aside ? `${base}. ${aside}` : base;
}

function fitToStage(
  box: { width: number; height: number },
  frame: { width: number; height: number }
): number {
  if (box.width < 1 || box.height < 1) {
    return 1;
  }
  return Math.max(0.82, Math.min(1, (box.width - 16) / frame.width, (box.height - 56) / frame.height));
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  frame: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    minHeight: 48,
    gap: Spacing.two,
  },
  wordmark: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  changeHit: {
    maxWidth: 108,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  settingsHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  clock: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: 2,
  },
  stage: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specimen: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  eggWell: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLabels: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  flank: {
    width: 100,
    justifyContent: 'center',
    gap: 22,
  },
  flankEnd: {
    alignItems: 'flex-end',
  },
  flankStart: {
    alignItems: 'flex-start',
  },
  reading: {
    maxWidth: '100%',
    gap: 3,
  },
  readingLabel: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  readingValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.15,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  alignEnd: {
    textAlign: 'right',
  },
  alignStart: {
    textAlign: 'left',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dock: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 10,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 36,
  },
  micro: {
    width: 108,
    alignItems: 'center',
    gap: 5,
  },
  microGlyph: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microHint: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
