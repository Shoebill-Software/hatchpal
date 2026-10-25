import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  Mask,
  Oval,
  Paint,
  Path,
  RadialGradient,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  candlingShellPalette,
  createEmbryoBlob,
  createPipCrackPath,
  createVesselNetwork,
  layoutEgg,
  type EggLayout,
} from '@/components/candlingGeometry';
import { resolveCandlingStage } from '@/components/candling/candlingStages';
import { useTranslation } from '@/i18n';
import type { PetSnapshot, SpeciesConfig } from '@/domain/types';

const CHAMBER = '#070504';
const VESSEL_COLOR = '#8B0000';

export interface CandlingVisualizerProps {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
}

/**
 * Realistic multi-stage candling renderer. The warm amber backlight is always on
 * at full intensity, and the interior evolves day-by-day: a floating yolk shadow,
 * then a branching vascular "spider", then a darkened embryo with an eye spot, and
 * finally a crowded silhouette filling the shell before internal pip.
 */
export function CandlingVisualizer({ snapshot, species }: CandlingVisualizerProps) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<EggLayout | null>(null);
  const palette = candlingShellPalette(species.id);
  const stage = useMemo(
    () => resolveCandlingStage(snapshot.incubationProgress),
    [snapshot.incubationProgress]
  );

  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(drift);
      drift.value = 0;
    };
  }, [drift]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    const next = layoutEgg(width, height);
    setLayout((current) =>
      current && current.canvasWidth === next.canvasWidth && current.canvasHeight === next.canvasHeight
        ? current
        : next
    );
  };

  const driftAmplitude = 2 + stage.movement * 4;
  const yolkTransform = useDerivedValue(() => [
    { translateX: drift.value * driftAmplitude },
    { translateY: Math.abs(drift.value) * driftAmplitude * 0.4 },
  ]);
  const embryoTransform = useDerivedValue(() => [
    { translateX: drift.value * driftAmplitude * 0.7 },
    { translateY: drift.value * driftAmplitude * 0.5 },
  ]);

  const biology = useMemo(() => {
    if (!layout) {
      return null;
    }
    const embryoCx = layout.cx + layout.rx * 0.04;
    const embryoCy = layout.cy + layout.ry * 0.1;
    const embryoSize = layout.rx * (0.18 + stage.embryo * 0.82);
    const vesselSpread = layout.rx * (0.4 + (1 - stage.embryo) * 0.26);
    const airRx = layout.rx * (0.32 + stage.airCell * 0.34);
    const airRy = layout.ry * (0.08 + stage.airCell * 0.14);
    const airCy = layout.cy - layout.ry + airRy * 0.95;
    const yolkRx = layout.rx * (0.7 - stage.embryo * 0.2);
    const yolkRy = layout.ry * (0.56 - stage.embryo * 0.14);
    const yolkCy = layout.cy + layout.ry * 0.08;
    const eyeR = Math.max(2.6, embryoSize * 0.13);
    const crowdR = layout.rx * (0.55 + stage.crowding * 0.6);

    const speckles = [
      [-0.32, -0.18, 0.05, 0.03],
      [0.28, -0.06, 0.04, 0.024],
      [-0.08, 0.12, 0.032, 0.02],
      [0.22, 0.28, 0.036, 0.022],
      [-0.26, 0.34, 0.03, 0.018],
      [0.06, -0.36, 0.026, 0.016],
      [0.34, 0.08, 0.022, 0.014],
      [-0.18, -0.42, 0.024, 0.015],
      [0.16, 0.42, 0.028, 0.017],
    ].map(([ox, oy, orx, ory]) => ({
      x: layout.cx + layout.rx * ox - layout.rx * orx,
      y: layout.cy + layout.ry * oy - layout.ry * ory,
      width: layout.rx * orx * 2,
      height: layout.ry * ory * 2,
    }));

    return {
      embryoPath: createEmbryoBlob(embryoCx, embryoCy, embryoSize),
      vessels: createVesselNetwork(embryoCx, embryoCy, vesselSpread),
      air: {
        x: layout.cx - airRx,
        y: airCy - airRy,
        width: airRx * 2,
        height: airRy * 2,
      },
      yolk: {
        x: layout.cx - yolkRx,
        y: yolkCy - yolkRy,
        width: yolkRx * 2,
        height: yolkRy * 2,
        cx: layout.cx,
        cy: yolkCy,
      },
      eye: {
        cx: embryoCx + embryoSize * 0.3,
        cy: embryoCy - embryoSize * 0.2,
        r: eyeR,
      },
      disc: {
        cx: embryoCx,
        cy: embryoCy,
        r: Math.max(3, layout.rx * 0.07),
      },
      crowd: { cx: layout.cx, cy: layout.cy + layout.ry * 0.06, r: crowdR },
      speckles,
      crack: snapshot.isPipped
        ? createPipCrackPath(
            layout.cx,
            layout.cy,
            layout.rx,
            layout.ry,
            snapshot.currentMilestone.stage === 'external_pip' || snapshot.isReadyToHatch
          )
        : null,
    };
  }, [layout, snapshot, stage.airCell, stage.crowding, stage.embryo]);

  const lightRadius = layout ? Math.max(12, layout.ry * 1.25) : 12;
  const lightCenter = layout ? { x: layout.cx, y: layout.cy } : { x: 0, y: 0 };

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
        <Fill color={CHAMBER} />

        {layout && biology ? (
          <Group>
            <Path path={layout.path} color="#140E0A" />
            <Path
              path={layout.path}
              color={palette.stroke}
              style="stroke"
              strokeWidth={1.15}
              opacity={0.35}
            />

            <Mask
              mode="luminance"
              clip={false}
              mask={
                <Group>
                  <Circle cx={lightCenter.x} cy={lightCenter.y} r={lightRadius}>
                    <RadialGradient
                      c={lightCenter}
                      r={lightRadius}
                      colors={['#FFFFFF', '#F2D2A0', '#000000']}
                      positions={[0, 0.46, 1]}
                    />
                  </Circle>
                </Group>
              }>
              <Group clip={layout.path}>
                <Path path={layout.path} color={palette.interior} />

                <Group transform={yolkTransform} opacity={stage.yolk}>
                  <Oval
                    x={biology.yolk.x}
                    y={biology.yolk.y}
                    width={biology.yolk.width}
                    height={biology.yolk.height}
                    color={palette.yolk}>
                    <RadialGradient
                      c={{ x: biology.yolk.cx, y: biology.yolk.cy }}
                      r={biology.yolk.width * 0.6}
                      colors={[palette.yolk, '#6A3010', palette.interior]}
                      positions={[0, 0.55, 1]}
                    />
                  </Oval>
                </Group>

                {stage.vessels > 0.02 ? (
                  <Group opacity={stage.vessels}>
                    <Path
                      path={biology.vessels.terminalis}
                      color={VESSEL_COLOR}
                      style="stroke"
                      strokeWidth={1.35}
                      strokeCap="round"
                      opacity={0.55}
                    />
                    <Path
                      path={biology.vessels.arteries}
                      color={VESSEL_COLOR}
                      style="stroke"
                      strokeWidth={1.7}
                      strokeCap="round"
                      opacity={0.9}
                    />
                    <Path
                      path={biology.vessels.capillaries}
                      color={VESSEL_COLOR}
                      style="stroke"
                      strokeWidth={0.9}
                      strokeCap="round"
                      opacity={0.62}
                    />
                  </Group>
                ) : (
                  <Circle
                    cx={biology.disc.cx}
                    cy={biology.disc.cy}
                    r={biology.disc.r}
                    color="#C9A46A"
                    opacity={0.28}
                  />
                )}

                {stage.embryo > 0.12 ? (
                  <Group transform={embryoTransform} opacity={clampLayerOpacity(stage.embryo)}>
                    <Group
                      layer={
                        <Paint>
                          <Blur blur={1.6} />
                        </Paint>
                      }>
                      <Path path={biology.embryoPath} color="#120804" opacity={0.82} />
                    </Group>
                    <Path path={biology.embryoPath} color="#1A0C08" opacity={0.72} />
                    {stage.eye > 0.1 ? (
                      <Circle
                        cx={biology.eye.cx}
                        cy={biology.eye.cy}
                        r={biology.eye.r}
                        color="#070504"
                        opacity={stage.eye}
                      />
                    ) : null}
                  </Group>
                ) : null}

                {stage.crowding > 0.01 ? (
                  <Circle
                    cx={biology.crowd.cx}
                    cy={biology.crowd.cy}
                    r={biology.crowd.r}
                    color="#0E0603"
                    opacity={0.35 + stage.crowding * 0.5}
                  />
                ) : null}

                {stage.airCell > 0 ? (
                  <Group>
                    <Oval
                      x={biology.air.x}
                      y={biology.air.y}
                      width={biology.air.width}
                      height={biology.air.height}
                      color="#F4E6C4"
                      opacity={0.22 + stage.airCell * 0.42}
                    />
                    <Oval
                      x={biology.air.x}
                      y={biology.air.y}
                      width={biology.air.width}
                      height={biology.air.height}
                      color="#E8D8A8"
                      style="stroke"
                      strokeWidth={1.1 + stage.airCell * 1.4}
                      opacity={0.4 + stage.airCell * 0.45}
                    />
                  </Group>
                ) : null}

                <Circle cx={lightCenter.x} cy={lightCenter.y} r={lightRadius}>
                  <RadialGradient
                    c={lightCenter}
                    r={lightRadius}
                    colors={[
                      'rgba(255, 214, 150, 0.04)',
                      'rgba(90, 52, 22, 0.38)',
                      'rgba(18, 10, 6, 0.9)',
                    ]}
                    positions={[0, 0.48, 1]}
                  />
                </Circle>
              </Group>
            </Mask>

            <Group clip={layout.path} opacity={0.34}>
              {biology.speckles.map((speckle, index) => (
                <Oval
                  key={`grain-${index}`}
                  x={speckle.x}
                  y={speckle.y}
                  width={speckle.width}
                  height={speckle.height}
                  color={palette.speckle}
                />
              ))}
            </Group>

            <Path
              path={layout.path}
              color={palette.highlight}
              style="stroke"
              strokeWidth={7}
              opacity={0.08}
            />
            {biology.crack ? (
              <Path
                path={biology.crack}
                color="#4A3020"
                style="stroke"
                strokeWidth={snapshot.currentMilestone.stage === 'external_pip' ? 2 : 1.4}
                strokeCap="round"
                opacity={0.85}
              />
            ) : null}
          </Group>
        ) : null}
      </Canvas>
    </View>
  );
}

function clampLayerOpacity(value: number): number {
  return Math.min(1, Math.max(0, 0.55 + value * 0.45));
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
