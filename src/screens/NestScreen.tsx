import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter, useIsFocused } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { scheduleOnRN } from 'react-native-worklets';

import { ChangeEggDialog } from '@/components/ChangeEggDialog';
import { CradlePager } from '@/components/CradlePager';
import { ClimateControls, describeClimate } from '@/components/ClimateControls';
import { EGG_FRAME, EggContainer } from '@/components/EggContainer';
import { EmptyNestView } from '@/components/EmptyNestView';
import { HatchingCeremony } from '@/components/HatchingCeremony';
import { HeartBurst, NestAlmanac, WishBubble } from '@/components/NestCareHud';
import { NestPresence } from '@/components/NestPresence';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsButton, useSettings } from '@/components/SettingsMenu';
import { SpotlightOverlay } from '@/components/tutorial/SpotlightOverlay';
import { TutorialAnchor, TutorialAnchorProvider, useTutorialAnchor } from '@/components/tutorial/TutorialAnchor';
import { shouldStartWelcome } from '@/components/tutorial/cradleWelcome';
import { useNestTutorialTrigger } from '@/components/tutorial/useNestTutorialTrigger';
import { WelcomeIntro, type WelcomeMode } from '@/components/tutorial/WelcomeIntro';
import type { TutorialTargetId } from '@/constants/tutorial';
import { useNestPalette } from '@/constants/nest';
import { cradleAllowance, SANCTUARY_CRADLE_LIMIT } from '@/domain/cradleCapacity';
import { priceStringFor, SANCTUARY_PASS_PRODUCT_ID } from '@/domain/entitlements';
import { getSpeciesConfig } from '@/data/species';
import {
  keeperMilestones,
  newlyUnlockedMilestones,
  toHatchCredits,
} from '@/domain/keeperRewards';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { caredHeartRate, displayedVitality, readClimate } from '@/domain/climateEngine';
import { activeWish, careLogOf, resolveTemperament } from '@/domain/nestCare';
import { weatherAt } from '@/domain/nestWeather';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import type { PetInstance, PetSnapshot, SpeciesConfig } from '@/domain/types';
import { useActivePet, type ActivePetView } from '@/hooks/useActivePet';
import { usePreferencesHydrated } from '@/hooks/useLaunchStoresReady';
import { useNestCare } from '@/hooks/useNestCare';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNestPipAudio } from '@/hooks/useSoundEffects';
import { formatCompactDate, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, NotificationFeedbackType, triggerImpact, triggerNotification } from '@/services/hapticFeedback';
import { isPurchaseCancelled } from '@/services/purchaseErrors';
import { useCollectionStore } from '@/store/useCollectionStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { usePurchasesStore } from '@/store/usePurchasesStore';

const HEART = '#C45B5B';
/** Clears the floating iOS tab bar, including the labels under the care buttons. */
const TAB_CLEARANCE = Platform.select({ ios: 136, android: 108, default: 108 }) ?? 108;
/** Lets the settings sheet or a route transition finish before Pip appears. */
const WELCOME_DELAY_MS = 700;
/** Height of the wish slot above the egg, reserved even when the egg wishes for nothing. */
const WISH_SLOT = 50;

export default function NestScreen() {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const [changeEggVisible, setChangeEggVisible] = useState(false);
  const { visible: settingsVisible } = useSettings();
  const [passInvite, setPassInvite] = useState(false);
  const [buyingPass, setBuyingPass] = useState(false);
  const {
    pet,
    species,
    snapshot,
    isClockTampered,
    hasHydrated,
    nowEpoch,
    cradles,
    activePetIndex,
    switchCradle,
    abandonActivePet,
    performCare,
    markHatched,
  } = useActivePet();
  const isPro = usePurchasesStore((state) => state.isProUnlocked);
  const packages = usePurchasesStore((state) => state.availablePackages);
  const purchaseProduct = usePurchasesStore((state) => state.purchaseProduct);
  const archiveSpecimen = useCollectionStore((state) => state.archiveSpecimen);
  const hatchCount = useCollectionStore((state) => state.hatchedArchive.length);
  const maxCradles = cradleAllowance(isPro, hatchCount);
  const passPrice = priceStringFor(packages, SANCTUARY_PASS_PRODUCT_ID);
  const addHintKey: TranslationKey =
    isPro || cradles.length < maxCradles
      ? 'nest.addCradleHintPro'
      : maxCradles <= 1
        ? 'nest.addCradleHintEarn'
        : 'nest.addCradleHintPass';
  const addOffer =
    cradles.length >= SANCTUARY_CRADLE_LIMIT
      ? null
      : {
          label: t('nest.addCradle'),
          hint: t(addHintKey),
        };
  useNestPipAudio(Boolean(snapshot?.isPipped), snapshot?.currentMilestone.stage ?? null);

  const showCreature = Boolean(hasHydrated && pet && species && snapshot);
  const incubating = Boolean(showCreature && pet && !pet.isHatched);
  const ceremony = Boolean(snapshot?.isReadyToHatch && pet && !pet.isHatched);
  const nestFocused = useIsFocused();
  const preferencesReady = usePreferencesHydrated();
  const hasSeenWelcome = usePreferencesStore((state) => state.hasSeenWelcome);
  const completeWelcome = usePreferencesStore((state) => state.completeWelcome);
  const skipAllTutorials = usePreferencesStore((state) => state.skipAllTutorials);
  const [welcomeArmed, setWelcomeArmed] = useState(false);
  const welcomeBlocked =
    !hasHydrated || !preferencesReady || !nestFocused || settingsVisible || changeEggVisible || passInvite || ceremony;
  const welcomeEligible = shouldStartWelcome({
    hasSeenWelcome,
    hasPet: pet != null,
    blocked: welcomeBlocked,
  });
  const welcomeVisible = welcomeArmed && welcomeEligible;
  const welcomeMode: WelcomeMode = !pet ? 'adopt' : incubating && !snapshot?.isUnviable ? 'meet' : 'close';

  useEffect(() => {
    if (!welcomeEligible) {
      setWelcomeArmed(false);
      return;
    }
    const timer = setTimeout(() => setWelcomeArmed(true), WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [welcomeEligible]);

  useNestTutorialTrigger({
    incubating,
    blocked: !nestFocused || settingsVisible || changeEggVisible || ceremony || welcomeVisible || !hasSeenWelcome,
    shouldSuspend: !incubating || ceremony,
  });

  const confirmChangeEgg = () => {
    setChangeEggVisible(false);
    if (cradles.length <= 1) {
      abandonActivePet();
    }
    router.push({ pathname: '/adopt', params: { replacing: '1' } });
  };

  const openCradle = (index: number) => {
    if (index < 0) {
      return;
    }
    if (index < cradles.length) {
      switchCradle(index);
      void triggerImpact(ImpactFeedbackStyle.Light);
      return;
    }
    if (index >= SANCTUARY_CRADLE_LIMIT) {
      return;
    }
    if (cradles.length < maxCradles) {
      router.push({ pathname: '/adopt', params: { adding: '1' } });
      return;
    }
    if (!isPro) {
      setPassInvite(true);
    }
  };

  const stepCradle = (direction: -1 | 1) => {
    openCradle(activePetIndex + direction);
  };

  const buyPass = () => {
    setBuyingPass(true);
    void purchaseProduct(SANCTUARY_PASS_PRODUCT_ID)
      .then(() => {
        void triggerNotification(NotificationFeedbackType.Success);
        setPassInvite(false);
      })
      .catch((error: unknown) => {
        if (!isPurchaseCancelled(error)) {
          Alert.alert(t('settings.restoreTitle'), t('showcase.purchaseFailed'));
        }
      })
      .finally(() => {
        setBuyingPass(false);
      });
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
              accessory={
                showCreature && pet
                  ? {
                      label: pet.isHatched ? t('nest.changeCompanion') : t('nest.changeEgg'),
                      onPress: () => setChangeEggVisible(true),
                    }
                  : undefined
              }
            />
            {pet ? (
              <CradlePager
                occupied={cradles.length}
                activeIndex={activePetIndex}
                onSelect={openCradle}
                addOffer={addOffer}
              />
            ) : null}
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
                    performCare={performCare}
                    markHatched={markHatched}
                    onStepCradle={cradles.length > 0 ? stepCradle : undefined}
                    abandonActivePet={abandonActivePet}
                    archiveSpecimen={archiveSpecimen}
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
      <SpotlightOverlay nickname={pet?.nickname ?? ''} />
      <WelcomeIntro
        visible={welcomeVisible}
        mode={welcomeMode}
        nickname={pet?.nickname}
        onFinish={completeWelcome}
        onSkip={skipAllTutorials}
      />
      <ChangeEggDialog
        visible={changeEggVisible}
        onKeepCurrent={() => setChangeEggVisible(false)}
        onConfirm={confirmChangeEgg}
      />
      <Modal visible={passInvite} transparent animationType="fade" onRequestClose={() => setPassInvite(false)}>
        <View style={styles.inviteBackdrop}>
          <View style={[styles.inviteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.inviteTitle, { color: palette.text }]}>
              {t(hatchCount > 0 ? 'nest.passTitleThird' : 'nest.passTitle')}
            </Text>
            <Text style={[styles.inviteBody, { color: palette.textMuted }]}>
              {t(hatchCount > 0 ? 'nest.passBodyThird' : 'nest.passBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={buyingPass}
              onPress={buyPass}
              style={({ pressed }) => [
                styles.inviteBuy,
                { backgroundColor: palette.action, opacity: buyingPass ? 0.6 : pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.inviteBuyLabel, { color: palette.actionText }]}>
                {t('showcase.getPass', { price: passPrice })}
              </Text>
              <Text style={[styles.inviteHint, { color: palette.actionText }]}>{t('showcase.passSubtitle')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPassInvite(false)} style={styles.inviteLater}>
              <Text style={[styles.inviteLaterLabel, { color: palette.action }]}>{t('nest.passLater')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  performCare,
  markHatched,
  onStepCradle,
  abandonActivePet,
  archiveSpecimen,
}: {
  pet: PetInstance;
  species: SpeciesConfig;
  snapshot: PetSnapshot;
  isClockTampered: boolean;
  nowEpoch: number;
  performCare: ActivePetView['performCare'];
  markHatched: ActivePetView['markHatched'];
  onStepCradle?: (direction: -1 | 1) => void;
  abandonActivePet: ActivePetView['abandonActivePet'];
  archiveSpecimen: ReturnType<typeof useCollectionStore.getState>['archiveSpecimen'];
}) {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const care = useNestCare({ pet, species, performCare });
  const [stageBox, setStageBox] = useState({ width: 0, height: 0 });
  const stepRef = useRef(onStepCradle);
  stepRef.current = onStepCradle;
  const glide = useCallback((direction: -1 | 1) => {
    stepRef.current?.(direction);
  }, []);

  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);

  const hatched = pet.isHatched;
  const incubationDay = Math.min(snapshot.ageDays, species.incubationDays);
  const progressPct = Math.round(snapshot.progress * 100);
  const climate = readClimate(pet, species, nowEpoch);
  const heartRate = caredHeartRate(snapshot.currentHeartRate, displayedVitality(climate));
  const heartDetected = heartRate > 0;
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

  const placeInSanctuary = (name: string) => {
    const taxonOf = (speciesId: typeof species.id) => getSpeciesConfig(speciesId).taxon;
    const before = keeperMilestones(toHatchCredits(useCollectionStore.getState().hatchedArchive, taxonOf));
    archiveSpecimen({
      speciesId: species.id,
      nickname: name,
      commonName: species.commonName,
      scientificName: species.scientificName,
      hatchDateEpoch: resolveHatchEpoch(pet, species),
      incubationDurationDays: species.incubationDays,
      adultSilhouette: species.id,
      temperament: resolveTemperament(pet.care),
      hearts: careLogOf(pet).hearts,
    });
    const unlocked = newlyUnlockedMilestones(
      before,
      keeperMilestones(toHatchCredits(useCollectionStore.getState().hatchedArchive, taxonOf))
    )
      .map((milestone) => milestone.id)
      .join(',');
    abandonActivePet();
    if (unlocked.length > 0) {
      router.push({ pathname: '/sanctuary', params: { reward: unlocked } });
      return;
    }
    router.push('/sanctuary');
  };

  if (snapshot.isUnviable) {
    return (
      <View style={[styles.flex, styles.somberCenter]}>
        <Text style={styles.somberKicker}>{pet.nickname}</Text>
        <Text style={[styles.somberTitle, { color: palette.text }]}>{t('nest.unviableTitle')}</Text>
        <Text style={[styles.somberBody, { color: palette.textMuted }]}>{t('nest.unviableBody')}</Text>
        <Text style={[styles.somberDetail, { color: palette.textMuted }]}>{t('nest.unviableDetail')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nest.clearA11y')}
          onPress={() => {
            void triggerImpact(ImpactFeedbackStyle.Medium);
            abandonActivePet();
          }}
          style={({ pressed }) => [styles.somberButton, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.somberButtonLabel}>{t('nest.clearAndRestart')}</Text>
        </Pressable>
      </View>
    );
  }

  if (hatched) {
    return (
      <View style={[styles.flex, styles.somberCenter]}>
        <Text style={[styles.somberTitle, { color: palette.text }]}>
          {t('nest.hatchedReady', { nickname: pet.nickname })}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => placeInSanctuary(pet.nickname)}
          style={({ pressed }) => [
            styles.somberButton,
            { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
          ]}>
          <Text style={[styles.somberButtonLabel, { color: palette.actionText }]}>
            {t('nest.placeHatched')}
          </Text>
        </Pressable>
      </View>
    );
  }
  const eggScale = fitToStage(stageBox, EGG_FRAME);
  const holdHint = t('nest.holdToCandle');
  const wish = activeWish(pet, species, nowEpoch);
  const cradlePan = Gesture.Pan()
    .enabled(onStepCradle != null)
    .activeOffsetX([-28, 28])
    .failOffsetY([-22, 22])
    .onEnd((event) => {
      if (event.translationX <= -56) {
        scheduleOnRN(glide, 1);
        return;
      }
      if (event.translationX >= 56) {
        scheduleOnRN(glide, -1);
      }
    });

  const leftTop: Reading = {
    label: t('nest.dayLabel'),
    value: dayValue,
    accessibilityLabel: `${t('nest.dayLabel')}, ${dayValue}. ${t('nest.incubationA11y', { percent: progressPct })}`,
  };
  const leftBottom: Reading = { label: t('nest.hatchLabel'), value: hatchLabel };
  const rightTop: Reading = {
    label: t('nest.heartLabel'),
    value: heartValue,
    dot: heartDetected ? { color: HEART, pulse: true } : undefined,
  };
  const rightBottom: Reading = {
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

      <NestAlmanac weather={weatherAt(pet, nowEpoch)} hearts={careLogOf(pet).hearts} heartPulse={care.heartPulse} />

      <GestureDetector gesture={cradlePan}>
      <View style={styles.stage} onLayout={onStageLayout}>
            <View style={styles.specimen}>
              <WishBubble wish={wish} species={species} nowEpoch={nowEpoch} lullabyTaps={care.lullabyTaps} />
              <View
                style={[
                  styles.eggWell,
                  { height: Math.round(EGG_FRAME.height * eggScale + 8) },
                ]}>
                <View pointerEvents="none" style={styles.haloLayer}>
                  <NestHalo
                    color={species.growth.glow}
                    sweet={climate.inSweetSpot}
                    scale={eggScale}
                  />
                </View>
                <TutorialAnchor targetId="egg">
                  <EggContainer
                    snapshot={snapshot}
                    species={species}
                    vitalityScore={displayedVitality(climate)}
                    inSweetSpot={climate.inSweetSpot}
                    temper={climate.temper}
                    temperatureStatus={climate.temperatureStatus}
                    humidityStatus={climate.humidityStatus}
                    heartRate={heartRate}
                    warmPulse={care.warmPulse}
                    mistPulse={care.mistPulse}
                    cheerPulse={care.cheerPulse}
                    brooding={care.brooding}
                    onTap={care.onEggTap}
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
                <HeartBurst pulse={care.heartPulse} />
                <View pointerEvents="box-none" style={styles.sideLabels}>
                  <TelemetryColumn align="end" top={leftTop} bottom={leftBottom} />
                  <TelemetryColumn
                    align="start"
                    top={rightTop}
                    bottom={rightBottom}
                    topTarget="telemetry_heart"
                  />
                </View>
              </View>
              <Text maxFontSizeMultiplier={1.2} style={[styles.hint, { color: palette.textMuted }]}>
                {holdHint}
              </Text>
            </View>
          </View>
      </GestureDetector>
          <View style={styles.dock}>
            <ClimateControls
              species={species}
              climate={climate}
              notice={care.notice}
              soaking={care.soaking}
              onBroodStart={care.onBroodStart}
              onBroodEnd={care.onBroodEnd}
              onBroodTooShort={care.onBroodTooShort}
              onSpritz={care.onSpritz}
            />
      </View>

      <HatchingCeremony
        visible={snapshot.isReadyToHatch && !pet.isHatched && !snapshot.isUnviable}
        nickname={pet.nickname}
        speciesId={species.id}
        onComplete={(name) => {
          markHatched();
          placeInSanctuary(name);
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
  accessory,
}: {
  title: string;
  accessory?: { label: string; onPress: () => void };
}) {
  const palette = useNestPalette();

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
      <SettingsButton />
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
  return Math.max(0.82, Math.min(1, (box.width - 16) / frame.width, (box.height - 74 - WISH_SLOT) / frame.height));
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
  somberCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  somberKicker: {
    color: '#8A8178',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  somberTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  somberBody: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 360,
  },
  somberDetail: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 360,
  },
  somberButton: {
    marginTop: Spacing.two,
    minHeight: 50,
    minWidth: 240,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A4A40',
  },
  somberButtonLabel: {
    color: '#F1E9DF',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 12, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  inviteCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inviteTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  inviteBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  inviteBuy: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  inviteBuyLabel: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  inviteHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  inviteLater: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLaterLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
