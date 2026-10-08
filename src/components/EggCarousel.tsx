import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ADOPTION_ATMOSPHERE } from '@/components/adoptionAtmosphere';
import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { RosterTag, SpeciesConfig, SpeciesId } from '@/domain/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { GrowthSilhouette } from './GrowthSilhouette';
import { SpeciesEggArt } from './SpeciesEggArt';

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

export interface EggCarouselProps {
  species: readonly SpeciesConfig[];
  selectedId: SpeciesId;
  cardWidth: number;
  onSelect: (id: SpeciesId) => void;
  onInspect: (id: SpeciesId) => void;
}

export function EggCarousel({ species, selectedId, cardWidth, onSelect, onInspect }: EggCarouselProps) {
  const palette = useNestPalette();
  const reduceMotion = useReduceMotion();
  const scrollX = useSharedValue(0);
  const listRef = useRef<ScrollView>(null);
  const hasMounted = useRef(false);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const interval = cardWidth + Spacing.three;
  const listKey = species.map((item) => item.id).join('|');

  useEffect(() => {
    const found = species.findIndex((item) => item.id === selectedRef.current);
    const index = found < 0 ? 0 : found;
    const x = index * interval;
    scrollX.value = x;
    listRef.current?.scrollTo({ x, y: 0, animated: hasMounted.current && !reduceMotion });
    hasMounted.current = true;
  }, [interval, listKey, reduceMotion, scrollX, species]);

  const commitOffset = (offsetX: number) => {
    if (species.length === 0 || interval <= 0) {
      return;
    }
    const index = Math.min(species.length - 1, Math.max(0, Math.round(offsetX / interval)));
    const next = species[index];
    if (next && next.id !== selectedId) {
      onSelect(next.id);
    }
  };

  const openSpecies = (id: SpeciesId, index: number) => {
    const x = index * interval;
    scrollX.value = x;
    listRef.current?.scrollTo({ x, y: 0, animated: false });
    onSelect(id);
    onInspect(id);
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitOffset(event.nativeEvent.contentOffset.x);
  };

  return (
    <Animated.ScrollView
      ref={listRef}
      horizontal
      decelerationRate="fast"
      snapToInterval={interval}
      snapToAlignment="start"
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={handleEnd}
      contentContainerStyle={styles.row}>
      {species.map((item, index) => (
        <CarouselCard
          key={item.id}
          species={item}
          index={index}
          interval={interval}
          cardWidth={cardWidth}
          scrollX={scrollX}
          selected={item.id === selectedId}
          reduceMotion={reduceMotion}
          borderColor={item.id === selectedId ? palette.action : palette.border}
          surfaceColor={palette.surface}
          onOpen={openSpecies}
        />
      ))}
    </Animated.ScrollView>
  );
}

interface CarouselCardProps {
  species: SpeciesConfig;
  index: number;
  interval: number;
  cardWidth: number;
  scrollX: SharedValue<number>;
  selected: boolean;
  reduceMotion: boolean;
  borderColor: string;
  surfaceColor: string;
  onOpen: (id: SpeciesId, index: number) => void;
}

function CarouselCard({
  species,
  index,
  interval,
  cardWidth,
  scrollX,
  selected,
  reduceMotion,
  borderColor,
  surfaceColor,
  onOpen,
}: CarouselCardProps) {
  const palette = useNestPalette();
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  const cardStyle = usePlaneStyle(scrollX, index, interval, reduceMotion);
  const juvenileShift = useDepthStyle(scrollX, index, interval, reduceMotion, 22, 7);
  const adultShift = useDepthStyle(scrollX, index, interval, reduceMotion, 9, 3);
  const eggWidth = Math.round(Math.min(108, cardWidth * 0.33));
  const eggHeight = Math.round(eggWidth * 1.28);
  const adultWidth = Math.round(eggWidth * 2.15);
  const adultHeight = Math.round(eggHeight * 1.45);
  const babyWidth = Math.round(eggWidth * 1.15);
  const babyHeight = Math.round(eggHeight * 1.05);
  const silhouetteFill = scheme === 'dark' ? '#F4EDE3' : species.growth.shadow;
  const silhouetteRim = atmosphere.rim;

  return (
    <View
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: surfaceColor,
          borderColor,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${species.commonName}, ${species.scientificName}`}
        accessibilityHint={t('adoption.openDossier')}
        onPress={() => {
          void triggerImpact(ImpactFeedbackStyle.Light);
          onOpen(species.id, index);
        }}
        style={styles.cardBody}>
        <Animated.View style={[styles.stage, cardStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={styles.glow}
            pointerEvents="none">
            <Defs>
              <LinearGradient id={`sky-${species.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={atmosphere.high} stopOpacity={0.16} />
                <Stop offset="42%" stopColor={atmosphere.mid} stopOpacity={0.28} />
                <Stop offset="78%" stopColor={atmosphere.mid} stopOpacity={0.14} />
                <Stop offset="100%" stopColor={atmosphere.low} stopOpacity={0.42} />
              </LinearGradient>
              <RadialGradient id={`ambient-${species.id}`} cx="50" cy="46" r="78" gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor={atmosphere.mid} stopOpacity={0.2} />
                <Stop offset="46%" stopColor={atmosphere.mid} stopOpacity={0.08} />
                <Stop offset="78%" stopColor={atmosphere.low} stopOpacity={0.08} />
                <Stop offset="100%" stopColor={atmosphere.low} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#sky-${species.id})`} />
            <Rect x="0" y="0" width="100" height="100" fill={`url(#ambient-${species.id})`} />
            <Ellipse cx="50" cy="94" rx="42" ry="5.2" fill="#1A120C" opacity={0.22} />
            <Ellipse cx="50" cy="93.2" rx="22" ry="2.4" fill="#1A120C" opacity={0.38} />
          </Svg>

          <Animated.View pointerEvents="none" style={[styles.adultPlane, adultShift]}>
            <DepthSilhouette
              speciesId={species.id}
              stage="adult"
              width={adultWidth}
              height={adultHeight}
              fill={silhouetteFill}
              rim={silhouetteRim}
            />
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.juvenilePlane, juvenileShift]}>
            <DepthSilhouette
              speciesId={species.id}
              stage="juvenile"
              width={babyWidth}
              height={babyHeight}
              fill={silhouetteFill}
              rim={silhouetteRim}
            />
          </Animated.View>

          <View style={styles.eggPlane}>
            <SpeciesEggArt species={species} width={eggWidth} height={eggHeight} />
          </View>
        </Animated.View>

        <Text style={[styles.tag, { color: palette.action }]}>{t(TAG_LABEL[species.tag])}</Text>
        <Text style={[styles.name, { color: palette.text }]}>{species.commonName}</Text>
        <Text style={[styles.scientific, { color: palette.textMuted }]}>{species.scientificName}</Text>
        <Text style={[styles.shell, { color: palette.textMuted }]}>
          {species.egg.description}
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          {t('adoption.meta', {
            days: species.incubationDays,
            temp: species.temperatureTargetCelsius.toFixed(1),
            humidity: species.humidityTargetPct,
          })}
        </Text>
      </Pressable>
    </View>
  );
}

function DepthSilhouette({
  speciesId,
  stage,
  width,
  height,
  fill,
  rim,
}: {
  speciesId: SpeciesId;
  stage: 'juvenile' | 'adult';
  width: number;
  height: number;
  fill: string;
  rim: string;
}) {
  return (
    <View style={styles.silhouetteStack} pointerEvents="none">
      <GrowthSilhouette
        speciesId={speciesId}
        stage={stage}
        width={width}
        height={height}
        fill={fill}
        opacity={0.3}
        rim={rim}
        filterSuffix="plate"
      />
    </View>
  );
}

function usePlaneStyle(
  scrollX: SharedValue<number>,
  index: number,
  interval: number,
  reduceMotion: boolean
) {
  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    const delta = scrollX.value - index * interval;
    const focus = interpolate(Math.abs(delta), [0, interval], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: 0.62 + 0.38 * focus,
      transform: [{ scale: 0.92 + 0.08 * focus }],
    };
  });
}

function useDepthStyle(
  scrollX: SharedValue<number>,
  index: number,
  interval: number,
  reduceMotion: boolean,
  travel: number,
  tilt: number
) {
  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        transform: [{ perspective: 900 }, { rotateY: '0deg' }, { translateX: 0 }, { scale: 1 }],
      };
    }
    const delta = scrollX.value - index * interval;
    const shift = interpolate(delta, [-interval, 0, interval], [travel, 0, -travel], Extrapolation.CLAMP);
    const yaw = interpolate(delta, [-interval, 0, interval], [tilt, 0, -tilt], Extrapolation.CLAMP);
    const depth = interpolate(Math.abs(delta), [0, interval], [1, 0.94], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 900 },
        { rotateY: `${yaw}deg` },
        { translateX: shift },
        { scale: depth },
      ],
    };
  });
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
  row: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardBody: {
    gap: 4,
  },
  stage: {
    height: 252,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.two,
    overflow: 'hidden',
    borderRadius: 18,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  adultPlane: {
    position: 'absolute',
    right: -2,
    bottom: 8,
    zIndex: 1,
  },
  juvenilePlane: {
    position: 'absolute',
    left: -2,
    bottom: 22,
    zIndex: 2,
  },
  silhouetteStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  eggPlane: {
    zIndex: 4,
    marginBottom: 14,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  shell: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
});
