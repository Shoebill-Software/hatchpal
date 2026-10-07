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
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { RosterTag, SpeciesConfig, SpeciesId } from '@/domain/types';
import { localizeCopy, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { GrowthSilhouette } from './GrowthSilhouette';
import { SpeciesEggArt } from './SpeciesEggArt';

const TAG_LABEL: Record<RosterTag, TranslationKey> = {
  galliform: 'taxon.galliform',
  raptor: 'taxon.raptor',
  strigiform: 'taxon.strigiform',
  waterfowl: 'taxon.waterfowl',
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
          onSelect={onSelect}
          onInspect={onInspect}
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
  onSelect: (id: SpeciesId) => void;
  onInspect: (id: SpeciesId) => void;
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
  onSelect,
  onInspect,
}: CarouselCardProps) {
  const palette = useNestPalette();
  const { t, locale } = useTranslation();
  const cardStyle = usePlaneStyle(scrollX, index, interval, reduceMotion, 16);
  const juvenileShift = useParallaxStyle(scrollX, index, interval, reduceMotion, 28);
  const adultShift = useParallaxStyle(scrollX, index, interval, reduceMotion, 46);
  const eggWidth = Math.min(132, cardWidth * 0.4);
  const eggHeight = eggWidth * 1.28;

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
        accessibilityLabel={localizeCopy(species.commonName, locale)}
        onPress={() => onSelect(species.id)}
        style={styles.cardBody}>
        <Animated.View style={[styles.stage, cardStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.glow} pointerEvents="none">
            <Defs>
              <RadialGradient id={`glow-${species.id}`} cx="50" cy="58" r="48" gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor={species.growth.glow} stopOpacity={0.72} />
                <Stop offset="55%" stopColor={species.growth.glow} stopOpacity={0.22} />
                <Stop offset="100%" stopColor={species.growth.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="58" rx="48" ry="42" fill={`url(#glow-${species.id})`} />
          </Svg>

          <Animated.View pointerEvents="none" style={[styles.adultPlane, adultShift]}>
            <GrowthSilhouette
              speciesId={species.id}
              stage="adult"
              width={eggWidth * 1.35}
              height={eggHeight * 1.22}
              fill={species.growth.shadow}
            />
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.juvenilePlane, juvenileShift]}>
            <GrowthSilhouette
              speciesId={species.id}
              stage="juvenile"
              width={eggWidth * 0.78}
              height={eggHeight * 0.72}
              fill={species.growth.shadow}
            />
          </Animated.View>

          <View style={styles.eggPlane}>
            <SpeciesEggArt species={species} width={eggWidth} height={eggHeight} />
          </View>
        </Animated.View>

        <Text style={[styles.tag, { color: palette.action }]}>{t(TAG_LABEL[species.tag])}</Text>
        <Text style={[styles.name, { color: palette.text }]}>{localizeCopy(species.commonName, locale)}</Text>
        <Text style={[styles.scientific, { color: palette.textMuted }]}>{species.scientificName}</Text>
        <Text style={[styles.shell, { color: palette.textMuted }]}>
          {localizeCopy(species.egg.description, locale)}
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          {t('adoption.meta', {
            days: species.incubationDays,
            temp: species.temperatureTargetCelsius.toFixed(1),
            humidity: species.humidityTargetPct,
          })}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('adoption.inspectGrowth')}
        onPress={() => {
          void triggerImpact(ImpactFeedbackStyle.Light);
          onSelect(species.id);
          onInspect(species.id);
        }}
        style={[styles.inspect, { borderColor: palette.border }]}>
        <Text style={[styles.inspectLabel, { color: palette.text }]}>{t('adoption.inspectGrowth')}</Text>
      </Pressable>
    </View>
  );
}

function usePlaneStyle(
  scrollX: SharedValue<number>,
  index: number,
  interval: number,
  reduceMotion: boolean,
  parallax: number
) {
  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ translateX: 0 }, { scale: 1 }] };
    }
    const delta = scrollX.value - index * interval;
    const focus = interpolate(Math.abs(delta), [0, interval], [1, 0], Extrapolation.CLAMP);
    const scale = 0.9 + 0.1 * focus;
    const shift = interpolate(delta, [-interval, 0, interval], [parallax, 0, -parallax], Extrapolation.CLAMP);
    return {
      opacity: 0.55 + 0.45 * focus,
      transform: [{ translateX: shift }, { scale }],
    };
  });
}

function useParallaxStyle(
  scrollX: SharedValue<number>,
  index: number,
  interval: number,
  reduceMotion: boolean,
  parallax: number
) {
  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ translateX: 0 }] };
    }
    const delta = scrollX.value - index * interval;
    const shift = interpolate(delta, [-interval, 0, interval], [parallax, 0, -parallax], Extrapolation.CLAMP);
    return { transform: [{ translateX: shift }] };
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
    height: 236,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.two,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  adultPlane: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    zIndex: 1,
    opacity: 0.2,
  },
  juvenilePlane: {
    position: 'absolute',
    left: 0,
    bottom: 28,
    zIndex: 2,
    opacity: 0.35,
  },
  eggPlane: {
    zIndex: 3,
    marginBottom: 6,
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
  inspect: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
