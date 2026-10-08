import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChangeEggDialog } from '@/components/ChangeEggDialog';
import { ClimateControls } from '@/components/ClimateControls';
import { EGG_FRAME, EggContainer } from '@/components/EggContainer';
import { HatchingCeremony } from '@/components/HatchingCeremony';
import { HatchlingContainer } from '@/components/HatchlingContainer';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsModal } from '@/components/SettingsModal';
import { useNestPalette } from '@/constants/nest';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { readClimate, caredHeartRate } from '@/domain/climateEngine';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import { useActivePet } from '@/hooks/useActivePet';
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
const FIGURE = { width: 168, height: 188 };

export default function NestScreen() {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { play } = useSoundEffects();
  const mistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warmPulse, setWarmPulse] = useState(0);
  const [mistPulse, setMistPulse] = useState(0);
  const [changeEggVisible, setChangeEggVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [heroBox, setHeroBox] = useState({ width: 0, height: 0 });
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

  useEffect(() => {
    return () => {
      if (mistTimer.current != null) {
        clearTimeout(mistTimer.current);
      }
    };
  }, []);

  const onHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setHeroBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);

  if (!hasHydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
      </View>
    );
  }

  if (!pet || !species || !snapshot) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={[styles.flex, styles.frame, { paddingBottom: BottomTabInset }]}>
            <NestTopBar title={t('common.hatchpal')} onOpenSettings={() => setSettingsVisible(true)} />
            <View style={[styles.flex, styles.center, { paddingHorizontal: Spacing.four }]}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>{t('nest.emptyTitle')}</Text>
              <Text style={[styles.emptyBody, { color: palette.textMuted }]}>{t('nest.emptyBody')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/adopt')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
                ]}>
                <Text style={[styles.primaryButtonLabel, { color: palette.actionText }]}>{t('nest.adoptEgg')}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </View>
    );
  }

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
  const changeLabel = hatched ? t('nest.changeCompanion') : t('nest.changeEgg');
  const eggScale = fitToBox(heroBox, EGG_FRAME);
  const figureScale = fitToBox(heroBox, FIGURE);
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

  const confirmChangeEgg = () => {
    setChangeEggVisible(false);
    abandonActivePet();
    router.push({ pathname: '/adopt', params: { replacing: '1' } });
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
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={[styles.flex, styles.frame, { paddingBottom: BottomTabInset }]}>
          <NestTopBar
            title={pet.nickname}
            onOpenSettings={() => setSettingsVisible(true)}
            accessory={{ label: changeLabel, onPress: () => setChangeEggVisible(true) }}
          />

          {isClockTampered ? (
            <Text accessibilityRole="alert" numberOfLines={2} style={[styles.clock, { color: palette.bannerText }]}>
              {t('clock.paused')}
            </Text>
          ) : null}

          <View style={styles.heroRow}>
            <TelemetryColumn align="end" top={leftTop} bottom={leftBottom} />
            <View style={styles.hero} onLayout={onHeroLayout}>
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
                <EggContainer
                  snapshot={snapshot}
                  species={species}
                  vitalityScore={climate.vitalityScore}
                  inSweetSpot={climate.inSweetSpot}
                  heartRate={heartRate}
                  warmPulse={warmPulse}
                  mistPulse={mistPulse}
                  fitScale={eggScale}
                  accessibilityLabel={t('egg.a11y', { name: species.commonName, status: holdHint })}
                  accessibilityHint={t('nest.eggGestureHint')}
                  candleLabel={t('nest.candleEgg')}
                  onCandle={() => router.push('/candling')}
                />
              )}
            </View>
            <TelemetryColumn align="start" top={rightTop} bottom={rightBottom} />
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
            <Text maxFontSizeMultiplier={1.2} style={[styles.hint, { color: palette.textMuted }]}>
              {hatched ? t('care.chirpHint') : holdHint}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <HatchingCeremony
        visible={snapshot.isReadyToHatch && !pet.isHatched}
        nickname={pet.nickname}
        speciesId={species.id}
        onComplete={() => {
          markHatched();
        }}
      />

      <ChangeEggDialog
        visible={changeEggVisible}
        onKeepCurrent={() => setChangeEggVisible(false)}
        onConfirm={confirmChangeEgg}
      />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
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
}: {
  align: 'start' | 'end';
  top: Reading;
  bottom: Reading;
}) {
  return (
    <View style={[styles.flank, align === 'end' ? styles.flankEnd : styles.flankStart]}>
      <ReadingBlock align={align} reading={top} />
      <ReadingBlock align={align} reading={bottom} />
    </View>
  );
}

function ReadingBlock({ align, reading }: { align: 'start' | 'end'; reading: Reading }) {
  const palette = useNestPalette();
  const ended = align === 'end';

  return (
    <View
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

function fitToBox(
  box: { width: number; height: number },
  frame: { width: number; height: number }
): number {
  if (box.width <= 0 || box.height <= 0) {
    return 0.84;
  }
  return Math.max(0.46, Math.min(1, (box.width - 4) / frame.width, (box.height - 4) / frame.height));
}

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
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
  heroRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  flank: {
    width: 96,
    flexShrink: 1,
    justifyContent: 'center',
    gap: 22,
  },
  flankEnd: {
    alignItems: 'flex-end',
  },
  flankStart: {
    alignItems: 'flex-start',
  },
  hero: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
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
  primaryButton: {
    minHeight: 48,
    minWidth: 220,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
});
