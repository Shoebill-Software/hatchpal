import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
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
  type SharedValue,
} from 'react-native-reanimated';

import {
  candlingShellPalette,
  createEmbryoBlob,
  createPipCrackPath,
  createVesselNetwork,
  type EggLayout,
} from '@/components/candlingGeometry';
import type { PetSnapshot, SpeciesConfig } from '@/domain/types';

export type CandlingViewProps = {
  snapshot: PetSnapshot;
  species: SpeciesConfig;
  lightX: SharedValue<number>;
  lightY: SharedValue<number>;
  isLightActive: boolean;
  glow: SharedValue<number>;
  eggCx: SharedValue<number>;
  eggCy: SharedValue<number>;
  eggRx: SharedValue<number>;
  eggRy: SharedValue<number>;
  layout: EggLayout | null;
  gesture: GestureType;
  onLayout: (event: LayoutChangeEvent) => void;
};

const VESSEL_COLOR = '#8B0000';
const CHAMBER = '#070504';

export function CandlingView({
  snapshot,
  species,
  lightX,
  lightY,
  isLightActive,
  glow,
  eggCx,
  eggCy,
  eggRx,
  eggRy,
  layout,
  gesture,
  onLayout,
}: CandlingViewProps) {
  const features = snapshot.currentMilestone.candling;
  const palette = candlingShellPalette(species.id);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!features.movementDetectable || !isLightActive) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1320, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1540, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(drift);
      drift.value = 0;
    };
  }, [drift, features.movementDetectable, isLightActive]);

  const lightCenter = useDerivedValue(() => ({
    x: lightX.value,
    y: lightY.value,
  }));

  const lightRadius = useDerivedValue(() => {
    const maxR = Math.max(eggRy.value * 1.2, 1);
    const dx = lightX.value - eggCx.value;
    const dy = lightY.value - eggCy.value;
    const proximity = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxR);
    const cone = eggRy.value * (0.58 + proximity * 0.55);
    return Math.max(10, cone * (0.28 + glow.value * 0.72));
  });

  const interiorOpacity = useDerivedValue(() => glow.value);

  const embryoTransform = useDerivedValue(() => [
    { translateX: drift.value * 2.2 },
    { translateY: drift.value * 1.4 },
  ]);

  const biology = useMemo(() => {
    if (!layout) {
      return null;
    }

    const embryoCx = layout.cx + layout.rx * 0.04;
    const embryoCy = layout.cy + layout.ry * 0.08;
    const embryoSize = layout.rx * (0.16 + features.embryoSilhouettePct * 0.78);
    const vesselSpread = layout.rx * (0.38 + (1 - features.embryoSilhouettePct) * 0.28);
    const airRx = layout.rx * (0.3 + features.airCellPct * 0.36);
    const airRy = layout.ry * (0.07 + features.airCellPct * 0.13);
    const airCy = layout.cy - layout.ry + airRy * 0.95;
    const yolkRx = layout.rx * (0.72 - features.embryoSilhouettePct * 0.18);
    const yolkRy = layout.ry * (0.58 - features.embryoSilhouettePct * 0.12);
    const yolkCy = layout.cy + layout.ry * 0.08;
    const eyeR = Math.max(2.4, embryoSize * 0.12);
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
      embryoCx,
      embryoCy,
      embryoSize,
      embryoPath: createEmbryoBlob(embryoCx, embryoCy, embryoSize),
      vessels: createVesselNetwork(embryoCx, embryoCy, vesselSpread),
      air: {
        x: layout.cx - airRx,
        y: airCy - airRy,
        width: airRx * 2,
        height: airRy * 2,
        rx: airRx,
        ry: airRy,
        cy: airCy,
      },
      yolk: {
        x: layout.cx - yolkRx,
        y: yolkCy - yolkRy,
        width: yolkRx * 2,
        height: yolkRy * 2,
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
  }, [features.airCellPct, features.embryoSilhouettePct, layout, snapshot]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        onLayout={onLayout}
        style={styles.stage}
        accessible
        accessibilityRole="image"
        accessibilityState={{ busy: isLightActive }}
        accessibilityLabel="Durchleuchtungskammer mit Ei"
        accessibilityHint={
          isLightActive
            ? 'Das Ei wird gerade durchleuchtet'
            : 'Finger auf das Ei legen, um das Innere zu beleuchten'
        }>
        <Canvas style={styles.canvas}>
          <Fill color={CHAMBER} />

          {layout ? (
            <Group>
              <Path path={layout.path} color="#140E0A" />
              <Path
                path={layout.path}
                color={palette.stroke}
                style="stroke"
                strokeWidth={1.15}
                opacity={0.35}
              />

              {biology ? (
                <Mask
                  mode="luminance"
                  clip={false}
                  mask={
                    <Group opacity={interiorOpacity}>
                      <Circle cx={lightX} cy={lightY} r={lightRadius}>
                        <RadialGradient
                          c={lightCenter}
                          r={lightRadius}
                          colors={['#FFFFFF', '#F2D2A0', '#000000']}
                          positions={[0, 0.42, 1]}
                        />
                      </Circle>
                    </Group>
                  }>
                  <Group clip={layout.path}>
                    <Path path={layout.path} color={palette.interior} />
                    <Oval
                      x={biology.yolk.x}
                      y={biology.yolk.y}
                      width={biology.yolk.width}
                      height={biology.yolk.height}
                      color={palette.yolk}
                      opacity={0.55}>
                      <RadialGradient
                        c={{ x: layout.cx, y: layout.cy + layout.ry * 0.06 }}
                        r={layout.rx * 0.85}
                        colors={[palette.yolk, '#6A3010', palette.interior]}
                        positions={[0, 0.55, 1]}
                      />
                    </Oval>

                    {features.bloodVesselsVisible ? (
                      <Group opacity={0.82}>
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
                        opacity={0.28 + features.embryoSilhouettePct * 0.2}
                      />
                    )}

                    <Group transform={embryoTransform}>
                      <Group
                        layer={
                          <Paint>
                            <Blur blur={1.6} />
                          </Paint>
                        }>
                        <Path path={biology.embryoPath} color="#120804" opacity={0.82} />
                      </Group>
                      <Path path={biology.embryoPath} color="#1A0C08" opacity={0.72} />
                      {features.eyeSpotVisible ? (
                        <Circle
                          cx={biology.eye.cx}
                          cy={biology.eye.cy}
                          r={biology.eye.r}
                          color="#070504"
                        />
                      ) : null}
                    </Group>

                    {features.airCellPct > 0 ? (
                      <Group>
                        <Oval
                          x={biology.air.x}
                          y={biology.air.y}
                          width={biology.air.width}
                          height={biology.air.height}
                          color="#F4E6C4"
                          opacity={0.22 + features.airCellPct * 0.42}
                        />
                        <Oval
                          x={biology.air.x}
                          y={biology.air.y}
                          width={biology.air.width}
                          height={biology.air.height}
                          color="#E8D8A8"
                          style="stroke"
                          strokeWidth={1.1 + features.airCellPct * 1.4}
                          opacity={0.4 + features.airCellPct * 0.45}
                        />
                      </Group>
                    ) : null}

                    <Group>
                      <Circle cx={lightX} cy={lightY} r={lightRadius}>
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
                  </Group>
                </Mask>
              ) : null}

              {biology ? (
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
              ) : null}

              <Path
                path={layout.path}
                color={palette.highlight}
                style="stroke"
                strokeWidth={7}
                opacity={0.08}
              />
              {biology?.crack ? (
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
    </GestureDetector>
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
