import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { HumidityStatus, NestTemper, TemperatureStatus } from '@/domain/climateEngine';
import type { PetSnapshot, SpeciesConfig } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  triggerImpact,
  triggerNotification,
} from '@/services/hapticFeedback';
import { resolveShellTapEffect } from '@/services/soundCues';

export const EGG_FRAME = { width: 220, height: 278 } as const;

const EGG_VIEWBOX = { width: 196, height: 248 };
const EGG_POLE_Y = 204;
export const EGG_OUTLINE =
  'M98 28 C58 28 40 92 40 128 C40 178 64 204 98 204 C132 204 156 178 156 128 C156 92 138 28 98 28 Z';
const HOLD_MS = 450;

export interface EggContainerProps {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
  vitalityScore: number;
  inSweetSpot: boolean;
  temper: NestTemper;
  temperatureStatus: TemperatureStatus;
  humidityStatus: HumidityStatus;
  heartRate: number;
  warmPulse: number;
  mistPulse: number;
  accessibilityLabel: string;
  accessibilityHint: string;
  candleLabel: string;
  onCandle: () => void;
  /** Fires after the shell-tap feedback, for lullabies and the tutorial. */
  onTap?: () => void;
  /** Each increment makes the egg hop for joy. */
  cheerPulse?: number;
  /** Warm glow under the egg while the player holds the brood button. */
  brooding?: boolean;
  /** Shrinks the egg to the measured hero slot. 1 is the design size. */
  fitScale?: number;
}

export function EggContainer({
  snapshot,
  species,
  vitalityScore,
  inSweetSpot,
  temper,
  temperatureStatus,
  humidityStatus,
  heartRate,
  warmPulse,
  mistPulse,
  accessibilityLabel,
  accessibilityHint,
  candleLabel,
  onCandle,
  onTap,
  cheerPulse = 0,
  brooding = false,
  fitScale = 1,
}: EggContainerProps) {
  const { play } = useSoundEffects();
  const reduceMotion = useReduceMotion();
  const layout = resolveScale(fitScale);
  const eggWidth = EGG_FRAME.width * layout;
  const eggHeight = EGG_FRAME.height * layout;
  const scale = useSharedValue(1);
  const wiggle = useSharedValue(0);
  const shiver = useSharedValue(0);
  const lean = useSharedValue(0);
  const hold = useSharedValue(1);
  const hop = useSharedValue(0);
  const vitality = clampUnit(vitalityScore);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primed = useRef(false);
  const candleGate = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current != null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const playTapMotion = useCallback(() => {
    scale.value = withSequence(withTiming(1.06, { duration: 80 }), withSpring(1, { damping: 12, stiffness: 220 }));
    wiggle.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 80 }),
      withTiming(-2.5, { duration: 70 }),
      withTiming(0, { duration: 90 })
    );
  }, [scale, wiggle]);

  const handleTap = useCallback(() => {
    if (candleGate.current) {
      return;
    }
    clearHoldTimer();
    const alreadyTicked = primed.current;
    primed.current = false;
    if (!alreadyTicked) {
      if (snapshot.isHatched || snapshot.isReadyToHatch) {
        void triggerNotification(NotificationFeedbackType.Success);
      } else if (snapshot.isPipped) {
        void triggerImpact(ImpactFeedbackStyle.Medium);
      } else {
        void triggerImpact(ImpactFeedbackStyle.Light);
      }
    }
    play(resolveShellTapEffect(snapshot));
    if (snapshot.currentMilestone.stage === 'internal_pip') {
      play('internal_peep');
    }
    playTapMotion();
    onTap?.();
  }, [clearHoldTimer, onTap, play, playTapMotion, snapshot]);

  useEffect(() => {
    if (cheerPulse <= 0) {
      return;
    }
    if (reduceMotion) {
      scale.value = withSequence(withTiming(1.05, { duration: 120 }), withTiming(1, { duration: 220 }));
      return;
    }
    hop.value = withSequence(
      withTiming(-16 * layout, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 7, stiffness: 260 }),
      withTiming(-7 * layout, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 9, stiffness: 260 })
    );
    wiggle.value = withSequence(
      withTiming(-6, { duration: 90 }),
      withTiming(6, { duration: 120 }),
      withTiming(-3, { duration: 100 }),
      withTiming(0, { duration: 120 })
    );
  }, [cheerPulse]);

  const armHold = useCallback(() => {
    clearHoldTimer();
    primed.current = false;
    candleGate.current = false;
    holdTimer.current = setTimeout(() => {
      primed.current = true;
      void triggerImpact(ImpactFeedbackStyle.Light);
    }, 80);
  }, [clearHoldTimer]);

  const activateCandle = useCallback(() => {
    if (candleGate.current) {
      return;
    }
    candleGate.current = true;
    clearHoldTimer();
    primed.current = false;
    void triggerImpact(ImpactFeedbackStyle.Medium);
    onCandle();
    setTimeout(() => {
      candleGate.current = false;
    }, 700);
  }, [clearHoldTimer, onCandle]);

  const disarmHold = useCallback(() => {
    clearHoldTimer();
  }, [clearHoldTimer]);

  useEffect(() => clearHoldTimer, [clearHoldTimer]);

  const shivering =
    temperatureStatus === 'too_cold' && (temper === 'chilly' || temper === 'fussy' || temper === 'on_strike');

  useEffect(() => {
    const struck = temper === 'on_strike';
    lean.value = reduceMotion ? (struck ? -7 : 0) : withTiming(struck ? -7 : 0, { duration: struck ? 420 : 280 });
    if (!shivering || reduceMotion) {
      cancelAnimation(shiver);
      shiver.value = withTiming(0, { duration: reduceMotion ? 1 : 180 });
      return;
    }
    shiver.value = withRepeat(
      withSequence(
        withTiming(-2.4, { duration: 70 }),
        withTiming(2.4, { duration: 70 }),
        withTiming(-1.6, { duration: 60 }),
        withTiming(0, { duration: 80 }),
        withDelay(1500, withTiming(0, { duration: 1 }))
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(shiver);
    };
  }, [lean, reduceMotion, shiver, shivering, temper]);

  const tapRef = useRef(handleTap);
  const candleRef = useRef(activateCandle);
  const armRef = useRef(armHold);
  const disarmRef = useRef(disarmHold);
  tapRef.current = handleTap;
  candleRef.current = activateCandle;
  armRef.current = armHold;
  disarmRef.current = disarmHold;

  const invokeTap = useCallback(() => {
    tapRef.current();
  }, []);
  const invokeCandle = useCallback(() => {
    candleRef.current();
  }, []);
  const invokeArm = useCallback(() => {
    armRef.current();
  }, []);
  const invokeDisarm = useCallback(() => {
    disarmRef.current();
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Exclusive(
        Gesture.LongPress()
          .minDuration(HOLD_MS)
          .maxDistance(28)
          .onBegin(() => {
            hold.value = withTiming(1.035, { duration: HOLD_MS });
            scheduleOnRN(invokeArm);
          })
          .onStart(() => {
            scheduleOnRN(invokeCandle);
          })
          .onFinalize(() => {
            hold.value = withSpring(1, { damping: 14, stiffness: 180 });
            scheduleOnRN(invokeDisarm);
          }),
        Gesture.Tap()
          .maxDuration(500)
          .maxDistance(28)
          .onEnd((_event, success) => {
            if (success) {
              scheduleOnRN(invokeTap);
            }
          })
      ),
    [hold, invokeArm, invokeCandle, invokeDisarm, invokeTap]
  );

  const eggStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hop.value },
      { rotateZ: `${wiggle.value + shiver.value + lean.value}deg` },
      { scale: scale.value * hold.value },
    ],
  }));
  const shell = species.egg.nest;
  const crackOpacity = snapshot.isPipped
    ? snapshot.currentMilestone.stage === 'external_pip'
      ? 1
      : 0.78
    : 0;
  const hatchCrack = snapshot.isReadyToHatch || snapshot.currentMilestone.stage === 'external_pip';
  const showHeart = inSweetSpot && heartRate > 0;
  const sulking = temper !== 'content';
  const chalky = sulking && humidityStatus === 'dry';
  const coolWash = sulking && temperatureStatus === 'too_cold';
  const warmWash = sulking && temperatureStatus === 'too_warm';

  return (
    <View style={styles.stage}>
      <View style={[styles.hero, { width: eggWidth, height: eggHeight }]}>
        <BroodGlow active={brooding} width={eggWidth} height={eggHeight} reduceMotion={reduceMotion} />
        <GestureDetector gesture={gesture}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityHint={accessibilityHint}
            accessibilityLabel={accessibilityLabel}
            accessibilityActions={[
              { name: 'activate', label: accessibilityHint },
              { name: 'longpress', label: candleLabel },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'longpress') {
                activateCandle();
                return;
              }
              handleTap();
            }}
            style={[styles.eggHit, eggStyle, { width: eggWidth, height: eggHeight }]}>
            <Svg width={eggWidth} height={eggHeight} viewBox={`0 0 ${EGG_VIEWBOX.width} ${EGG_VIEWBOX.height}`}>
              <Path d={EGG_OUTLINE} fill={shell.body} stroke={shell.stroke} strokeWidth="1.4" />
              {chalky ? <Path d={EGG_OUTLINE} fill="#E4DCCF" opacity={temper === 'on_strike' ? 0.34 : 0.2} /> : null}
              {coolWash ? <Path d={EGG_OUTLINE} fill="#8FB4C8" opacity={0.16} /> : null}
              {warmWash ? <Path d={EGG_OUTLINE} fill="#F0B56A" opacity={0.14} /> : null}
              {inSweetSpot ? (
                <Path
                  d="M98 28 C58 28 40 92 40 128 C40 178 64 204 98 204 C132 204 156 178 156 128 C156 92 138 28 98 28 Z"
                  fill="#F6C56A"
                  opacity={0.08 + 0.12 * vitality}
                />
              ) : null}
              <Path
                d="M78 46 C66 78 64 112 78 138"
                stroke={shell.highlight}
                strokeWidth="8"
                strokeLinecap="round"
                opacity={inSweetSpot ? 0.42 : 0.28}
                fill="none"
              />
              <Ellipse cx="74" cy="86" rx="5" ry="3.4" fill={shell.speckle} opacity={0.35} />
              <Ellipse cx="118" cy="102" rx="4.2" ry="2.8" fill={shell.speckle} opacity={0.28} />
              <Ellipse cx="92" cy="128" rx="3.4" ry="2.4" fill={shell.speckle} opacity={0.22} />
              <Ellipse cx="124" cy="148" rx="3.8" ry="2.6" fill={shell.speckle} opacity={0.3} />
              <Path
                d="M108 46 L116 64 L110 82 L122 98"
                stroke={shell.crack}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
                opacity={crackOpacity}
              />
              <Path
                d="M90 52 L84 70 L92 86"
                stroke={shell.crack}
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
                opacity={crackOpacity * 0.85}
              />
              <Path
                d="M118 58 L126 74 L118 90 L130 108"
                stroke={shell.crack}
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
                opacity={crackOpacity * 0.7}
              />
              {hatchCrack ? (
                <Path
                  d="M104 40 L128 58 L118 78 L138 96 L126 118"
                  stroke={shell.crack}
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.92}
                />
              ) : null}
            </Svg>
          </Animated.View>
        </GestureDetector>

        {showHeart ? <EmbryoHeart bpm={heartRate} reduceMotion={reduceMotion} scale={layout} /> : null}

        {warmPulse > 0 ? <SunBurst key={`sun-${warmPulse}`} eggWidth={eggWidth} reduceMotion={reduceMotion} /> : null}

        {mistPulse > 0 ? <RainBurst key={`rain-${mistPulse}`} eggWidth={eggWidth} reduceMotion={reduceMotion} /> : null}
      </View>
    </View>
  );
}

function EmbryoHeart({ bpm, reduceMotion, scale }: { bpm: number; reduceMotion: boolean; scale: number }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || bpm <= 0) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    const interval = Math.max(280, (60 / bpm) * 1000);
    const beat = Math.min(180, interval * 0.28);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: beat, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: Math.max(40, interval - beat), easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [bpm, pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const size = 20 * scale;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.heart, { top: 12 * scale }, style]}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 22 20">
        <Path
          d="M11 17 C4 12 2 8 4.2 5.2 C6 2.8 9 3.2 11 6 C13 3.2 16 2.8 17.8 5.2 C20 8 18 12 11 17 Z"
          fill="#F0C56A"
        />
      </Svg>
    </Animated.View>
  );
}

function BroodGlow({
  active,
  width,
  height,
  reduceMotion,
}: {
  active: boolean;
  width: number;
  height: number;
  reduceMotion: boolean;
}) {
  const presence = useSharedValue(0);
  const breath = useSharedValue(1);

  useEffect(() => {
    presence.value = withTiming(active ? 1 : 0, { duration: active ? 260 : 520 });
    if (!active || reduceMotion) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 520, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(breath);
    };
  }, [active, breath, presence, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ scale: breath.value }],
  }));
  const size = Math.max(width, height) * 1.35;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.broodGlow, { width: size, height: size, left: (width - size) / 2, top: (height - size) / 2 }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="brood-glow" cx={size / 2} cy={size * 0.56} r={size * 0.46} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFB347" stopOpacity={0.62} />
            <Stop offset="45%" stopColor="#F59A3A" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#E9722C" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size * 0.56} rx={size * 0.46} ry={size * 0.42} fill="url(#brood-glow)" />
      </Svg>
    </Animated.View>
  );
}

/** Effect canvas in egg viewBox units, extended above and beside the egg. */
const FX = { left: -40, top: -84, width: 276, height: 332 } as const;
const SKY = { x: 98 - FX.left, y: -28 - FX.top } as const;
const EGG_CENTER_X = 98;
const EGG_HALF_WIDTH = 58;
const EGG_WIDEST_Y = 128;
const SUN_RAYS = Array.from({ length: 12 }, (_, index) => index * 30);
const SUN_BEAMS = [
  { spread: -78, width: 10 },
  { spread: -48, width: 16 },
  { spread: -20, width: 12 },
  { spread: 6, width: 20 },
  { spread: 32, width: 12 },
  { spread: 58, width: 16 },
  { spread: 84, width: 9 },
] as const;
const RAIN_LANES = [56, 118, 84, 140, 70, 102, 48, 128, 92, 62, 146, 110, 78, 134, 96, 54, 124, 66, 150, 88, 106, 74, 138, 100];
const RAIN_DROPS = RAIN_LANES.map((x, index) => ({
  x,
  delay: 100 + index * 46 + ((index * 37) % 5) * 12,
  duration: 360 + ((index * 53) % 7) * 18,
  bead: index % 4 === 1,
}));
const RAIN = 'rgba(122, 176, 212, 0.92)';

function fxFrame(eggWidth: number) {
  const unit = eggWidth / EGG_VIEWBOX.width;
  return {
    unit,
    style: {
      left: FX.left * unit,
      top: FX.top * unit,
      width: FX.width * unit,
      height: FX.height * unit,
    },
  };
}

/** Upper-left shell contour sampled from `EGG_OUTLINE` (98,28 → 40,128). The egg is mirror-symmetric. */
const SHELL_CONTOUR = Array.from({ length: 41 }, (_, index) => {
  const t = index / 40;
  const u = 1 - t;
  return {
    x: u * u * u * 98 + 3 * u * u * t * 58 + 3 * u * t * t * 40 + t * t * t * 40,
    y: u * u * u * 28 + 3 * u * u * t * 28 + 3 * u * t * t * 92 + t * t * t * EGG_WIDEST_Y,
  };
});

/** Where a falling drop meets the shell, or the nest floor beside it. */
function landingY(x: number): number {
  const offset = Math.abs(x - EGG_CENTER_X);
  if (offset >= EGG_HALF_WIDTH) {
    return EGG_POLE_Y;
  }
  const target = EGG_CENTER_X - offset;
  for (let index = 1; index < SHELL_CONTOUR.length; index += 1) {
    const a = SHELL_CONTOUR[index - 1];
    const b = SHELL_CONTOUR[index];
    if (a && b && target <= a.x && target >= b.x) {
      const span = a.x - b.x;
      return span > 0 ? a.y + ((a.x - target) / span) * (b.y - a.y) : a.y;
    }
  }
  return EGG_WIDEST_Y;
}

function SunBurst({ eggWidth, reduceMotion }: { eggWidth: number; reduceMotion: boolean }) {
  const { unit, style: frame } = fxFrame(eggWidth);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: reduceMotion ? 1100 : 2200, easing: Easing.linear });
  }, [progress, reduceMotion]);

  const beamsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.16, 0.62, 1], [0, 1, 0.85, 0]),
    transform: reduceMotion ? [] : [{ scaleY: interpolate(progress.value, [0, 0.22], [0.55, 1], 'clamp') }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.74, 1], [0, 1, 1, 0]),
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(progress.value, [0, 0.24], [-18 * unit, 0], 'clamp') },
          { scale: interpolate(progress.value, [0, 0.24, 0.5, 0.74], [0.6, 1.06, 1, 1.04], 'clamp') },
        ],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { rotate: `${progress.value * 45}deg` },
          { scale: interpolate(progress.value, [0.2, 0.42, 0.64], [0.9, 1.14, 1], 'clamp') },
        ],
  }));

  const sunSize = 76 * unit;
  const beamTop = SKY.y;
  const beamBottom = EGG_POLE_Y - FX.top;

  return (
    <View pointerEvents="none" style={[styles.fx, styles.sun, frame]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `50% ${(beamTop / FX.height) * 100}%` }, beamsStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${FX.width} ${FX.height}`}>
          <Defs>
            <LinearGradient id="sun-beam" x1="0" y1={beamTop} x2="0" y2={beamBottom} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFF1C2" stopOpacity={0.85} />
              <Stop offset="45%" stopColor="#FFD27A" stopOpacity={0.42} />
              <Stop offset="100%" stopColor="#F6B24A" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="sun-cone" x1="0" y1={beamTop} x2="0" y2={beamBottom} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFE6A8" stopOpacity={0.5} />
              <Stop offset="100%" stopColor="#F6C56A" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M${SKY.x - 6} ${beamTop} L${SKY.x + 6} ${beamTop} L${SKY.x + 104} ${beamBottom} L${SKY.x - 104} ${beamBottom} Z`}
            fill="url(#sun-cone)"
          />
          {SUN_BEAMS.map((beam) => (
            <Path
              key={beam.spread}
              d={`M${SKY.x - 1.5} ${beamTop} L${SKY.x + 1.5} ${beamTop} L${SKY.x + beam.spread + beam.width / 2} ${beamBottom} L${SKY.x + beam.spread - beam.width / 2} ${beamBottom} Z`}
              fill="url(#sun-beam)"
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.sunBody,
          { left: SKY.x * unit - sunSize / 2, top: SKY.y * unit - sunSize / 2, width: sunSize, height: sunSize },
          sunStyle,
        ]}>
        <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
          <Svg width="100%" height="100%" viewBox="-38 -38 76 76">
            {SUN_RAYS.map((angle, index) => (
              <Path
                key={angle}
                d={index % 2 === 0 ? 'M-2.6 -20 L0 -35 L2.6 -20 Z' : 'M-2 -19 L0 -29 L2 -19 Z'}
                fill="#FFC94D"
                opacity={index % 2 === 0 ? 0.95 : 0.7}
                transform={`rotate(${angle})`}
              />
            ))}
          </Svg>
        </Animated.View>
        <Svg width="100%" height="100%" viewBox="-38 -38 76 76" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="sun-corona" cx="0" cy="0" r="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFE9A6" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#FFC94D" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="sun-disc" cx="-4" cy="-4" r="17" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFF8DC" />
              <Stop offset="55%" stopColor="#FFDA6A" />
              <Stop offset="100%" stopColor="#F5A833" />
            </RadialGradient>
          </Defs>
          <Circle cx="0" cy="0" r="24" fill="url(#sun-corona)" />
          <Circle cx="0" cy="0" r="14" fill="url(#sun-disc)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function RainBurst({ eggWidth, reduceMotion }: { eggWidth: number; reduceMotion: boolean }) {
  const { unit, style: frame } = fxFrame(eggWidth);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: reduceMotion ? 1100 : 2300, easing: Easing.linear });
  }, [progress, reduceMotion]);

  const cloudStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.76, 1], [0, 1, 1, 0]),
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(progress.value, [0, 0.18], [-14 * unit, 0], 'clamp') },
          { translateX: interpolate(progress.value, [0, 1], [-5 * unit, 5 * unit]) },
        ],
  }));

  const cloudWidth = 132 * unit;
  const cloudHeight = 62 * unit;

  return (
    <View pointerEvents="none" style={[styles.fx, styles.rain, frame]}>
      {reduceMotion
        ? null
        : RAIN_DROPS.map((drop) => <RainDrop key={drop.x} drop={drop} unit={unit} />)}
      <Animated.View
        style={[
          styles.cloud,
          {
            left: SKY.x * unit - cloudWidth / 2,
            top: SKY.y * unit - cloudHeight * 0.62,
            width: cloudWidth,
            height: cloudHeight,
          },
          cloudStyle,
        ]}>
        <Svg width="100%" height="100%" viewBox="0 0 132 62">
          <Defs>
            <LinearGradient id="rain-cloud" x1="0" y1="6" x2="0" y2="56" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#F4F8FB" />
              <Stop offset="100%" stopColor="#A9BED0" />
            </LinearGradient>
          </Defs>
          <Path
            d="M26 54 C12 54 6 44 10 36 C13 29 21 27 27 29 C27 18 38 10 50 13 C55 5 68 2 78 8 C86 3 100 6 104 17 C116 16 126 25 124 37 C123 47 115 54 104 54 Z"
            fill="url(#rain-cloud)"
          />
          <Path
            d="M30 30 C33 24 40 21 47 23 M58 16 C64 11 74 11 79 16"
            stroke="#FFFFFF"
            strokeOpacity={0.7}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function RainDrop({ drop, unit }: { drop: (typeof RAIN_DROPS)[number]; unit: number }) {
  const fall = useSharedValue(0);
  const splash = useSharedValue(0);

  useEffect(() => {
    fall.value = withDelay(drop.delay, withTiming(1, { duration: drop.duration, easing: Easing.in(Easing.quad) }));
    splash.value = withDelay(
      drop.delay + drop.duration,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })
    );
  }, [drop.delay, drop.duration, fall, splash]);

  const startY = (SKY.y + 12) * unit;
  const landing = landingY(drop.x);
  const endY = (landing - FX.top) * unit;
  const left = (drop.x - FX.left) * unit;
  const length = 17 * unit;
  const width = Math.max(1.6, 2.4 * unit);
  const splashWidth = 16 * unit;
  const onShell = landing < EGG_POLE_Y;
  const beadSize = 4.6 * unit;
  const beadTravel = 18 * unit;

  const dropStyle = useAnimatedStyle(() => ({
    opacity: fall.value <= 0 || fall.value >= 1 ? 0 : interpolate(fall.value, [0, 0.15, 1], [0, 1, 0.9]),
    transform: [{ translateY: startY + (endY - length - startY) * fall.value }],
  }));
  const splashStyle = useAnimatedStyle(() => ({
    opacity: splash.value <= 0 ? 0 : interpolate(splash.value, [0, 1], [0.95, 0]),
    transform: [{ scaleX: interpolate(splash.value, [0, 1], [0.2, 1.2]) }, { scaleY: interpolate(splash.value, [0, 1], [0.4, 1]) }],
  }));
  const beadStyle = useAnimatedStyle(() => ({
    opacity: splash.value <= 0 ? 0 : interpolate(splash.value, [0, 0.2, 1], [0, 0.95, 0]),
    transform: [{ translateY: beadTravel * splash.value }],
  }));

  return (
    <>
      {drop.bead && onShell ? (
        <Animated.View
          style={[
            styles.bead,
            {
              left: left - beadSize / 2,
              top: endY + 2 * unit,
              width: beadSize,
              height: beadSize * 1.3,
              borderRadius: beadSize,
            },
            beadStyle,
          ]}
        />
      ) : null}
      <Animated.View style={[styles.drop, { left: left - width / 2, width, height: length, borderRadius: width }, dropStyle]} />
      <Animated.View
        style={[
          styles.splash,
          {
            left: left - splashWidth / 2,
            top: endY - splashWidth * 0.18,
            width: splashWidth,
            height: splashWidth * 0.36,
            borderRadius: splashWidth,
          },
          splashStyle,
        ]}
      />
    </>
  );
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.78;
  }
  return Math.min(1, Math.max(0.3, value));
}

function resolveScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0.82, value));
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
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggHit: {
    zIndex: 2,
  },
  heart: {
    position: 'absolute',
    zIndex: 4,
  },
  fx: {
    position: 'absolute',
  },
  broodGlow: {
    position: 'absolute',
    zIndex: 1,
  },
  sun: {
    zIndex: 3,
  },
  rain: {
    zIndex: 5,
  },
  sunBody: {
    position: 'absolute',
  },
  cloud: {
    position: 'absolute',
  },
  drop: {
    position: 'absolute',
    top: 0,
    backgroundColor: RAIN,
  },
  splash: {
    position: 'absolute',
    borderWidth: 1.4,
    borderColor: RAIN,
  },
  bead: {
    position: 'absolute',
    backgroundColor: 'rgba(196, 228, 246, 0.95)',
    borderWidth: 0.8,
    borderColor: RAIN,
  },
});
