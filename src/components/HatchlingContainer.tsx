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
    <View style={styles.stage}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hint}
        onPress={handlePet}
        style={styles.hit}>
        <Animated.View style={motion}>
          <HatchlingFigure speciesId={speciesId} maturationProgress={maturationProgress} />
        </Animated.View>
      </Pressable>
      <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
      <Text style={[styles.scale, { color: palette.textMuted }]}>{scaleLabel}</Text>
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
  hit: {
    minWidth: 220,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
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
