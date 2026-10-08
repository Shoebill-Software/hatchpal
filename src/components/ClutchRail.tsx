import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { ADOPTION_ATMOSPHERE } from '@/components/adoptionAtmosphere';
import { SpeciesEggArt } from '@/components/SpeciesEggArt';
import type { SpeciesConfig, SpeciesId } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

const STRIDE = 76;
const RAIL_HEIGHT = 104;
const EGG_WIDTH = 46;
const EGG_HEIGHT = 60;

export interface ClutchRailProps {
  species: readonly SpeciesConfig[];
  selectedId: SpeciesId;
  onSelect: (id: SpeciesId) => void;
}

export function ClutchRail({ species, selectedId, onSelect }: ClutchRailProps) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const listRef = useRef<ScrollView>(null);
  const hasMounted = useRef(false);
  const inset = Math.max(0, (width - STRIDE) / 2);
  const listKey = species.map((item) => item.id).join('|');

  useEffect(() => {
    const index = species.findIndex((item) => item.id === selectedId);
    if (index < 0) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        x: index * STRIDE,
        animated: hasMounted.current && !reduceMotion,
      });
      hasMounted.current = true;
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [inset, listKey, reduceMotion, selectedId, species]);

  return (
    <ScrollView
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
      style={styles.rail}>
      {species.map((item) => (
        <ClutchEgg
          key={item.id}
          species={item}
          selected={item.id === selectedId}
          reduceMotion={reduceMotion}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

function ClutchEgg({
  species,
  selected,
  reduceMotion,
  onSelect,
}: {
  species: SpeciesConfig;
  selected: boolean;
  reduceMotion: boolean;
  onSelect: (id: SpeciesId) => void;
}) {
  const { t } = useTranslation();
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  const scale = useSharedValue(selected ? 1.14 : 0.92);
  const lift = useSharedValue(selected ? -8 : 2);
  const opacity = useSharedValue(selected ? 1 : 0.62);
  const glow = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 280;
    const easing = Easing.out(Easing.cubic);
    scale.value = withTiming(selected ? 1.14 : 0.92, { duration, easing });
    lift.value = withTiming(selected ? -8 : 2, { duration, easing });
    opacity.value = withTiming(selected ? 1 : 0.62, { duration, easing });
    glow.value = withTiming(selected ? 1 : 0, { duration, easing });
  }, [glow, lift, opacity, reduceMotion, scale, selected]);

  const eggStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={species.commonName}
      accessibilityHint={selected ? t('adoption.openDossier') : t('adoption.selectEgg')}
      onPress={() => {
        if (!selected) {
          void triggerImpact(ImpactFeedbackStyle.Light);
        }
        onSelect(species.id);
      }}
      style={styles.hit}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
        <Svg width={78} height={78} viewBox="0 0 78 78">
          <Defs>
            <RadialGradient id={`clutch-${species.id}`} cx="39" cy="44" r="30" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={atmosphere.high} stopOpacity={0.95} />
              <Stop offset="55%" stopColor={atmosphere.mid} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={atmosphere.low} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="39" cy="46" rx="28" ry="18" fill={`url(#clutch-${species.id})`} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={eggStyle}>
        <SpeciesEggArt species={species} width={EGG_WIDTH} height={EGG_HEIGHT} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: RAIL_HEIGHT,
    flexGrow: 0,
  },
  row: {
    alignItems: 'center',
  },
  hit: {
    width: STRIDE,
    height: RAIL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
