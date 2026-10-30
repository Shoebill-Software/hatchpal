import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ADOPTION_ATMOSPHERE,
  useHatcheryPalette,
  type HatcheryPalette,
} from '@/components/adoptionAtmosphere';
import { EggLockBadge } from '@/components/EggCarousel';
import { fitSilhouette, GrowthSilhouette } from '@/components/GrowthSilhouette';
import { SpeciesEggArt } from '@/components/SpeciesEggArt';
import type { SpeciesConfig, SpeciesId } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';

export interface HatcheryStageProps {
  species: SpeciesConfig;
  canGoBack: boolean;
  canGoForward: boolean;
  locked?: boolean;
  onOpen: () => void;
  onStep: (delta: 1 | -1) => void;
}

export function HatcheryWash({ speciesId }: { speciesId: SpeciesId }) {
  const palette = useHatcheryPalette();
  return (
    <SpeciesCrossfade speciesId={speciesId} render={(id) => <WashPaint speciesId={id} palette={palette} />} />
  );
}

function SpeciesCrossfade({
  speciesId,
  render,
}: {
  speciesId: SpeciesId;
  render: (id: SpeciesId) => ReactNode;
}) {
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
          {render(previous)}
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, frontStyle]}>
        {render(current)}
      </Animated.View>
    </View>
  );
}

export function HatcheryStage({
  species,
  canGoBack,
  canGoForward,
  locked = false,
  onOpen,
  onStep,
}: HatcheryStageProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const palette = useHatcheryPalette();
  const window = useWindowDimensions();
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
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + (breath.value - 0.94) * 1.6,
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const stageWidth = box.width || 320;
  const stageHeight = box.height || 280;
  const eggHeight = Math.round(Math.min(232, Math.max(108, stageHeight * 0.6)));
  const eggWidth = Math.round(eggHeight * (120 / 160));
  const horizonLift = Math.round(eggHeight * 0.26);
  const silhouetteHeight = Math.round(Math.min((stageHeight - horizonLift) * 0.9, eggHeight * 1.48));
  const silhouette = fitSilhouette(species.id, Math.round(stageWidth * 0.94), silhouetteHeight);
  const horizon = stageHeight - horizonLift;
  const backdropWidth = Math.max(stageWidth, window.width);
  const bleed = (backdropWidth - stageWidth) / 2;
  const dark = palette.scheme === 'dark';

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          locked
            ? `${species.commonName}, ${species.scientificName}, ${t('adoption.locked')}`
            : `${species.commonName}, ${species.scientificName}`
        }
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
        {box.width > 0 ? (
          <View pointerEvents="none" style={[styles.backdrop, { left: -bleed, width: backdropWidth }]}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
              <SpeciesCrossfade
                speciesId={species.id}
                render={(id) => (
                  <SkyGlow speciesId={id} palette={palette} width={backdropWidth} height={stageHeight} horizon={horizon} />
                )}
              />
            </Animated.View>
            <SpeciesCrossfade
              speciesId={species.id}
              render={(id) => (
                <Landscape speciesId={id} palette={palette} width={backdropWidth} height={stageHeight} horizon={horizon} />
              )}
            />
          </View>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.art, artStyle]}>
          <View style={[styles.silhouette, { bottom: horizonLift - 1 }]}>
            <GrowthSilhouette
              speciesId={species.id}
              stage="adult"
              width={silhouette.width}
              height={silhouette.height}
              fill={dark ? '#060504' : atmosphere.low}
              opacity={dark ? 0.94 : 0.22}
              fadeTo={dark ? 0.82 : 0.4}
              rim={dark ? atmosphere.rim : undefined}
              rimOpacity={0.34}
              filterSuffix={`hatchery-${palette.scheme}`}
            />
          </View>
          {box.width > 0 ? (
            <Motes
              key={`${species.id}-${palette.scheme}`}
              color={dark ? atmosphere.rim : atmosphere.low}
              glow={dark}
              width={stageWidth}
              horizon={horizon}
              reduceMotion={reduceMotion}
            />
          ) : null}
          <View style={styles.egg}>
            <SpeciesEggArt species={species} width={eggWidth} height={eggHeight} />
          </View>
        </Animated.View>
        {locked ? (
          <View pointerEvents="none" style={styles.lock}>
            <EggLockBadge />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

interface PaintProps {
  speciesId: SpeciesId;
  palette: HatcheryPalette;
  width: number;
  height: number;
  horizon: number;
}

function WashPaint({ speciesId, palette }: { speciesId: SpeciesId; palette: HatcheryPalette }) {
  const atmosphere = ADOPTION_ATMOSPHERE[speciesId];
  const dark = palette.scheme === 'dark';
  const tintId = `wash-tint-${speciesId}-${palette.scheme}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={tintId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={dark ? atmosphere.low : atmosphere.high} stopOpacity={dark ? 0.34 : 0.6} />
          <Stop offset="40%" stopColor={dark ? atmosphere.low : atmosphere.high} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={palette.ground} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${tintId})`} />
    </Svg>
  );
}

/** Dusk or morning light pooling on the horizon line. Breathes as one layer. */
function SkyGlow({ speciesId, palette, width, height, horizon }: PaintProps) {
  const atmosphere = ADOPTION_ATMOSPHERE[speciesId];
  const dark = palette.scheme === 'dark';
  const skyId = `sky-${speciesId}-${palette.scheme}`;
  const bandId = `band-${speciesId}-${palette.scheme}`;
  const peak = dark ? 0.66 : 0.36;
  const bandTop = Math.max(0, horizon - height * 0.22);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2={horizon} gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={atmosphere.mid} stopOpacity={0} />
          <Stop offset="38%" stopColor={atmosphere.mid} stopOpacity={peak * 0.14} />
          <Stop offset="74%" stopColor={atmosphere.mid} stopOpacity={peak * 0.48} />
          <Stop offset="100%" stopColor={atmosphere.mid} stopOpacity={peak} />
        </LinearGradient>
        <LinearGradient id={bandId} x1="0" y1={bandTop} x2="0" y2={horizon} gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={atmosphere.high} stopOpacity={0} />
          <Stop offset="100%" stopColor={atmosphere.high} stopOpacity={dark ? 0.5 : 0.6} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={horizon} fill={`url(#${skyId})`} />
      <Rect x={0} y={bandTop} width={width} height={horizon - bandTop} fill={`url(#${bandId})`} />
    </Svg>
  );
}

/** Two ridgelines, a lit horizon, and the ground the egg rests on. Ridges are seeded per species. */
function Landscape({ speciesId, palette, width, height, horizon }: PaintProps) {
  const atmosphere = ADOPTION_ATMOSPHERE[speciesId];
  const dark = palette.scheme === 'dark';
  const suffix = `${speciesId}-${palette.scheme}`;
  const seed = hashSeed(speciesId);
  const far = ridgePath(seed, width, horizon, Math.min(64, height * 0.18), 6);
  const near = ridgePath(seed ^ 0x9e3779b9, width, horizon, Math.min(30, height * 0.085), 9);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`ground-${suffix}`} x1="0" y1={horizon} x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={dark ? atmosphere.low : atmosphere.high} stopOpacity={dark ? 0.3 : 0.5} />
          <Stop offset="100%" stopColor={dark ? atmosphere.low : atmosphere.high} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`line-${suffix}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={dark ? atmosphere.rim : atmosphere.low} stopOpacity={0} />
          <Stop offset="50%" stopColor={dark ? atmosphere.rim : atmosphere.low} stopOpacity={dark ? 0.6 : 0.3} />
          <Stop offset="100%" stopColor={dark ? atmosphere.rim : atmosphere.low} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={far} fill={dark ? atmosphere.low : atmosphere.mid} opacity={dark ? 0.55 : 0.18} />
      <Path d={near} fill={dark ? palette.ground : atmosphere.low} opacity={dark ? 0.7 : 0.1} />
      <Rect x={0} y={horizon} width={width} height={height - horizon} fill={`url(#ground-${suffix})`} />
      <Rect x={0} y={horizon - 0.5} width={width} height={1} fill={`url(#line-${suffix})`} />
    </Svg>
  );
}

const MOTES = [
  { x: 0.08, y: 0.1, size: 2.6, rise: 70, duration: 7200, delay: 0, sway: 8 },
  { x: 0.17, y: 0.42, size: 1.8, rise: 52, duration: 6100, delay: 1800, sway: -6 },
  { x: 0.26, y: 0.2, size: 3, rise: 88, duration: 8400, delay: 3400, sway: 10 },
  { x: 0.34, y: 0.6, size: 2, rise: 60, duration: 6800, delay: 900, sway: -8 },
  { x: 0.43, y: 0.05, size: 1.6, rise: 46, duration: 5600, delay: 4200, sway: 5 },
  { x: 0.58, y: 0.5, size: 2.4, rise: 74, duration: 7600, delay: 2400, sway: -10 },
  { x: 0.66, y: 0.15, size: 1.8, rise: 58, duration: 6400, delay: 600, sway: 7 },
  { x: 0.75, y: 0.7, size: 3.2, rise: 92, duration: 9000, delay: 3000, sway: -9 },
  { x: 0.84, y: 0.32, size: 2.2, rise: 64, duration: 7000, delay: 1400, sway: 6 },
  { x: 0.92, y: 0.08, size: 1.8, rise: 50, duration: 6000, delay: 4800, sway: -5 },
] as const;

/** Fireflies at dusk, drifting pollen by day. */
function Motes({
  color,
  glow,
  width,
  horizon,
  reduceMotion,
}: {
  color: string;
  glow: boolean;
  width: number;
  horizon: number;
  reduceMotion: boolean;
}) {
  if (reduceMotion) {
    return null;
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {MOTES.map((mote) => (
        <Mote
          key={`${mote.x}-${mote.y}`}
          mote={mote}
          color={color}
          glow={glow}
          left={mote.x * width}
          top={horizon - 8 - mote.y * 70}
        />
      ))}
    </View>
  );
}

function Mote({
  mote,
  color,
  glow,
  left,
  top,
}: {
  mote: (typeof MOTES)[number];
  color: string;
  glow: boolean;
  left: number;
  top: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      mote.delay,
      withRepeat(withTiming(1, { duration: mote.duration, easing: Easing.linear }), -1, false)
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [mote.delay, mote.duration, progress]);

  const peak = glow ? 0.9 : 0.42;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.22, 0.7, 1], [0, peak, peak * 0.7, 0]),
    transform: [
      { translateY: -mote.rise * progress.value },
      { translateX: mote.sway * Math.sin(progress.value * Math.PI * 2) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.mote,
        {
          left,
          top,
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: glow ? 0.9 : 0,
          shadowRadius: glow ? mote.size * 1.8 : 0,
        },
        style,
      ]}
    />
  );
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridgePath(seed: number, width: number, base: number, amplitude: number, segments: number): string {
  const random = seededRandom(seed);
  const span = width * 1.1;
  const points = Array.from({ length: segments + 1 }, (_, index) => ({
    x: -width * 0.05 + (span * index) / segments,
    y: base - amplitude * (0.3 + 0.7 * random()),
  }));
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return '';
  }
  let d = `M${first.x.toFixed(1)} ${(base + 1).toFixed(1)} L${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    if (!point || !next) {
      continue;
    }
    const midX = (point.x + next.x) / 2;
    const midY = (point.y + next.y) / 2;
    d += ` Q${point.x.toFixed(1)} ${point.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  d += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)} L${last.x.toFixed(1)} ${(base + 1).toFixed(1)} Z`;
  return d;
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
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
  lock: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
  },
  mote: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
  },
  egg: {
    marginBottom: 12,
  },
});
