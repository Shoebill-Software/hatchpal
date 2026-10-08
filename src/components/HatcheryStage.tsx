import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ADOPTION_ATMOSPHERE, HATCHERY, type AdoptionAtmosphere } from '@/components/adoptionAtmosphere';
import { fitSilhouette, GrowthSilhouette } from '@/components/GrowthSilhouette';
import { SpeciesEggArt } from '@/components/SpeciesEggArt';
import type { SpeciesConfig, SpeciesId } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';

export interface HatcheryStageProps {
  species: SpeciesConfig;
  canGoBack: boolean;
  canGoForward: boolean;
  onOpen: () => void;
  onStep: (delta: 1 | -1) => void;
}

export function HatcheryWash({ speciesId }: { speciesId: SpeciesId }) {
  const reduceMotion = useReduceMotion();
  const blend = useSharedValue(1);
  const [current, setCurrent] = useState(speciesId);
  const [previous, setPrevious] = useState<SpeciesId | null>(null);

  if (speciesId !== current) {
    setPrevious(current);
    setCurrent(speciesId);
    blend.value = reduceMotion ? 1 : 0;
  }

  useEffect(() => {
    if (previous == null || reduceMotion) {
      blend.value = 1;
      return;
    }
    blend.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
  }, [blend, current, previous, reduceMotion]);

  const frontStyle = useAnimatedStyle(() => ({ opacity: blend.value }));
  const backStyle = useAnimatedStyle(() => ({ opacity: 1 - blend.value }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {previous ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backStyle]}>
          <WashPaint speciesId={previous} />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, frontStyle]}>
        <WashPaint speciesId={current} />
      </Animated.View>
    </View>
  );
}

export function HatcheryStage({ species, canGoBack, canGoForward, onOpen, onStep }: HatcheryStageProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const atmosphere = ADOPTION_ATMOSPHERE[species.id];
  const [box, setBox] = useState({ width: 0, height: 0 });
  const drag = useSharedValue(0);
  const presence = useSharedValue(1);
  const pressed = useSharedValue(1);
  const breath = useSharedValue(1);
  const canPrev = useSharedValue(canGoBack);
  const canNext = useSharedValue(canGoForward);
  const reduceMotionSV = useSharedValue(reduceMotion);
  const seen = useRef<SpeciesId | null>(null);
  const stepRef = useRef(onStep);
  const openRef = useRef(onOpen);
  stepRef.current = onStep;
  openRef.current = onOpen;

  const stepBy = useCallback((delta: number) => {
    stepRef.current(delta < 0 ? -1 : 1);
  }, []);
  const openBy = useCallback(() => {
    openRef.current();
  }, []);

  useEffect(() => {
    canPrev.value = canGoBack;
    canNext.value = canGoForward;
  }, [canGoBack, canGoForward, canNext, canPrev]);

  useEffect(() => {
    reduceMotionSV.value = reduceMotion;
  }, [reduceMotion, reduceMotionSV]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(breath);
    };
  }, [breath, reduceMotion]);

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
    presence.value = 0.45;
    presence.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [presence, reduceMotion, species.id]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .activeOffsetX([-18, 18])
      .failOffsetY([-28, 28])
      .onUpdate((event) => {
        if (reduceMotionSV.value) {
          return;
        }
        let x = event.translationX * 0.18;
        if (x > 0 && !canPrev.value) {
          x *= 0.25;
        }
        if (x < 0 && !canNext.value) {
          x *= 0.25;
        }
        drag.value = Math.max(-20, Math.min(20, x));
      })
      .onEnd((event) => {
        const next = (event.translationX < -46 || event.velocityX < -780) && canNext.value;
        const prev = (event.translationX > 46 || event.velocityX > 780) && canPrev.value;
        if (next) {
          scheduleOnRN(stepBy, 1);
        } else if (prev) {
          scheduleOnRN(stepBy, -1);
        }
      })
      .onFinalize(() => {
        drag.value = withTiming(0, { duration: reduceMotionSV.value ? 0 : 240 });
      });

    const tap = Gesture.Tap()
      .maxDuration(450)
      .maxDistance(16)
      .onBegin(() => {
        pressed.value = withTiming(0.975, { duration: 90 });
      })
      .onEnd((_event, success) => {
        if (success) {
          scheduleOnRN(openBy);
        }
      })
      .onFinalize(() => {
        pressed.value = withTiming(1, { duration: 160 });
      });

    return Gesture.Exclusive(pan, tap);
  }, [canNext, canPrev, drag, openBy, pressed, reduceMotionSV, stepBy]);

  const artStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + presence.value * 0.45,
    transform: [
      { translateX: drag.value },
      { translateY: (1 - presence.value) * 16 },
      { scale: (0.965 + presence.value * 0.035) * pressed.value },
    ],
  }));
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + (breath.value - 0.94) * 2.2,
    transform: [{ scale: breath.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const eggHeight = Math.round(Math.min(232, Math.max(108, (box.height || 220) * 0.6)));
  const eggWidth = Math.round(eggHeight * (120 / 160));
  const silhouetteHeight = Math.round(Math.min((box.height || 280) * 0.88, eggHeight * 1.48));
  const silhouette = fitSilhouette(
    species.id,
    Math.round((box.width || 320) * 0.96),
    silhouetteHeight,
  );
  const eggCenter = 12 + eggHeight / 2;
  const lowAnimal = silhouette.height < eggHeight * 0.92;
  const silhouetteBottom = lowAnimal
    ? Math.max(8, Math.round(eggCenter - silhouette.height / 2))
    : Math.round(eggHeight * 0.22);
  const glowSize = Math.round(eggWidth * 2.15);

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${species.commonName}, ${species.scientificName}`}
        accessibilityHint={t('adoption.openDossier')}
        accessibilityActions={[
          { name: 'activate', label: t('adoption.openDossier') },
          { name: 'increment', label: t('adoption.nextEgg') },
          { name: 'decrement', label: t('adoption.previousEgg') },
        ]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'increment') {
            onStep(1);
            return;
          }
          if (action === 'decrement') {
            onStep(-1);
            return;
          }
          if (action === 'activate') {
            onOpen();
          }
        }}
        onLayout={onLayout}
        style={styles.stage}>
        <Animated.View pointerEvents="none" style={[styles.art, artStyle]}>
          <View style={[styles.silhouette, { bottom: silhouetteBottom }]}>
            <GrowthSilhouette
              speciesId={species.id}
              stage="adult"
              width={silhouette.width}
              height={silhouette.height}
              fill={HATCHERY.ink}
              opacity={0.2}
              rim={atmosphere.rim}
              filterSuffix="hatchery"
            />
          </View>
          <Animated.View
            style={[
              styles.glow,
              {
                width: glowSize,
                height: glowSize,
                marginLeft: -glowSize / 2,
                bottom: eggHeight * 0.02,
              },
              breathStyle,
            ]}>
            <HabitatGlow speciesId={species.id} atmosphere={atmosphere} />
          </Animated.View>
          <View style={styles.bowl}>
            <NestBowl width={Math.round(eggWidth * 1.55)} shadow={species.egg.nest.castShadow} />
          </View>
          <View style={styles.egg}>
            <SpeciesEggArt species={species} width={eggWidth} height={eggHeight} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function WashPaint({ speciesId }: { speciesId: SpeciesId }) {
  const atmosphere = ADOPTION_ATMOSPHERE[speciesId];
  const glowId = `wash-glow-${speciesId}`;
  const scrimId = `wash-scrim-${speciesId}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={glowId} cx="50" cy="40" r="42" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={atmosphere.high} stopOpacity={0.95} />
          <Stop offset="32%" stopColor={atmosphere.mid} stopOpacity={0.62} />
          <Stop offset="68%" stopColor={atmosphere.low} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={atmosphere.low} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={HATCHERY.ground} stopOpacity={0.82} />
          <Stop offset="16%" stopColor={HATCHERY.ground} stopOpacity={0.28} />
          <Stop offset="40%" stopColor={HATCHERY.ground} stopOpacity={0} />
          <Stop offset="62%" stopColor={HATCHERY.ground} stopOpacity={0.42} />
          <Stop offset="80%" stopColor={HATCHERY.ground} stopOpacity={0.86} />
          <Stop offset="100%" stopColor={HATCHERY.ground} stopOpacity={0.96} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={HATCHERY.ground} />
      <Ellipse cx="50" cy="42" rx="62" ry="34" fill={`url(#${glowId})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${scrimId})`} />
    </Svg>
  );
}

function HabitatGlow({ speciesId, atmosphere }: { speciesId: SpeciesId; atmosphere: AdoptionAtmosphere }) {
  const id = `habitat-${speciesId}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="58" r="46" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={atmosphere.high} stopOpacity={0.9} />
          <Stop offset="38%" stopColor={atmosphere.mid} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={atmosphere.low} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="62" rx="42" ry="30" fill={`url(#${id})`} />
    </Svg>
  );
}

function NestBowl({ width, shadow }: { width: number; shadow: string }) {
  const height = Math.round(width * 0.28);
  return (
    <Svg width={width} height={height} viewBox="0 0 200 56">
      <Ellipse cx="100" cy="30" rx="74" ry="16" fill={shadow} opacity={0.38} />
      <Ellipse cx="100" cy="27" rx="52" ry="8" fill={HATCHERY.ink} opacity={0.07} />
      <Path
        d="M32 26 C52 42 148 42 168 26"
        stroke={HATCHERY.ink}
        strokeOpacity={0.28}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  art: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  silhouette: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    left: '50%',
  },
  bowl: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    alignItems: 'center',
  },
  egg: {
    marginBottom: 12,
  },
});
