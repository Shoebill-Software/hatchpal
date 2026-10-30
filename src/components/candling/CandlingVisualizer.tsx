import { useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Fill, Group, Image, useTexture } from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { candlingShellPalette, createPipStar, layoutEgg, type EggLayout } from '@/components/candlingGeometry';
import { buildCandlingAnatomy } from '@/components/candling/candlingAnatomy';
import { CandlingBackdrop, CandlingSubject } from '@/components/candling/CandlingScene';
import { resolveCandlingStageFromMilestones } from '@/components/candling/candlingStages';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import type { PetSnapshot, SpeciesConfig } from '@/domain/types';

const CHAMBER = '#070504';
const EGG_TAPER = 0.75;

export interface CandlingVisualizerProps {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
  /** Embryonic heart rate. Drives the visible pulse during the vascular window. */
  bpm?: number;
}

/**
 * Transilluminated egg. Albumen glows, the yolk and chalazae show early, a
 * branching vascular field spreads across the yolk, then a species-specific
 * embryo darkens and curls toward the air cell at the blunt pole.
 */
export function CandlingVisualizer({ snapshot, species, bpm = 0 }: CandlingVisualizerProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [layout, setLayout] = useState<EggLayout | null>(null);
  const palette = useMemo(() => candlingShellPalette(species.id), [species.id]);
  const stage = useMemo(
    () =>
      resolveCandlingStageFromMilestones(
        snapshot.incubationProgress,
        species.incubationDays,
        species.milestones,
      ),
    [snapshot.incubationProgress, species.incubationDays, species.milestones],
  );
  const eggAspect = species.egg.widthMm / Math.max(species.egg.lengthMm, 1);
  const eggShape = species.egg.shape;
  const beakInAirCell =
    snapshot.currentMilestone.stage === 'internal_pip' ||
    snapshot.currentMilestone.stage === 'external_pip' ||
    snapshot.isPipped;

  const drift = useSharedValue(0);
  const flutter = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(drift);
      drift.value = 0;
    };
  }, [drift, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || stage.movement < 0.08) {
      cancelAnimation(flutter);
      flutter.value = 0;
      return;
    }
    flutter.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 560, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(flutter);
    };
  }, [flutter, reduceMotion, stage.movement]);

  const fitEgg = (width: number, height: number) =>
    layoutEgg(width, height, 18, { aspect: eggAspect, shape: eggShape, taper: EGG_TAPER });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    const next = fitEgg(width, height);
    setLayout((current) => (sameEgg(current, next) ? current : next));
  };

  useEffect(() => {
    setLayout((current) => {
      if (!current) {
        return current;
      }
      const next = layoutEgg(current.canvasWidth, current.canvasHeight, 18, {
        aspect: eggAspect,
        shape: eggShape,
        taper: EGG_TAPER,
      });
      return sameEgg(current, next) ? current : next;
    });
  }, [eggAspect, eggShape]);

  const anatomy = useMemo(() => {
    if (!layout) {
      return null;
    }
    return buildCandlingAnatomy(
      layout,
      stage,
      { id: species.id, shape: species.egg.shape, speckle: species.egg.speckle },
      { beakInAirCell },
    );
  }, [beakInAirCell, layout, species.egg.shape, species.egg.speckle, species.id, stage]);

  const heartOn = Boolean(anatomy?.heart) && bpm > 0;
  useEffect(() => {
    if (reduceMotion || !heartOn) {
      cancelAnimation(pulse);
      pulse.value = 0.35;
      return;
    }
    const interval = Math.max(260, Math.min(1800, (60 / bpm) * 1000));
    const attack = Math.min(100, interval * 0.16);
    const release = Math.min(260, interval * 0.32);
    const rest = Math.max(40, interval - attack - release);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: attack, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: release, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: rest }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [bpm, heartOn, pulse, reduceMotion]);

  const embryoAmp = 1.5 + stage.movement * 6.5;
  const yolkAmp = 1.3 + stage.yolk * 3.4;
  const heartR = anatomy?.heart?.r ?? 0;
  const breathAmp = stage.id === 'prehatch' ? 2 : 0;

  const yolkTransform = useDerivedValue(() => [
    { translateX: drift.value * yolkAmp },
    { translateY: Math.abs(drift.value) * yolkAmp * 0.35 },
  ]);
  const embryoTransform = useDerivedValue(() => [
    { translateX: drift.value * embryoAmp + flutter.value * 3.1 },
    { translateY: drift.value * embryoAmp * 0.45 + flutter.value * 2 },
  ]);
  const heartCore = useDerivedValue(() => heartR * (0.72 + pulse.value * 0.58));
  const heartGlow = useDerivedValue(() => heartCore.value * 2.4);
  const breathTransform = useDerivedValue(() => [{ translateY: flutter.value * breathAmp }]);

  const crack = useMemo(() => {
    if (!layout || !snapshot.isPipped) {
      return null;
    }
    return createPipStar(
      layout.cx,
      layout.cy,
      layout.rx,
      layout.ry,
      snapshot.currentMilestone.stage === 'external_pip' || snapshot.isReadyToHatch,
    );
  }, [layout, snapshot.currentMilestone.stage, snapshot.isPipped, snapshot.isReadyToHatch]);

  // The shell shader and blurred vessel layers are too heavy to redraw at 60 FPS; they only change with the pet clock.
  const pixelRatio = PixelRatio.get();
  const canvasWidth = layout?.canvasWidth ?? 1;
  const canvasHeight = layout?.canvasHeight ?? 1;
  const textureSize = useMemo(
    () => ({
      width: Math.max(1, Math.ceil(canvasWidth * pixelRatio)),
      height: Math.max(1, Math.ceil(canvasHeight * pixelRatio)),
    }),
    [canvasHeight, canvasWidth, pixelRatio],
  );
  const backdrop = useTexture(
    layout && anatomy ? (
      <Group transform={[{ scale: pixelRatio }]}>
        <CandlingBackdrop layout={layout} anatomy={anatomy} palette={palette} />
      </Group>
    ) : (
      <Fill color={CHAMBER} />
    ),
    textureSize,
    [anatomy, palette, pixelRatio, textureSize],
  );

  return (
    <View
      collapsable={false}
      onLayout={handleLayout}
      style={styles.stage}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('candling.chamberLabel')}
      accessibilityHint={t('candling.chamberActive')}>
      <Canvas style={styles.canvas}>
        {layout && anatomy ? (
          <Group>
            <Image image={backdrop} x={0} y={0} width={layout.canvasWidth} height={layout.canvasHeight} fit="fill" />
            <CandlingSubject
              layout={layout}
              anatomy={anatomy}
              stage={stage}
              palette={palette}
              crack={crack}
              motion={{
                yolk: yolkTransform,
                embryo: embryoTransform,
                breath: breathTransform,
                heartCore,
                heartGlow,
              }}
            />
          </Group>
        ) : null}
      </Canvas>
    </View>
  );
}

function sameEgg(current: EggLayout | null, next: EggLayout): boolean {
  return (
    current != null &&
    current.canvasWidth === next.canvasWidth &&
    current.canvasHeight === next.canvasHeight &&
    current.shape === next.shape &&
    current.path === next.path
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: CHAMBER,
  },
  canvas: {
    flex: 1,
  },
});
