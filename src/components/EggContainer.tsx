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
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
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

const MIST_DROPS = [
  { left: 8, size: 3.2, delay: 0, travel: 54 },
  { left: 18, size: 2.4, delay: 40, travel: 42 },
  { left: 28, size: 3.6, delay: 90, travel: 64 },
  { left: 38, size: 2.2, delay: 20, travel: 36 },
  { left: 48, size: 3, delay: 120, travel: 58 },
  { left: 58, size: 2.6, delay: 60, travel: 46 },
  { left: 68, size: 3.4, delay: 150, travel: 62 },
  { left: 78, size: 2.2, delay: 30, travel: 40 },
  { left: 86, size: 3, delay: 100, travel: 52 },
] as const;

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
  const lamp = useSharedValue(0);
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
  }, [clearHoldTimer, play, playTapMotion, snapshot]);

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

  useEffect(() => {
    if (warmPulse === 0) {
      return;
    }
    lamp.value = 0;
    lamp.value = withSequence(
      withTiming(1, { duration: reduceMotion ? 80 : 180 }),
      withTiming(0, { duration: reduceMotion ? 160 : 1100, easing: Easing.out(Easing.cubic) })
    );
  }, [lamp, reduceMotion, warmPulse]);

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
    transform: [{ rotateZ: `${wiggle.value + shiver.value + lean.value}deg` }, { scale: scale.value * hold.value }],
  }));
  const lampStyle = useAnimatedStyle(() => ({
    opacity: lamp.value,
  }));

  const shell = species.egg.nest;
  const crackOpacity = snapshot.isPipped
    ? snapshot.currentMilestone.stage === 'external_pip'
      ? 1
      : 0.78
    : 0;
  const hatchCrack = snapshot.isReadyToHatch || snapshot.currentMilestone.stage === 'external_pip';
  const poleTop = (EGG_POLE_Y / EGG_VIEWBOX.height) * eggHeight;
  const showHeart = inSweetSpot && heartRate > 0;
  const sulking = temper !== 'content';
  const chalky = sulking && humidityStatus === 'dry';
  const coolWash = sulking && temperatureStatus === 'too_cold';
  const warmWash = sulking && temperatureStatus === 'too_warm';

  return (
    <View style={styles.stage}>
      <View style={[styles.hero, { width: eggWidth, height: eggHeight }]}>
        <View pointerEvents="none" style={[styles.contactShadow, { top: poleTop - 4 * layout }]}>
          <Svg width={148 * layout} height={28 * layout}>
            <Ellipse cx={74 * layout} cy={14 * layout} rx={52 * layout} ry={9 * layout} fill={shell.castShadow} opacity={0.16} />
            <Ellipse cx={74 * layout} cy={13 * layout} rx={30 * layout} ry={4.5 * layout} fill={shell.castShadow} opacity={0.22} />
          </Svg>
        </View>

        <Animated.View pointerEvents="none" style={[styles.lamp, { top: -6 * layout }, lampStyle]}>
          <Svg width={eggWidth} height={eggHeight * 0.62} viewBox="0 0 220 180">
            <Defs>
              <LinearGradient id="brooder-lamp" x1="110" y1="0" x2="110" y2="180" gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor="#FFE3A8" stopOpacity={0.05} />
                <Stop offset="28%" stopColor="#F6C56A" stopOpacity={0.72} />
                <Stop offset="100%" stopColor="#E09040" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d="M78 0 H142 L196 176 H24 Z" fill="url(#brooder-lamp)" />
          </Svg>
        </Animated.View>

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

        {mistPulse > 0 ? <MistBurst key={mistPulse} pulse={mistPulse} reduceMotion={reduceMotion} scale={layout} /> : null}
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

function MistBurst({
  pulse,
  reduceMotion,
  scale,
}: {
  pulse: number;
  reduceMotion: boolean;
  scale: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.mist, { height: 78 * scale, bottom: 10 * scale }]}>
      {MIST_DROPS.map((drop) => (
        <Droplet key={`${pulse}-${drop.left}`} drop={drop} reduceMotion={reduceMotion} scale={scale} />
      ))}
    </View>
  );
}

function Droplet({
  drop,
  reduceMotion,
  scale,
}: {
  drop: (typeof MIST_DROPS)[number];
  reduceMotion: boolean;
  scale: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      reduceMotion ? 0 : drop.delay,
      withTiming(1, { duration: reduceMotion ? 220 : 980, easing: Easing.out(Easing.quad) })
    );
  }, [drop.delay, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 0.8, 0]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-6 * scale, drop.travel * scale]) }],
  }));
  const size = drop.size * Math.max(scale, 0.7);

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: `${drop.left}%`,
          width: size,
          height: size * 1.45,
          borderRadius: size,
        },
        style,
      ]}
    />
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
  contactShadow: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
  },
  lamp: {
    position: 'absolute',
    zIndex: 3,
  },
  eggHit: {
    zIndex: 2,
  },
  heart: {
    position: 'absolute',
    zIndex: 4,
  },
  mist: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  drop: {
    position: 'absolute',
    bottom: 18,
    backgroundColor: 'rgba(186, 220, 232, 0.9)',
  },
});
