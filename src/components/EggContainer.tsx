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

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { PetSnapshot, SpeciesConfig, SpeciesId } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  triggerImpact,
  triggerNotification,
} from '@/services/hapticFeedback';
import { resolveShellTapEffect } from '@/services/soundCues';

const EGG_SIZE = { width: 220, height: 278 };
const EGG_VIEWBOX = { width: 196, height: 248 };
/** Bottom pole of the shell path, in viewBox units. */
const EGG_POLE_Y = 204;
const SWIPE_THRESHOLD = 52;
const TURN_DEGREES = 180;

export interface EggContainerProps {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
  onTurnEgg: () => void;
  healthMultiplier?: number;
  hint: string;
  badgeLabel?: string | null;
  canTurn: boolean;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export type EggContainerHandle = {
  turn: (direction?: 1 | -1) => void;
};

export const EggContainer = forwardRef<EggContainerHandle, EggContainerProps>(
  function EggContainer(
    {
      snapshot,
      species,
      onTurnEgg,
      healthMultiplier = 1,
      hint,
      badgeLabel,
      canTurn,
      accessibilityLabel,
      accessibilityHint,
    },
    ref
  ) {
    const palette = useNestPalette();
    const { play } = useSoundEffects();
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);
    const wiggle = useSharedValue(0);

    const onTurnEggRef = useRef(onTurnEgg);
    onTurnEggRef.current = onTurnEgg;
    const canTurnRef = useRef(canTurn);
    canTurnRef.current = canTurn;

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
      if (snapshot.isHatched || snapshot.isReadyToHatch) {
        void triggerNotification(NotificationFeedbackType.Success);
      } else if (snapshot.isPipped) {
        void triggerImpact(ImpactFeedbackStyle.Medium);
      } else {
        void triggerImpact(ImpactFeedbackStyle.Light);
      }
      play(resolveShellTapEffect(snapshot));
      if (snapshot.currentMilestone.stage === 'internal_pip') {
        play('internal_peep');
      }
      playTapMotion();
    }, [play, playTapMotion, snapshot]);

    const performTurn = useCallback(
      (translationX: number) => {
        if (!canTurnRef.current) {
          void triggerNotification(NotificationFeedbackType.Warning);
          return;
        }
        const direction: 1 | -1 = translationX >= 0 ? 1 : -1;
        playTurnMotion(direction);
        void triggerImpact(ImpactFeedbackStyle.Medium);
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
    const poleTop = (EGG_POLE_Y / EGG_VIEWBOX.height) * EGG_SIZE.height;

    return (
      <View style={styles.stage} accessibilityLabel={accessibilityLabel}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={[styles.contactShadow, { top: poleTop - 4 }]}>
            <Svg width={148} height={28}>
              <Ellipse cx="74" cy="14" rx="52" ry="9" fill={shell.castShadow} opacity={0.14} />
              <Ellipse cx="74" cy="13" rx="30" ry="4.5" fill={shell.castShadow} opacity={0.2} />
            </Svg>
          </View>

          <GestureDetector gesture={composed}>
            <Animated.View
              accessible
              accessibilityRole="button"
              accessibilityHint={accessibilityHint}
              accessibilityLabel={accessibilityLabel}
              style={[styles.eggHit, eggStyle, { opacity: vitality }]}>
              <Svg
                width={EGG_SIZE.width}
                height={EGG_SIZE.height}
                viewBox={`0 0 ${EGG_VIEWBOX.width} ${EGG_VIEWBOX.height}`}>
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
        </View>

        {badgeLabel ? (
          <View pointerEvents="none" style={[styles.lockBadge, { backgroundColor: palette.banner }]}>
            <Text style={[styles.lockBadgeLabel, { color: palette.bannerText }]}>{badgeLabel}</Text>
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
      castShadow: '#4A3A22',
    };
  }

  return {
    body: '#F3E4B8',
    stroke: '#D7C28A',
    highlight: '#FFF8E6',
    speckle: '#C4A66A',
    crack: '#5C4030',
    castShadow: '#3A2A1C',
  };
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  hero: {
    width: EGG_SIZE.width,
    height: EGG_SIZE.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactShadow: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 0,
  },
  eggHit: {
    width: EGG_SIZE.width,
    height: EGG_SIZE.height,
    zIndex: 1,
  },
  lockBadge: {
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: 320,
  },
});
