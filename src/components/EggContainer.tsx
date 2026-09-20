import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { hexToRgba, useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { PetSnapshot, SpeciesConfig, SpeciesId } from '@/domain/types';
import { canTurnEgg, isTurningLockdown, speciesRequiresTurning } from '@/utils/eggCare';

const EGG_SIZE = { width: 196, height: 248 };
const SWIPE_THRESHOLD = 52;
const TURN_DEGREES = 180;

export interface EggContainerProps {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
  onTurnEgg: () => void;
  healthMultiplier?: number;
}

export type EggContainerHandle = {
  turn: (direction?: 1 | -1) => void;
};

export const EggContainer = forwardRef<EggContainerHandle, EggContainerProps>(
  function EggContainer({ snapshot, species, onTurnEgg, healthMultiplier = 1 }, ref) {
    const palette = useNestPalette();
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);
    const wiggle = useSharedValue(0);

    const canTurn = canTurnEgg(snapshot, species);
    const lockdown = isTurningLockdown(snapshot, species);
    const neverTurns = !speciesRequiresTurning(species);

    const canTurnRef = useRef(canTurn);
    canTurnRef.current = canTurn;
    const onTurnEggRef = useRef(onTurnEgg);
    onTurnEggRef.current = onTurnEgg;

    const playTapMotion = useCallback(() => {
      scale.value = withSequence(withTiming(1.07, { duration: 80 }), withSpring(1, { damping: 11 }));
      wiggle.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 80 }),
        withTiming(-3.5, { duration: 70 }),
        withTiming(0, { duration: 90 })
      );
    }, [scale, wiggle]);

    const playTurnMotion = useCallback(
      (direction: number) => {
        rotation.value = withTiming(rotation.value + TURN_DEGREES * direction, {
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
        });
      },
      [rotation]
    );

    const handleTap = useCallback(() => {
      const style = snapshot.isPipped
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
      void Haptics.impactAsync(style);
      playTapMotion();
    }, [playTapMotion, snapshot.isPipped]);

    const performTurn = useCallback(
      (translationX: number) => {
        if (!canTurnRef.current) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        const direction: 1 | -1 = translationX >= 0 ? 1 : -1;
        playTurnMotion(direction);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onTurnEggRef.current();
      },
      [playTurnMotion]
    );

    useImperativeHandle(
      ref,
      () => ({
        turn: (direction = 1) => {
          performTurn(direction);
        },
      }),
      [performTurn]
    );

    const tap = Gesture.Tap()
      .maxDuration(280)
      .onEnd(() => {
        scheduleOnRN(handleTap);
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-18, 18])
      .onEnd((event) => {
        if (Math.abs(event.translationX) < SWIPE_THRESHOLD) {
          return;
        }
        scheduleOnRN(performTurn, event.translationX);
      });

    const composed = Gesture.Exclusive(pan, tap);

    const eggStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 980 },
        { rotateY: `${rotation.value}deg` },
        { rotateZ: `${wiggle.value}deg` },
        { scale: scale.value },
      ],
    }));

    const vitality = Math.min(1, Math.max(0.42, 0.55 + 0.45 * Math.min(1, Math.max(0, healthMultiplier))));
    const shell = shellColors(species.id);
    const crackOpacity = snapshot.isPipped
      ? snapshot.currentMilestone.stage === 'external_pip'
        ? 1
        : 0.78
      : 0;
    const hatchCrack = snapshot.isReadyToHatch || snapshot.currentMilestone.stage === 'external_pip';
    const lockLabel = neverTurns
      ? 'No turning required'
      : lockdown
        ? 'Lockdown'
        : 'Swipe to turn';
    const hint = neverTurns
      ? 'This clutch stays still — keep moisture and heat steady'
      : lockdown
        ? `Lockdown from day ${species.turningRequiredUntilDay} — the egg stays unmoved through hatch`
        : 'Tap for a nudge, or swipe to rotate the egg';

    return (
      <View
        style={styles.stage}
        accessibilityLabel={`${species.commonName} egg in the nest, ${lockLabel}`}>
        <Svg
          width={EGG_SIZE.width}
          height={EGG_SIZE.height}
          viewBox="0 0 196 248"
          style={StyleSheet.absoluteFill}
          pointerEvents="none">
          <Ellipse cx="98" cy="214" rx="78" ry="18" fill={shell.nestShadow} opacity={0.45} />
          <Path
            d="M18 196 C36 168 62 158 98 158 C134 158 160 168 178 196 C168 226 132 238 98 238 C64 238 28 226 18 196 Z"
            fill={lockdown ? shell.nestLock : shell.nestBowl}
          />
          <Path
            d="M34 186 C48 176 58 198 72 188"
            stroke={shell.twig}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M122 188 C138 176 148 200 164 186"
            stroke={shell.twig}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M58 206 C78 198 118 198 140 208"
            stroke={shell.twigDark}
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <GestureDetector gesture={composed}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityHint={
              canTurn
                ? 'Tap for feedback, swipe to turn the egg'
                : 'Tap for feedback. Turning is locked in this phase'
            }
            accessibilityLabel="Egg"
            style={[styles.eggHit, eggStyle, { opacity: vitality }]}>
            <Svg width={EGG_SIZE.width} height={EGG_SIZE.height} viewBox="0 0 196 248">
              <Ellipse cx="98" cy="168" rx="44" ry="12" fill={shell.castShadow} opacity={0.28} />
              <Path
                d="M98 28 C58 28 40 92 40 128 C40 178 64 204 98 204 C132 204 156 178 156 128 C156 92 138 28 98 28 Z"
                fill={shell.body}
                stroke={shell.stroke}
                strokeWidth="1.4"
              />
              <Path
                d="M78 46 C66 78 64 112 78 138"
                stroke={shell.highlight}
                strokeWidth="8"
                strokeLinecap="round"
                opacity={0.28}
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

        {lockdown || neverTurns ? (
          <View
            pointerEvents="none"
            style={[styles.lockBadge, { backgroundColor: hexToRgba(palette.bannerText, 0.92) }]}>
            <Text style={[styles.lockBadgeLabel, { color: palette.actionText }]}>{lockLabel}</Text>
          </View>
        ) : null}

        <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>
      </View>
    );
  }
);

function shellColors(speciesId: SpeciesId) {
  if (speciesId === 'leopard_gecko') {
    return {
      body: '#F7F1E3',
      stroke: '#D9CBB3',
      highlight: '#FFFFFF',
      speckle: '#C4B49A',
      crack: '#5C4030',
      nestBowl: '#8A5A32',
      nestLock: '#6E4A2C',
      nestShadow: '#5C3A22',
      twig: '#A56B3A',
      twigDark: '#6E4220',
      castShadow: '#3A2A1C',
    };
  }

  if (speciesId === 'green_sea_turtle') {
    return {
      body: '#F3DFD0',
      stroke: '#D7B8A4',
      highlight: '#FFF6EF',
      speckle: '#C9A08A',
      crack: '#5A3828',
      nestBowl: '#C2A36B',
      nestLock: '#A48A52',
      nestShadow: '#8A7044',
      twig: '#D7B47A',
      twigDark: '#9A7844',
      castShadow: '#4A3A22',
    };
  }

  return {
    body: '#F3E4B8',
    stroke: '#D7C28A',
    highlight: '#FFF8E6',
    speckle: '#C4A66A',
    crack: '#5C4030',
    nestBowl: '#8B5A32',
    nestLock: '#6B4424',
    nestShadow: '#5C3A22',
    twig: '#A66B3B',
    twigDark: '#6E4220',
    castShadow: '#3A2A1C',
  };
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: EGG_SIZE.height + 36,
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  eggHit: {
    width: EGG_SIZE.width,
    height: EGG_SIZE.height,
  },
  lockBadge: {
    position: 'absolute',
    top: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  lockBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: Spacing.two,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
