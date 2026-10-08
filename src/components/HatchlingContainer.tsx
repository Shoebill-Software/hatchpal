import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import type { SpeciesId } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { HatchlingFigure } from './HatchlingFigure';

export interface HatchlingContainerProps {
  speciesId: SpeciesId;
  maturationProgress: number;
  accessibilityLabel: string;
  hint: string;
  scaleLabel: string;
  onPet: () => void;
  /** Hides the caption stack so the figure can sit in a fixed viewport. */
  showCaption?: boolean;
  width?: number;
  height?: number;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function HatchlingContainer({
  speciesId,
  maturationProgress,
  accessibilityLabel,
  hint,
  scaleLabel,
  onPet,
  showCaption = true,
  width = 220,
  height = 240,
}: HatchlingContainerProps) {
  const palette = useNestPalette();
  const { play } = useSoundEffects();
  const breathe = useSharedValue(1);
  const bounce = useSharedValue(1);
  const growth = useSharedValue(0.72 + 0.28 * clampProgress(maturationProgress));

  useEffect(() => {
    growth.value = 0.72 + 0.28 * clampProgress(maturationProgress);
  }, [growth, maturationProgress]);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.028, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breathe]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: growth.value * breathe.value * bounce.value }],
  }));

  const handlePet = () => {
    bounce.value = withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 11, stiffness: 180 }));
    void triggerImpact(ImpactFeedbackStyle.Light);
    play('internal_peep');
    onPet();
  };

  return (
    <View style={[styles.stage, showCaption ? null : styles.stageCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hint}
        onPress={handlePet}
        style={[styles.hit, showCaption ? null : styles.hitCompact]}>
        <Animated.View style={motion}>
          <HatchlingFigure
            speciesId={speciesId}
            maturationProgress={maturationProgress}
            width={width}
            height={height}
          />
        </Animated.View>
      </Pressable>
      {showCaption ? <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text> : null}
      {showCaption ? <Text style={[styles.scale, { color: palette.textMuted }]}>{scaleLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  stageCompact: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  hit: {
    minWidth: 220,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitCompact: {
    minWidth: 0,
    minHeight: 0,
  },
  hint: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  scale: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },
});
