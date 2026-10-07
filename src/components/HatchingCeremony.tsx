import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { getSpeciesConfig } from '@/data/species';
import type { SpeciesId } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  triggerImpact,
  triggerNotification,
} from '@/services/hapticFeedback';
import { useTranslation } from '@/i18n';
import type { SoundEffectId } from '@/services/soundCues';

import { HatchlingFigure } from './HatchlingFigure';

/** Rhythmic assists required before the shell cap releases. */
export const HATCH_BREAKTHROUGH_TAPS = 6;

const CRACKS = [
  'M60 34 L78 18',
  'M60 34 L40 16',
  'M60 34 L86 36',
  'M60 34 L34 40',
  'M60 34 L74 54',
  'M60 34 L44 56',
] as const;

export interface HatchingCeremonyProps {
  visible: boolean;
  nickname: string;
  speciesId: SpeciesId;
  onComplete: () => void;
}

export function HatchingCeremony({ visible, nickname, speciesId, onComplete }: HatchingCeremonyProps) {
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { play } = useSoundEffects();
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef(0);
  const capY = useSharedValue(0);
  const capRotate = useSharedValue(0);
  const creatureScale = useSharedValue(0.35);
  const creatureOpacity = useSharedValue(0);

  const emerged = taps >= HATCH_BREAKTHROUGH_TAPS;
  const shell = shellColors(speciesId);

  useEffect(() => {
    if (!visible) {
      tapsRef.current = 0;
      setTaps((current) => (current === 0 ? current : 0));
      capY.value = 0;
      capRotate.value = 0;
      creatureScale.value = 0.35;
      creatureOpacity.value = 0;
      return;
    }
    if (taps < HATCH_BREAKTHROUGH_TAPS) {
      return;
    }
    capY.value = withTiming(-92, { duration: 560, easing: Easing.out(Easing.cubic) });
    capRotate.value = withTiming(-24, { duration: 560, easing: Easing.out(Easing.cubic) });
    creatureOpacity.value = withTiming(1, { duration: 320 });
    creatureScale.value = withSpring(1, { damping: 12, stiffness: 150 });
  }, [capRotate, capY, creatureOpacity, creatureScale, taps, visible]);

  const capStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: capY.value }, { rotate: `${capRotate.value}deg` }],
  }));

  const creatureStyle = useAnimatedStyle(() => ({
    opacity: creatureOpacity.value,
    transform: [{ scale: creatureScale.value }],
  }));

  const assist = () => {
    if (tapsRef.current >= HATCH_BREAKTHROUGH_TAPS) {
      return;
    }
    const next = tapsRef.current + 1;
    tapsRef.current = next;
    setTaps(next);
    if (next >= HATCH_BREAKTHROUGH_TAPS) {
      void triggerNotification(NotificationFeedbackType.Success);
      play('hatch_call');
      return;
    }
    void triggerImpact(ImpactFeedbackStyle.Medium);
    play(assistCue(next));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => undefined}>
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: palette.background,
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}>
        <Text style={[styles.kicker, { color: palette.textMuted }]}>{t('hatch.help')}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{t('hatch.cracking')}</Text>
        <Text style={[styles.progress, { color: palette.textMuted }]}>
          {t('hatch.tapProgress', { current: Math.min(taps, HATCH_BREAKTHROUGH_TAPS), total: HATCH_BREAKTHROUGH_TAPS })}
        </Text>

        <View style={styles.stage}>
          <Svg width={220} height={278} viewBox="0 0 196 248">
            <Ellipse cx="98" cy="214" rx="46" ry="10" fill={shell.shadow} opacity={0.18} />
            <Path
              d="M52 86 L66 98 L80 82 L94 100 L98 84 L114 100 L128 82 L142 98 L144 86 C152 108 156 128 156 140 C156 186 132 214 98 214 C64 214 40 186 40 140 C40 128 44 108 52 86 Z"
              fill={shell.body}
              stroke={shell.stroke}
              strokeWidth="1.4"
            />
            <Path
              d="M78 150 C70 168 74 186 90 190"
              stroke={shell.highlight}
              strokeWidth="7"
              strokeLinecap="round"
              opacity={0.28}
              fill="none"
            />
          </Svg>

          <Animated.View style={[styles.creatureSlot, creatureStyle]} pointerEvents="none">
            <HatchlingFigure
              speciesId={speciesId}
              maturationProgress={0}
              width={168}
              height={184}
              resting={false}
            />
          </Animated.View>

          <Animated.View style={[styles.capSlot, capStyle]} pointerEvents="none">
            <Svg width={150} height={96} viewBox="0 0 120 78">
              <Path
                d="M60 8 C28 8 16 40 22 52 L36 62 L50 46 L64 64 L78 46 L92 62 L98 52 C104 40 92 8 60 8 Z"
                fill={shell.body}
                stroke={shell.stroke}
                strokeWidth="1.4"
              />
              {CRACKS.map((d, index) =>
                index < taps ? (
                  <Path
                    key={d}
                    d={d}
                    stroke={shell.crack}
                    strokeWidth={index > 3 ? 2.2 : 1.6}
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null
              )}
            </Svg>
          </Animated.View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hatch.tapToAssist')}
            accessibilityState={{ disabled: emerged }}
            disabled={emerged}
            onPress={assist}
            style={styles.hit}
          />
        </View>

        <View style={styles.dots} accessibilityElementsHidden>
          {CRACKS.map((crack, index) => (
            <View
              key={crack}
              style={[
                styles.dot,
                {
                  backgroundColor: index < taps ? palette.progressFill : palette.progressTrack,
                },
              ]}
            />
          ))}
        </View>

        {emerged ? (
          <View style={styles.reveal}>
            <Text accessibilityLiveRegion="polite" style={[styles.welcome, { color: palette.text }]}>
              {t('hatch.welcome', { nickname })}
            </Text>
            <Text style={[styles.emerged, { color: palette.textMuted }]}>
              {t('hatch.emerged', { nickname })}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onComplete}
              style={({ pressed }) => [
                styles.complete,
                { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.completeLabel, { color: palette.actionText }]}>{t('hatch.complete')}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.assist, { color: palette.text }]}>{t('hatch.tapToAssist')}</Text>
        )}
      </View>
    </Modal>
  );
}

function assistCue(tapNumber: number): SoundEffectId {
  return tapNumber % 2 === 0 ? 'shell_crack' : 'pip_tap';
}

function shellColors(speciesId: SpeciesId): {
  body: string;
  stroke: string;
  highlight: string;
  crack: string;
  shadow: string;
} {
  const nest = getSpeciesConfig(speciesId).egg.nest;
  return {
    body: nest.body,
    stroke: nest.stroke,
    highlight: nest.highlight,
    crack: nest.crack,
    shadow: nest.castShadow,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  progress: {
    fontSize: 13,
    fontWeight: '700',
  },
  stage: {
    width: 240,
    height: 300,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.three,
  },
  creatureSlot: {
    position: 'absolute',
    top: 78,
    alignItems: 'center',
  },
  capSlot: {
    position: 'absolute',
    top: 28,
    alignItems: 'center',
  },
  hit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  assist: {
    marginTop: Spacing.three,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  reveal: {
    marginTop: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 360,
  },
  welcome: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  emerged: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  complete: {
    marginTop: Spacing.two,
    minHeight: 52,
    minWidth: 240,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
