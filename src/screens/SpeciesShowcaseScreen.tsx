import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { fitSilhouette, GrowthSilhouette } from '@/components/GrowthSilhouette';
import { hexToRgba } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { SPECIES_REGISTRY } from '@/data/species';
import {
  DIFFICULTY_TAGS,
  SPECIES_IDS,
  type DifficultyTag,
  type SpeciesConfig,
  type SpeciesId,
  type TaxonomicClass,
} from '@/domain/types';
import { formatBiologicalWeight, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, NotificationFeedbackType, triggerImpact, triggerNotification } from '@/services/hapticFeedback';
import { useActivePet } from '@/hooks/useActivePet';

const STUDIO = '#0C0A09';
const INK = '#F4EDE3';
const MUTED = '#C4B6A6';
const CARD = '#17130F';
const LINE = '#3A3228';
const ADOPT = '#E7A15A';
const ADOPT_TEXT = '#1A1410';

const CLASS_LABEL: Record<TaxonomicClass, TranslationKey> = {
  aves: 'showcase.class.aves',
  reptilia: 'showcase.class.reptilia',
  monotremata: 'showcase.class.monotremata',
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
  const params = useLocalSearchParams<{ speciesId?: string | string[]; replacing?: string | string[] }>();
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

  return <ShowcaseBody species={species} replacing={firstParam(params.replacing) === '1'} />;
}

function ShowcaseBody({ species, replacing }: { species: SpeciesConfig; replacing: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { adoptPet } = useActivePet();
  const reduceMotion = useReduceMotion();
  const [mode, setMode] = useState<FormMode>('both');
  const [naming, setNaming] = useState(false);
  const [nickname, setNickname] = useState('Pip');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setMode('both');
    setNaming(false);
    setNameError(null);
  }, [species.id]);

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
      adoptPet(species.id, trimmed);
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

  return (
    <View style={styles.root}>
      <StudioWash color={species.growth.glow} />
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('showcase.back')}
          onPress={close}
          style={({ pressed }) => [styles.backPill, { opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.backGlyph}>‹</Text>
          <Text style={styles.backLabel}>{t('showcase.back')}</Text>
        </Pressable>
      </View>

      <FormToggle
        mode={mode}
        accent={species.growth.glow}
        onChange={(next) => {
          void triggerImpact(ImpactFeedbackStyle.Light);
          setMode(next);
        }}
      />
      <FormStage species={species} mode={mode} reduceMotion={reduceMotion} />

      <ScrollView
        style={styles.dossierScroll}
        contentContainerStyle={styles.dossierContent}
        showsVerticalScrollIndicator={false}>
        <Dossier species={species} />
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void triggerImpact(ImpactFeedbackStyle.Medium);
            setNameError(null);
            setNaming(true);
          }}
          style={({ pressed }) => [styles.adopt, { opacity: pressed ? 0.88 : 1 }]}>
          <Text style={styles.adoptLabel}>{replacing ? t('showcase.replace') : t('showcase.adopt')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={close} style={styles.pickAnother}>
          <Text style={styles.pickAnotherLabel}>{t('showcase.pickAnother')}</Text>
        </Pressable>
      </View>

      <Modal visible={naming} transparent animationType="slide" onRequestClose={() => setNaming(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('showcase.cancelName')}
            style={styles.modalScrim}
            onPress={() => setNaming(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.four }]}>
            <Text style={styles.modalTitle}>{t('showcase.nicknameTitle')}</Text>
            <Text style={styles.modalBody}>{t('showcase.nicknameBody')}</Text>
            <Text style={styles.fieldLabel}>{t('adoption.nickname')}</Text>
            <TextInput
              value={nickname}
              onChangeText={(value) => {
                setNickname(value);
                setNameError(null);
              }}
              maxLength={24}
              autoCorrect={false}
              placeholder={t('adoption.placeholder')}
              placeholderTextColor={MUTED}
              accessibilityLabel={t('adoption.nicknameA11y')}
              style={[styles.input, { borderColor: nameError ? '#E07A3A' : LINE }]}
            />
            {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={confirmAdoption}
              style={({ pressed }) => [styles.adopt, { opacity: pressed ? 0.88 : 1 }]}>
              <Text style={styles.adoptLabel}>{t('showcase.confirmAdopt')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setNaming(false)} style={styles.pickAnother}>
              <Text style={styles.pickAnotherLabel}>{t('showcase.cancelName')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StudioWash({ color }: { color: string }) {
  return (
    <Svg
      width="100%"
      height={460}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={styles.wash}
      pointerEvents="none">
      <Defs>
        <RadialGradient id="studio-wash" cx="50" cy="36" r="48" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <Stop offset="55%" stopColor={color} stopOpacity={0.08} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="40" rx="62" ry="48" fill="url(#studio-wash)" />
    </Svg>
  );
}

function FormToggle({
  mode,
  accent,
  onChange,
}: {
  mode: FormMode;
  accent: string;
  onChange: (mode: FormMode) => void;
}) {
  const { t } = useTranslation();
  const options: { id: FormMode; label: TranslationKey }[] = [
    { id: 'both', label: 'showcase.bothForms' },
    { id: 'baby', label: 'showcase.babyForm' },
    { id: 'adult', label: 'showcase.adultForm' },
  ];

  return (
    <View style={styles.toggle}>
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
              {
                backgroundColor: selected ? hexToRgba(accent, 0.28) : 'transparent',
                borderColor: selected ? accent : 'transparent',
              },
            ]}>
            <Text style={[styles.toggleLabel, { color: selected ? INK : MUTED }]}>{t(option.label)}</Text>
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
}: {
  species: SpeciesConfig;
  mode: FormMode;
  reduceMotion: boolean;
}) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const stageInner = Math.max(240, width - Spacing.four * 2);
  const adultH = Math.min(176, Math.round(stageInner * 0.46));
  const babyScale = fieldScale(species.growth.hatchlingMeasureCm, species.growth.adultMeasureCm);
  const babyH = Math.max(72, Math.round(adultH * babyScale));
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
  const travel = Math.min(108, Math.round(stageInner * 0.24));
  const solo = Math.min(1.8, adultH / babyH);

  const babyX = useSharedValue(-travel);
  const adultX = useSharedValue(travel);
  const babyZoom = useSharedValue(1);
  const adultZoom = useSharedValue(1);
  const babyOpacity = useSharedValue(1);
  const adultOpacity = useSharedValue(1);

  useEffect(() => {
    const timing = { duration: reduceMotion ? 0 : 380, easing: Easing.out(Easing.cubic) };
    if (mode === 'both') {
      babyX.value = withTiming(-travel, timing);
      adultX.value = withTiming(travel, timing);
      babyZoom.value = withTiming(1, timing);
      adultZoom.value = withTiming(1, timing);
      babyOpacity.value = withTiming(1, timing);
      adultOpacity.value = withTiming(1, timing);
      return;
    }
    if (mode === 'baby') {
      babyX.value = withTiming(0, timing);
      adultX.value = withTiming(travel * 0.4, timing);
      babyZoom.value = withTiming(solo, timing);
      adultZoom.value = withTiming(0.92, timing);
      babyOpacity.value = withTiming(1, timing);
      adultOpacity.value = withTiming(0, timing);
      return;
    }
    babyX.value = withTiming(-travel * 0.4, timing);
    adultX.value = withTiming(0, timing);
    babyZoom.value = withTiming(0.9, timing);
    adultZoom.value = withTiming(1.04, timing);
    babyOpacity.value = withTiming(0, timing);
    adultOpacity.value = withTiming(1, timing);
  }, [adultOpacity, adultX, adultZoom, babyOpacity, babyX, babyZoom, mode, reduceMotion, solo, travel]);

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

  const babyMass = massLabel(species.hatchWeightGrams, t);
  const adultMass = massLabel(species.adultWeightGrams, t);
  const babyMeasure = t('showcase.measure', {
    value: formatCm(species.growth.hatchlingMeasureCm),
    kind: t('showcase.length'),
  });
  const adultMeasure = t('showcase.measure', {
    value: formatCm(species.growth.adultMeasureCm),
    kind: t(species.growth.adultMetricKind === 'wingspan' ? 'showcase.wingspan' : 'showcase.length'),
  });

  return (
    <View style={styles.stage}>
      <Podium />
      <Animated.View
        pointerEvents={mode === 'adult' ? 'none' : 'auto'}
        accessibilityElementsHidden={mode === 'adult'}
        importantForAccessibility={mode === 'adult' ? 'no-hide-descendants' : 'yes'}
        style={[styles.figureAnchor, babyShift]}>
        <MeasureBadge
          title={t('showcase.babyForm')}
          mass={babyMass}
          measure={babyMeasure}
          label={t('showcase.a11y.baby', { name: species.commonName })}
        />
        <Animated.View style={[styles.scaler, babyScaleStyle]}>
          <GrowthSilhouette
            speciesId={species.id}
            stage="juvenile"
            width={babyW}
            height={babyDrawH}
            fill={INK}
            opacity={0.34}
            rim={species.growth.glow}
            filterSuffix="showcase-baby"
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents={mode === 'baby' ? 'none' : 'auto'}
        accessibilityElementsHidden={mode === 'baby'}
        importantForAccessibility={mode === 'baby' ? 'no-hide-descendants' : 'yes'}
        style={[styles.figureAnchor, adultShift]}>
        <MeasureBadge
          title={t('showcase.adultForm')}
          mass={adultMass}
          measure={adultMeasure}
          label={t('showcase.a11y.adult', { name: species.commonName })}
        />
        <Animated.View style={[styles.scaler, adultScaleStyle]}>
          <GrowthSilhouette
            speciesId={species.id}
            stage="adult"
            width={adultW}
            height={adultDrawH}
            fill={INK}
            opacity={0.34}
            rim={species.growth.glow}
            filterSuffix="showcase-adult"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Podium() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.podium} pointerEvents="none">
      <Ellipse cx="50" cy="90" rx="18" ry="1.1" fill={INK} opacity={0.28} />
    </Svg>
  );
}

function MeasureBadge({
  title,
  mass,
  measure,
  label,
}: {
  title: string;
  mass: string;
  measure: string;
  label: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label}. ${mass}. ${measure}`} style={styles.badge}>
      <Text style={styles.badgeTitle}>{title}</Text>
      <Text style={styles.badgeMass}>{mass}</Text>
      <Text style={styles.badgeMeta}>{measure}</Text>
    </View>
  );
}

function Dossier({ species }: { species: SpeciesConfig }) {
  const { t } = useTranslation();
  const difficulty = species.showcase.difficultyTag;
  const filled = PIP_COUNT[difficulty];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.commonName}>{species.commonName}</Text>
          <Text style={styles.binomial}>{species.scientificName}</Text>
        </View>
        <View style={[styles.classBadge, { backgroundColor: hexToRgba(species.growth.glow, 0.22) }]}>
          <Text style={styles.classLabel}>{t(CLASS_LABEL[species.taxon])}</Text>
        </View>
      </View>

      <View
        style={[
          styles.banner,
          {
            backgroundColor: hexToRgba(species.growth.glow, 0.16),
            borderColor: hexToRgba(species.growth.glow, 0.45),
          },
        ]}>
        <Text style={styles.bannerPrimary}>{t('showcase.hatchBanner', { days: species.incubationDays })}</Text>
        <Text style={styles.bannerSecondary}>
          {t('showcase.adultBanner', { days: species.adultMaturationDays })}
        </Text>
      </View>

      <View style={styles.tileRow}>
        <InfoTile label={t('showcase.temperament')} value={species.showcase.temperament} />
        <InfoTile label={t('showcase.habitat')} value={species.showcase.habitat} />
      </View>
      <SpecimenScale species={species} />

      <Text style={styles.section}>{t('showcase.facts')}</Text>
      <FactPager facts={species.showcase.funFacts} accent={species.growth.glow} />

      <Text style={styles.section}>{t('showcase.care')}</Text>
      <View style={styles.careRow}>
        <View style={styles.pips} accessibilityLabel={t(DIFFICULTY_LABEL[difficulty])}>
          {DIFFICULTY_TAGS.map((tag, index) => (
            <View
              key={tag}
              style={[
                styles.pip,
                {
                  backgroundColor: index < filled ? species.growth.glow : LINE,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.careTag}>{t(DIFFICULTY_LABEL[difficulty])}</Text>
      </View>
      <Text style={styles.careBody}>{t(CARE_COPY[difficulty])}</Text>
    </View>
  );
}

function SpecimenScale({ species }: { species: SpeciesConfig }) {
  const { t } = useTranslation();
  const adult = Math.max(species.growth.adultMeasureCm, 0.1);
  const hatchRatio = Math.min(1, Math.max(0.08, species.growth.hatchlingMeasureCm / adult));
  const kind = t(species.growth.adultMetricKind === 'wingspan' ? 'showcase.wingspan' : 'showcase.length');
  const hatchMeasure = t('showcase.measure', {
    value: formatCm(species.growth.hatchlingMeasureCm),
    kind: t('showcase.length'),
  });
  const adultMeasure = t('showcase.measure', {
    value: formatCm(species.growth.adultMeasureCm),
    kind,
  });

  return (
    <View>
      <Text style={styles.section}>{t('showcase.scale')}</Text>
      <View style={styles.scaleBlock}>
        <Text style={styles.scaleLabel}>{t('showcase.babyForm')}</Text>
        <View style={styles.scaleTrack}>
          <View style={[styles.scaleFill, { width: `${Math.round(hatchRatio * 100)}%`, backgroundColor: species.growth.glow }]} />
        </View>
        <Text style={styles.scaleValue}>{hatchMeasure}</Text>
      </View>
      <View style={styles.scaleBlock}>
        <Text style={styles.scaleLabel}>{t('showcase.adultForm')}</Text>
        <View style={styles.scaleTrack}>
          <View style={[styles.scaleFill, { width: '100%', backgroundColor: species.growth.glow }]} />
        </View>
        <Text style={styles.scaleValue}>{adultMeasure}</Text>
      </View>
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function FactPager({ facts, accent }: { facts: readonly string[]; accent: string }) {
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
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.factText}>{facts[0]}</Text>
      )}
      <View style={styles.dots}>
        {facts.map((fact, factIndex) => (
          <View
            key={`${factIndex}-dot`}
            style={[
              styles.dot,
              { backgroundColor: factIndex === index ? accent : LINE },
            ]}
          />
        ))}
      </View>
    </View>
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
  root: {
    flex: 1,
    backgroundColor: STUDIO,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  backPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 16, 12, 0.55)',
    borderWidth: 1,
    borderColor: LINE,
  },
  backGlyph: {
    color: INK,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  backLabel: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 12, 0.55)',
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: Spacing.two,
  },
  toggleItem: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stage: {
    height: 268,
    marginHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podium: {
    ...StyleSheet.absoluteFill,
  },
  figureAnchor: {
    position: 'absolute',
    bottom: 18,
    alignItems: 'center',
  },
  scaler: {
    transformOrigin: 'bottom',
  },
  badge: {
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 10, 9, 0.72)',
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    minWidth: 78,
  },
  badgeTitle: {
    color: INK,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeMass: {
    color: INK,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  badgeMeta: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  dossierScroll: {
    flex: 1,
  },
  dossierContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  commonName: {
    color: INK,
    fontSize: 26,
    fontWeight: '700',
  },
  binomial: {
    color: MUTED,
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  classBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  classLabel: {
    color: INK,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  bannerPrimary: {
    color: INK,
    fontSize: 16,
    fontWeight: '800',
  },
  bannerSecondary: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    padding: Spacing.two,
    gap: 4,
  },
  tileLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tileValue: {
    color: INK,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  section: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: Spacing.one,
  },
  factPage: {
    paddingRight: Spacing.two,
    minHeight: 72,
    justifyContent: 'center',
  },
  factText: {
    color: INK,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  scaleBlock: {
    gap: 4,
  },
  scaleLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scaleTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#2A241C',
    overflow: 'hidden',
  },
  scaleFill: {
    height: '100%',
    borderRadius: 999,
  },
  scaleValue: {
    color: INK,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pips: {
    flexDirection: 'row',
    gap: 6,
  },
  pip: {
    width: 18,
    height: 8,
    borderRadius: 4,
  },
  careTag: {
    color: INK,
    fontSize: 15,
    fontWeight: '800',
  },
  careBody: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  dock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    backgroundColor: STUDIO,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  adopt: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: ADOPT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptLabel: {
    color: ADOPT_TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  pickAnother: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickAnotherLabel: {
    color: INK,
    fontSize: 15,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: {
    color: INK,
    fontSize: 22,
    fontWeight: '800',
  },
  modalBody: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    color: INK,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#100E0C',
  },
  nameError: {
    color: '#E7A15A',
    fontSize: 13,
    fontWeight: '700',
  },
});
