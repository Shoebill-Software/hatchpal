import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ADOPTION_ATMOSPHERE, useHatcheryPalette, type HatcheryPalette } from '@/components/adoptionAtmosphere';
import { fitSilhouette, GrowthSilhouette } from '@/components/GrowthSilhouette';
import { HatcheryWash } from '@/components/HatcheryStage';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsButton, SettingsSheetHost } from '@/components/SettingsMenu';
import { SpeciesEggArt } from '@/components/SpeciesEggArt';
import { hexToRgba } from '@/constants/nest';
import { Fonts } from '@/constants/theme';
import { SPECIES_REGISTRY } from '@/data/species';
import { priceStringFor, productIdForSpecies, SANCTUARY_PASS_PRODUCT_ID } from '@/domain/entitlements';
import {
  DIFFICULTY_TAGS,
  SPECIES_IDS,
  type DifficultyTag,
  type RosterTag,
  type SpeciesConfig,
  type SpeciesId,
} from '@/domain/types';
import { KEEPER_PROGRESS_KEY, useKeeperAccess } from '@/hooks/useKeeperMilestones';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { formatBiologicalWeight, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, NotificationFeedbackType, triggerImpact, triggerNotification } from '@/services/hapticFeedback';
import { isPurchaseCancelled } from '@/services/purchaseErrors';
import { useActivePet } from '@/hooks/useActivePet';
import { usePurchasesStore } from '@/store/usePurchasesStore';

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

const CARE_COPY: Record<DifficultyTag, TranslationKey> = {
  gentle: 'showcase.care.gentle',
  intermediate: 'showcase.care.intermediate',
  patience_master: 'showcase.care.patience_master',
};

const PIP_COUNT: Record<DifficultyTag, number> = {
  gentle: 1,
  intermediate: 2,
  patience_master: 3,
};

type FormMode = 'both' | 'baby' | 'adult';

export default function SpeciesShowcaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    speciesId?: string | string[];
    replacing?: string | string[];
    adding?: string | string[];
  }>();
  const speciesId = asSpeciesId(firstParam(params.speciesId));
  const species = speciesId ? SPECIES_REGISTRY[speciesId] : null;

  useEffect(() => {
    if (species) {
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/adopt');
    }
  }, [router, species]);

  if (!species) {
    return <View style={styles.root} />;
  }

  return (
    <ShowcaseBody
      species={species}
      replacing={firstParam(params.replacing) === '1'}
      adding={firstParam(params.adding) === '1'}
    />
  );
}

function ShowcaseBody({
  species,
  replacing,
  adding,
}: {
  species: SpeciesConfig;
  replacing: boolean;
  adding: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { t } = useTranslation();
  const palette = useHatcheryPalette();
  const { adoptPet, adoptEggInNewCradle } = useActivePet();
  const reduceMotion = useReduceMotion();
  const arrival = useArrival(species.id, reduceMotion);
  const { isAvailable, gateFor } = useKeeperAccess();
  const available = isAvailable(species.id);
  const earnGate = gateFor(species.id);
  const packages = usePurchasesStore((state) => state.availablePackages);
  const purchaseProduct = usePurchasesStore((state) => state.purchaseProduct);
  const [mode, setMode] = useState<FormMode>('both');
  const [naming, setNaming] = useState(false);
  const [nickname, setNickname] = useState('Pip');
  const [nameError, setNameError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const speciesProductId = productIdForSpecies(species.id);
  const speciesPrice = speciesProductId ? priceStringFor(packages, speciesProductId) : '';
  const passPrice = priceStringFor(packages, SANCTUARY_PASS_PRODUCT_ID);
  const roomy = height >= 760;
  const frameWidth = Math.min(width, 640);
  const accent = speciesAccent(species, palette.scheme);
  const alarm = palette.scheme === 'dark' ? '#E7B2A2' : '#8E3B24';

  useEffect(() => {
    setMode('both');
    setNaming(false);
    setNameError(null);
  }, [species.id]);

  const buy = (productId: string) => {
    setPurchasing(true);
    setPurchaseError(null);
    void purchaseProduct(productId)
      .then(() => {
        void triggerNotification(NotificationFeedbackType.Success);
        setNameError(null);
        setNaming(true);
      })
      .catch((error: unknown) => {
        if (!isPurchaseCancelled(error)) {
          setPurchaseError(t('showcase.purchaseFailed'));
        }
      })
      .finally(() => {
        setPurchasing(false);
      });
  };

  const close = () => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/adopt');
  };

  const confirmAdoption = () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNameError(t('showcase.nameRequired'));
      return;
    }
    try {
      if (adding) {
        const created = adoptEggInNewCradle(species.id, trimmed);
        if (!created) {
          setNameError(t('showcase.cradleFull'));
          return;
        }
      } else {
        adoptPet(species.id, trimmed);
      }
      void triggerNotification(NotificationFeedbackType.Success);
      setNaming(false);
      if (router.canDismiss()) {
        router.dismissTo('/');
      } else {
        router.replace('/');
      }
    } catch {
      setNameError(t('adoption.error'));
    }
  };

  const passPrimary = speciesProductId == null;

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <NestStatusBar />
      <HatcheryWash speciesId={species.id} />
      <View style={[styles.column, { paddingTop: insets.top + 4 }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('showcase.back')}
            onPress={close}
            hitSlop={8}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: `rgba(${palette.veil}, 0.08)`, opacity: pressed ? 0.6 : 1 },
            ]}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={16}
              tintColor={palette.ink}
              fallback={<Text style={[styles.backGlyph, { color: palette.ink }]}>‹</Text>}
            />
          </Pressable>
          <SettingsButton tint={palette.ink} />
        </View>

        <Animated.View style={[styles.body, arrival]}>
          <FormToggle
            mode={mode}
            accent={accent}
            palette={palette}
            onChange={(next) => {
              void triggerImpact(ImpactFeedbackStyle.Light);
              setMode(next);
            }}
          />
          <FormStage
            species={species}
            mode={mode}
            reduceMotion={reduceMotion}
            palette={palette}
            frameWidth={frameWidth}
            stageHeight={roomy ? 228 : 176}
          />
          <FormCaption species={species} mode={mode} palette={palette} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <FieldPlate species={species} palette={palette} roomy={roomy} frameWidth={frameWidth} accent={accent} />
          </ScrollView>
        </Animated.View>

        <View
          style={[
            styles.dock,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: palette.ground,
              borderTopColor: `rgba(${palette.veil}, 0.16)`,
            },
          ]}>
          {available ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void triggerImpact(ImpactFeedbackStyle.Medium);
                setNameError(null);
                setNaming(true);
              }}
              style={({ pressed }) => [
                styles.begin,
                {
                  backgroundColor: palette.amber,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.15}
                style={[styles.beginLabel, { color: palette.amberInk }]}>
                {replacing && !adding ? t('showcase.replace') : t('showcase.begin')}
              </Text>
            </Pressable>
          ) : (
            <>
              {earnGate ? (
                <Text maxFontSizeMultiplier={1.2} style={[styles.earnHint, { color: palette.quiet }]}>
                  {t('showcase.earnHint', {
                    progress: t(KEEPER_PROGRESS_KEY[earnGate.id], {
                      current: earnGate.progress,
                      goal: earnGate.goal,
                    }),
                  })}
                </Text>
              ) : null}
              {speciesProductId ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={purchasing}
                  onPress={() => buy(speciesProductId)}
                  style={({ pressed }) => [
                    styles.begin,
                    {
                      backgroundColor: palette.amber,
                      opacity: purchasing ? 0.6 : pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    maxFontSizeMultiplier={1.15}
                    style={[styles.beginLabel, { color: palette.amberInk }]}>
                    {t('showcase.unlockSpecies', { price: speciesPrice })}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={purchasing}
                onPress={() => buy(SANCTUARY_PASS_PRODUCT_ID)}
                style={({ pressed }) => [
                  styles.begin,
                  passPrimary
                    ? { backgroundColor: palette.amber }
                    : { borderWidth: 1, borderColor: `rgba(${palette.veil}, 0.22)` },
                  { opacity: purchasing ? 0.6 : pressed ? 0.88 : 1 },
                ]}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  maxFontSizeMultiplier={1.15}
                  style={[styles.beginLabel, { color: passPrimary ? palette.amberInk : palette.ink }]}>
                  {t('showcase.getPass', { price: passPrice })}
                </Text>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                  style={[
                    styles.passHint,
                    { color: passPrimary ? hexToRgba(palette.amberInk, 0.72) : palette.quiet },
                  ]}>
                  {t('showcase.passSubtitle')}
                </Text>
              </Pressable>
            </>
          )}
          {purchaseError ? (
            <Text maxFontSizeMultiplier={1.2} style={[styles.purchaseError, { color: alarm }]}>
              {purchaseError}
            </Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={close} style={styles.pickAnother}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.pickAnotherLabel, { color: palette.quiet }]}>
              {t('showcase.pickAnother')}
            </Text>
          </Pressable>
        </View>
      </View>

      <NamingSheet
        visible={naming}
        nickname={nickname}
        nameError={nameError}
        palette={palette}
        alarm={alarm}
        bottomInset={insets.bottom}
        onChangeNickname={(value) => {
          setNickname(value);
          setNameError(null);
        }}
        onConfirm={confirmAdoption}
        onClose={() => setNaming(false)}
      />
      <SettingsSheetHost />
    </View>
  );
}

function speciesAccent(species: SpeciesConfig, scheme: HatcheryPalette['scheme']): string {
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  return scheme === 'dark' ? atmosphere.rim : atmosphere.low;
}

function useArrival(token: string, reduceMotion: boolean) {
  const opacity = useSharedValue(1);
  const seen = useRef<string | null>(null);

  if (seen.current !== token) {
    const first = seen.current == null;
    seen.current = token;
    if (!first && !reduceMotion) {
      opacity.value = 0.25;
    }
  }

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: reduceMotion ? 0 : 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [opacity, reduceMotion, token]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function Horizon({ species, palette }: { species: SpeciesConfig; palette: HatcheryPalette }) {
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  const dark = palette.scheme === 'dark';
  const id = `plate-horizon-${species.id}-${palette.scheme}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={atmosphere.mid} stopOpacity={0} />
          <Stop offset="58%" stopColor={atmosphere.mid} stopOpacity={dark ? 0.06 : 0.05} />
          <Stop offset="100%" stopColor={atmosphere.mid} stopOpacity={dark ? 0.46 : 0.36} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="42" width="100" height="58" fill={`url(#${id})`} />
      <Ellipse
        cx="50"
        cy="93"
        rx="18"
        ry="1.15"
        fill={dark ? atmosphere.rim : atmosphere.low}
        opacity={dark ? 0.4 : 0.28}
      />
    </Svg>
  );
}

function FormToggle({
  mode,
  accent,
  palette,
  onChange,
}: {
  mode: FormMode;
  accent: string;
  palette: HatcheryPalette;
  onChange: (mode: FormMode) => void;
}) {
  const { t } = useTranslation();
  const options: { id: FormMode; label: TranslationKey }[] = [
    { id: 'both', label: 'showcase.bothForms' },
    { id: 'baby', label: 'showcase.babyForm' },
    { id: 'adult', label: 'showcase.adultForm' },
  ];

  return (
    <View style={[styles.toggle, { backgroundColor: `rgba(${palette.veil}, 0.07)` }]}>
      {options.map((option) => {
        const selected = mode === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={[
              styles.toggleItem,
              { backgroundColor: selected ? hexToRgba(accent, palette.scheme === 'dark' ? 0.24 : 0.14) : 'transparent' },
            ]}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={[styles.toggleLabel, { color: selected ? palette.ink : palette.quiet }]}>
              {t(option.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FormStage({
  species,
  mode,
  reduceMotion,
  palette,
  frameWidth,
  stageHeight,
}: {
  species: SpeciesConfig;
  mode: FormMode;
  reduceMotion: boolean;
  palette: HatcheryPalette;
  frameWidth: number;
  stageHeight: number;
}) {
  const stageInner = Math.max(240, frameWidth - 12);
  const adultH = Math.round(stageHeight * 0.78);
  const babyScale = fieldScale(species.growth.hatchlingMeasureCm, species.growth.adultMeasureCm);
  const babyH = Math.max(64, Math.round(adultH * babyScale));
  const adultFit = fitSilhouette(species.id, stageInner, adultH);
  const babyFit = fitSilhouette(species.id, stageInner, babyH);
  const pairGap = 36;
  const pairScale =
    adultFit.width + babyFit.width + pairGap > stageInner
      ? stageInner / (adultFit.width + babyFit.width + pairGap)
      : 1;
  const adultW = Math.round(adultFit.width * pairScale);
  const adultDrawH = Math.round(adultFit.height * pairScale);
  const babyW = Math.round(babyFit.width * pairScale);
  const babyDrawH = Math.round(babyFit.height * pairScale);
  const babyHome = -Math.round((adultW + pairGap) / 2);
  const adultHome = Math.round((babyW + pairGap) / 2);
  const solo = Math.min(1.8, adultH / babyH);
  const accent = speciesAccent(species, palette.scheme);

  const babyX = useSharedValue(babyHome);
  const adultX = useSharedValue(adultHome);
  const babyZoom = useSharedValue(1);
  const adultZoom = useSharedValue(1);
  const babyOpacity = useSharedValue(1);
  const adultOpacity = useSharedValue(1);

  useEffect(() => {
    const timing = { duration: reduceMotion ? 0 : 380, easing: Easing.out(Easing.cubic) };
    if (mode === 'both') {
      babyX.value = withTiming(babyHome, timing);
      adultX.value = withTiming(adultHome, timing);
      babyZoom.value = withTiming(1, timing);
      adultZoom.value = withTiming(1, timing);
      babyOpacity.value = withTiming(1, timing);
      adultOpacity.value = withTiming(1, timing);
      return;
    }
    if (mode === 'baby') {
      babyX.value = withTiming(0, timing);
      adultX.value = withTiming(adultHome, timing);
      babyZoom.value = withTiming(solo, timing);
      adultZoom.value = withTiming(0.92, timing);
      babyOpacity.value = withTiming(1, timing);
      adultOpacity.value = withTiming(0, timing);
      return;
    }
    babyX.value = withTiming(babyHome, timing);
    adultX.value = withTiming(0, timing);
    babyZoom.value = withTiming(0.9, timing);
    adultZoom.value = withTiming(1.04, timing);
    babyOpacity.value = withTiming(0, timing);
    adultOpacity.value = withTiming(1, timing);
  }, [adultHome, adultOpacity, adultX, adultZoom, babyHome, babyOpacity, babyX, babyZoom, mode, reduceMotion, solo]);

  const babyShift = useAnimatedStyle(() => ({
    opacity: babyOpacity.value,
    transform: [{ translateX: babyX.value }],
  }));
  const adultShift = useAnimatedStyle(() => ({
    opacity: adultOpacity.value,
    transform: [{ translateX: adultX.value }],
  }));
  const babyScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: babyZoom.value }],
  }));
  const adultScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: adultZoom.value }],
  }));

  return (
    <View style={[styles.stage, { height: stageHeight }]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}>
        <Horizon species={species} palette={palette} />
      </View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={mode === 'adult'}
        importantForAccessibility={mode === 'adult' ? 'no-hide-descendants' : 'yes'}
        style={[styles.figureAnchor, babyShift]}>
        <Animated.View style={[styles.scaler, babyScaleStyle]}>
          <GrowthSilhouette
            speciesId={species.id}
            stage="juvenile"
            width={babyW}
            height={babyDrawH}
            fill={accent}
            opacity={0.94}
            filterSuffix={`showcase-baby-${palette.scheme}`}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={mode === 'baby'}
        importantForAccessibility={mode === 'baby' ? 'no-hide-descendants' : 'yes'}
        style={[styles.figureAnchor, adultShift]}>
        <Animated.View style={[styles.scaler, adultScaleStyle]}>
          <GrowthSilhouette
            speciesId={species.id}
            stage="adult"
            width={adultW}
            height={adultDrawH}
            fill={accent}
            opacity={0.94}
            filterSuffix={`showcase-adult-${palette.scheme}`}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function FormCaption({
  species,
  mode,
  palette,
}: {
  species: SpeciesConfig;
  mode: FormMode;
  palette: HatcheryPalette;
}) {
  const { t } = useTranslation();
  const baby = mode !== 'adult';
  const adult = mode !== 'baby';

  return (
    <View style={styles.captionRow}>
      {baby ? (
        <MeasureCaption
          title={t('showcase.babyForm')}
          mass={massLabel(species.hatchWeightGrams, t)}
          measure={t('showcase.measure', {
            value: formatCm(species.growth.hatchlingMeasureCm),
            kind: t('showcase.length'),
          })}
          label={t('showcase.a11y.baby', { name: species.commonName })}
          palette={palette}
        />
      ) : null}
      {baby && adult ? (
        <View style={[styles.captionRule, { backgroundColor: `rgba(${palette.veil}, 0.18)` }]} />
      ) : null}
      {adult ? (
        <MeasureCaption
          title={t('showcase.adultForm')}
          mass={massLabel(species.adultWeightGrams, t)}
          measure={t('showcase.measure', {
            value: formatCm(species.growth.adultMeasureCm),
            kind: t(species.growth.adultMetricKind === 'wingspan' ? 'showcase.wingspan' : 'showcase.length'),
          })}
          label={t('showcase.a11y.adult', { name: species.commonName })}
          palette={palette}
        />
      ) : null}
    </View>
  );
}

function MeasureCaption({
  title,
  mass,
  measure,
  label,
  palette,
}: {
  title: string;
  mass: string;
  measure: string;
  label: string;
  palette: HatcheryPalette;
}) {
  return (
    <View accessible accessibilityLabel={`${label}. ${mass}. ${measure}`} style={styles.captionItem}>
      <Text
        maxFontSizeMultiplier={1.15}
        style={[styles.captionTitle, { color: palette.quiet }]}
        accessibilityElementsHidden>
        {title}
      </Text>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
        style={[styles.captionValue, { color: palette.ink, fontFamily: Fonts?.serif }]}
        accessibilityElementsHidden>
        {mass} · {measure}
      </Text>
    </View>
  );
}

function FieldPlate({
  species,
  palette,
  roomy,
  frameWidth,
  accent,
}: {
  species: SpeciesConfig;
  palette: HatcheryPalette;
  roomy: boolean;
  frameWidth: number;
  accent: string;
}) {
  const { t } = useTranslation();
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  const eggHeight = roomy ? 108 : 86;
  const titleSize = Math.max(26, Math.min(36, Math.floor((frameWidth - 56) / (species.commonName.length * 0.5))));
  const difficulty = species.showcase.difficultyTag;

  return (
    <View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.eggSeal}>
        <SpeciesEggArt species={species} width={Math.round(eggHeight * (120 / 160))} height={eggHeight} />
      </View>
      <Text
        maxFontSizeMultiplier={1.15}
        style={[styles.taxon, { color: palette.scheme === 'dark' ? atmosphere.rim : atmosphere.low }]}>
        {t(TAG_LABEL[species.tag])}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[
          styles.common,
          {
            fontFamily: Fonts?.serif,
            color: palette.ink,
            fontSize: titleSize,
            lineHeight: Math.round(titleSize * 1.16),
          },
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
      <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[styles.shell, { color: palette.muted }]}>
        {species.egg.description}
      </Text>

      <View style={styles.ledger}>
        <LedgerFigure
          value={String(species.incubationDays)}
          caption={t('showcase.ledgerHatch')}
          accessibilityLabel={t('showcase.hatchBanner', { days: species.incubationDays })}
          palette={palette}
          roomy={roomy}
        />
        <View style={[styles.ledgerRule, { backgroundColor: `rgba(${palette.veil}, 0.18)` }]} />
        <LedgerFigure
          value={String(species.adultMaturationDays)}
          caption={t('showcase.ledgerAdult')}
          accessibilityLabel={t('showcase.adultBanner', { days: species.adultMaturationDays })}
          palette={palette}
          roomy={roomy}
        />
      </View>

      <View style={styles.noteRow}>
        <FieldNote label={t('showcase.temperament')} value={species.showcase.temperament} palette={palette} />
        <View style={[styles.noteRule, { backgroundColor: `rgba(${palette.veil}, 0.16)` }]} />
        <FieldNote label={t('showcase.habitat')} value={species.showcase.habitat} palette={palette} />
      </View>

      <Text maxFontSizeMultiplier={1.15} style={[styles.section, { color: palette.quiet }]}>
        {t('showcase.facts')}
      </Text>
      <FactPager facts={species.showcase.funFacts} accent={accent} palette={palette} />

      <Text maxFontSizeMultiplier={1.15} style={[styles.section, { color: palette.quiet }]}>
        {t('showcase.care')}
      </Text>
      <View style={styles.careRow}>
        <View
          style={styles.pips}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {DIFFICULTY_TAGS.map((tag, index) => (
            <View
              key={tag}
              style={[
                styles.pip,
                { backgroundColor: index < PIP_COUNT[difficulty] ? accent : `rgba(${palette.veil}, 0.16)` },
              ]}
            />
          ))}
        </View>
        <Text maxFontSizeMultiplier={1.15} style={[styles.careTag, { color: palette.ink, fontFamily: Fonts?.serif }]}>
          {t(DIFFICULTY_LABEL[difficulty])}
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.careBody, { color: palette.muted }]}>
        {t(CARE_COPY[difficulty])}
      </Text>
    </View>
  );
}

function LedgerFigure({
  value,
  caption,
  accessibilityLabel,
  palette,
  roomy,
}: {
  value: string;
  caption: string;
  accessibilityLabel: string;
  palette: HatcheryPalette;
  roomy: boolean;
}) {
  const size = roomy ? 40 : 34;
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.ledgerItem}>
      <Text
        maxFontSizeMultiplier={1.15}
        style={[
          styles.ledgerValue,
          { color: palette.ink, fontFamily: Fonts?.serif, fontSize: size, lineHeight: Math.round(size * 1.12) },
        ]}
        accessibilityElementsHidden>
        {value}
      </Text>
      <Text
        maxFontSizeMultiplier={1.15}
        style={[styles.ledgerCaption, { color: palette.quiet }]}
        accessibilityElementsHidden>
        {caption}
      </Text>
    </View>
  );
}

function FieldNote({ label, value, palette }: { label: string; value: string; palette: HatcheryPalette }) {
  return (
    <View style={styles.note}>
      <Text maxFontSizeMultiplier={1.15} style={[styles.noteLabel, { color: palette.quiet }]}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={[styles.noteValue, { color: palette.ink, fontFamily: Fonts?.serif }]}>
        {value}
      </Text>
    </View>
  );
}

function FactPager({
  facts,
  accent,
  palette,
}: {
  facts: readonly string[];
  accent: string;
  palette: HatcheryPalette;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) {
      return;
    }
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(facts.length - 1, Math.max(0, next)));
  };

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onEnd}
          accessibilityLabel={t('showcase.a11y.fact', { index: index + 1, total: facts.length })}>
          {facts.map((fact, factIndex) => (
            <View key={`${factIndex}-${fact.slice(0, 16)}`} style={[styles.factPage, { width }]}>
              <View style={[styles.factRule, { backgroundColor: accent }]} />
              <Text maxFontSizeMultiplier={1.25} style={[styles.factText, { color: palette.ink, fontFamily: Fonts?.serif }]}>
                {fact}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.factPage}>
          <View style={[styles.factRule, { backgroundColor: accent }]} />
          <Text maxFontSizeMultiplier={1.25} style={[styles.factText, { color: palette.ink, fontFamily: Fonts?.serif }]}>
            {facts[0]}
          </Text>
        </View>
      )}
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {facts.map((fact, factIndex) => (
          <View
            key={`${factIndex}-dot`}
            style={[
              styles.dot,
              { backgroundColor: factIndex === index ? accent : `rgba(${palette.veil}, 0.2)` },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function NamingSheet({
  visible,
  nickname,
  nameError,
  palette,
  alarm,
  bottomInset,
  onChangeNickname,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  nickname: string;
  nameError: string | null;
  palette: HatcheryPalette;
  alarm: string;
  bottomInset: number;
  onChangeNickname: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const card = palette.scheme === 'dark' ? '#1C1814' : '#FFF9F1';
  const field = palette.scheme === 'dark' ? '#100E0C' : palette.ground;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('showcase.cancelName')}
          style={styles.modalScrim}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[styles.modalCard, { backgroundColor: card, paddingBottom: bottomInset + 20 }]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.modalTitle, { color: palette.ink, fontFamily: Fonts?.serif }]}>
            {t('showcase.nicknameTitle')}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.modalBody, { color: palette.muted }]}>
            {t('showcase.nicknameBody')}
          </Text>
          <Text maxFontSizeMultiplier={1.15} style={[styles.fieldLabel, { color: palette.quiet }]}>
            {t('adoption.nickname')}
          </Text>
          <TextInput
            value={nickname}
            onChangeText={onChangeNickname}
            onSubmitEditing={onConfirm}
            maxLength={24}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            selectTextOnFocus
            placeholder={t('adoption.placeholder')}
            placeholderTextColor={palette.quiet}
            accessibilityLabel={t('adoption.nicknameA11y')}
            style={[
              styles.input,
              {
                borderColor: nameError ? alarm : `rgba(${palette.veil}, 0.16)`,
                backgroundColor: field,
                color: palette.ink,
                fontFamily: Fonts?.serif,
              },
            ]}
          />
          {nameError ? (
            <Text maxFontSizeMultiplier={1.2} style={[styles.nameError, { color: alarm }]}>
              {nameError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.begin,
              {
                backgroundColor: palette.amber,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.beginLabel, { color: palette.amberInk }]}>
              {t('showcase.confirmAdopt')}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.pickAnother}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.pickAnotherLabel, { color: palette.quiet }]}>
              {t('showcase.cancelName')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function fieldScale(subjectCm: number, referenceCm: number): number {
  if (referenceCm <= 0) {
    return 1;
  }
  const perceived = Math.sqrt(Math.max(subjectCm, 0.1) / referenceCm);
  return Math.min(1, Math.max(0.42, perceived));
}

function formatCm(cm: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: cm >= 100 ? 0 : 1,
  }).format(cm);
}

function massLabel(grams: number, t: (key: TranslationKey) => string): string {
  const mass = formatBiologicalWeight(grams);
  const unit = mass.unit === 'kg' ? t('weight.kilograms') : t('weight.grams');
  return `${mass.value} ${unit}`;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function asSpeciesId(value: string): SpeciesId | null {
  return (SPECIES_IDS as readonly string[]).includes(value) ? (value as SpeciesId) : null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  topBar: {
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    minHeight: 48,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '400',
    marginTop: -1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: '92%',
    padding: 3,
    borderRadius: 999,
    marginBottom: 4,
  },
  toggleItem: {
    flexShrink: 1,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  figureAnchor: {
    position: 'absolute',
    bottom: 12,
    alignItems: 'center',
  },
  scaler: {
    transformOrigin: 'bottom',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 6,
  },
  captionItem: {
    flex: 1,
    maxWidth: 210,
    alignItems: 'center',
    gap: 2,
  },
  captionRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  captionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  captionValue: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 6,
    paddingBottom: 28,
  },
  eggSeal: {
    alignItems: 'center',
    marginBottom: 2,
  },
  taxon: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  common: {
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },
  scientific: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
    width: '100%',
  },
  shell: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  ledger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  ledgerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  ledgerValue: {
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  ledgerCaption: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  ledgerRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    marginTop: 26,
  },
  note: {
    flex: 1,
    gap: 4,
  },
  noteRule: {
    width: StyleSheet.hairlineWidth,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  noteValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginTop: 26,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  factPage: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    minHeight: 88,
    paddingRight: 8,
  },
  factRule: {
    width: 2,
    borderRadius: 1,
  },
  factText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pips: {
    flexDirection: 'row',
    gap: 6,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  careTag: {
    fontSize: 16,
  },
  careBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  dock: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  begin: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  beginLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  passHint: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  earnHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  purchaseError: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickAnother: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickAnotherLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(22, 16, 12, 0.46)',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 10,
  },
  modalTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '500',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 22,
  },
  nameError: {
    fontSize: 13,
    fontWeight: '600',
  },
});
