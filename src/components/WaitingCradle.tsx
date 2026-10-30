import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Shader,
  Skia,
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
  CRADLE_FRAME,
  EGG,
  EGG_PATH,
  EGG_PIVOT_Y,
  FRECKLES,
  GROUND_SHADOW,
  MOTES,
  SHELL_RGB,
  SHELL_SHADER,
  cradlePalette,
  type CradleMote,
  type CradlePalette,
} from '@/components/waitingCradleArt';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/** Node and web have no Skia runtime. The nest is the first route, so this must not throw there. */
const SHELL_EFFECT = compileShell();

function compileShell() {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return Skia.RuntimeEffect.Make(SHELL_SHADER);
  } catch {
    return null;
  }
}

/**
 * The vacant cradle's egg: a chalky shell in warm light, breathing just enough
 * to feel alive. The canvas scales a fixed design frame into whatever slot
 * the nest gives it.
 */
export function WaitingCradle() {
  const palette = cradlePalette(useColorScheme());
  const reduceMotion = useReduceMotion();
  const motion = useCradleMotion(reduceMotion);
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      collapsable={false}
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}>
      {size.width > 1 && size.height > 1 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <CradlePaint
          width={size.width}
          height={size.height}
          palette={palette}
          motion={motion}
          reduceMotion={reduceMotion}
        />
        </Canvas>
      ) : null}
    </View>
  );
}

function useCradleMotion(reduceMotion: boolean) {
  const breath = useSharedValue(0.5);
  const glow = useSharedValue(0.55);
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      cancelAnimation(glow);
      cancelAnimation(clock);
      breath.value = 0.5;
      glow.value = 0.62;
      clock.value = 0.2;
    } else {
      breath.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      clock.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    }
    return () => {
      cancelAnimation(breath);
      cancelAnimation(glow);
      cancelAnimation(clock);
    };
  }, [breath, clock, glow, reduceMotion]);

  return { breath, glow, clock };
}

function CradlePaint({
  width,
  height,
  palette,
  motion,
  reduceMotion,
}: {
  width: number;
  height: number;
  palette: CradlePalette;
  motion: { breath: SharedValue<number>; glow: SharedValue<number>; clock: SharedValue<number> };
  reduceMotion: boolean;
}) {
  const scale = Math.min(width / CRADLE_FRAME.width, height / CRADLE_FRAME.height);
  const fit = [
    { translateX: (width - CRADLE_FRAME.width * scale) / 2 },
    { translateY: (height - CRADLE_FRAME.height * scale) / 2 },
    { scale },
  ];
  const pose = useDerivedValue(() => {
    const settle = 0.994 + motion.breath.value * 0.012;
    return [
      { translateX: EGG.cx },
      { translateY: EGG_PIVOT_Y },
      { rotate: EGG.lean },
      { scale: settle },
      { translateX: -EGG.cx },
      { translateY: -EGG_PIVOT_Y },
    ];
  });
  const aura = useDerivedValue(() => 0.76 + motion.glow.value * 0.24);
  const halo = useDerivedValue(() => palette.haloStrength * (0.62 + motion.glow.value * 0.55));
  const uniforms = useDerivedValue(() => ({
    center: [EGG.cx, EGG.cy],
    radii: [EGG.rx, EGG.ry],
    warmth: 0.4 + motion.glow.value * 0.6,
    room,
    lit: [...SHELL_RGB.lit],
    mid: [...SHELL_RGB.mid],
    shade: [...SHELL_RGB.shade],
    deep: [...SHELL_RGB.deep],
    blush: [...SHELL_RGB.blush],
    ember: [...SHELL_RGB.ember],
    freckle: [...SHELL_RGB.freckle],
  }));
  const moteStrength = palette.scheme === 'dark' ? 0.9 : 0.5;
  const room = palette.scheme === 'dark' ? 1 : 0;

  return (
    <Group transform={fit}>
      <Circle cx={EGG.cx} cy={EGG.cy + 6} r={176} opacity={aura}>
        <RadialGradient
          c={{ x: EGG.cx, y: EGG.cy + 6 }}
          r={176}
          colors={[palette.glow[0], palette.glow[1]]}
          positions={[0.12, 1]}
        />
      </Circle>
      {MOTES.filter((mote) => !mote.front).map((mote) => (
        <DustMote
          key={`${mote.x}-${mote.y}`}
          mote={mote}
          clock={motion.clock}
          strength={moteStrength}
          palette={palette}
          still={reduceMotion}
        />
      ))}
      <Oval
        x={GROUND_SHADOW.cx - GROUND_SHADOW.rx}
        y={GROUND_SHADOW.cy - GROUND_SHADOW.ry}
        width={GROUND_SHADOW.rx * 2}
        height={GROUND_SHADOW.ry * 2}
        color={palette.shadow}
        opacity={palette.shadowStrength}>
        <BlurMask blur={18} style="normal" />
      </Oval>
      <Group transform={pose}>
        <Group transform={[{ translateX: 10 }, { translateY: 18 }]}>
          <Path path={EGG_PATH} color={palette.shadow} opacity={palette.scheme === 'dark' ? 0.55 : 0.2}>
            <BlurMask blur={16} style="normal" />
          </Path>
        </Group>
        <Path path={EGG_PATH} color={palette.halo} opacity={halo}>
          <BlurMask blur={18} style="outer" />
        </Path>
        <Group clip={EGG_PATH}>
          <Fill>
            {SHELL_EFFECT ? (
              <Shader source={SHELL_EFFECT} uniforms={uniforms} />
            ) : (
              <RadialGradient
                c={{ x: EGG.cx - 16, y: EGG.cy - 28 }}
                r={EGG.ry}
                colors={[palette.shell[0], palette.shell[1], palette.shell[2]]}
              />
            )}
          </Fill>
          {FRECKLES.map((mark) => (
            <Oval
              key={`${mark.x}-${mark.y}`}
              x={mark.x - mark.rx}
              y={mark.y - mark.ry}
              width={mark.rx * 2}
              height={mark.ry * 2}
              color={palette.freckle}
              opacity={mark.opacity}
            />
          ))}
        </Group>
        <Path path={EGG_PATH} style="stroke" strokeWidth={1.35}>
          <LinearGradient
            start={{ x: EGG.cx - EGG.rx, y: EGG.cy - EGG.ry }}
            end={{ x: EGG.cx + EGG.rx, y: EGG.cy + EGG.ry }}
            colors={[palette.rim[0], palette.rim[1], palette.rim[2]]}
            positions={[0, 0.45, 1]}
          />
        </Path>
      </Group>
      {MOTES.filter((mote) => mote.front).map((mote) => (
        <DustMote
          key={`${mote.x}-${mote.y}`}
          mote={mote}
          clock={motion.clock}
          strength={moteStrength}
          palette={palette}
          still={reduceMotion}
        />
      ))}
    </Group>
  );
}

function DustMote({
  mote,
  clock,
  strength,
  palette,
  still,
}: {
  mote: CradleMote;
  clock: SharedValue<number>;
  strength: number;
  palette: CradlePalette;
  still: boolean;
}) {
  const transform = useDerivedValue(() => {
    if (still) {
      return [{ translateX: mote.x }, { translateY: mote.y }];
    }
    const turn = (clock.value + mote.phase) * Math.PI * 2;
    return [
      { translateX: mote.x + Math.cos(turn) * mote.drift * 0.35 },
      { translateY: mote.y + Math.sin(turn) * mote.drift },
    ];
  });
  const opacity = useDerivedValue(() => {
    if (still) {
      return 0.72 * strength;
    }
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((clock.value * 2 + mote.phase) * Math.PI * 2));
    return twinkle * strength;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={mote.r * 3.2}>
        <RadialGradient
          c={{ x: 0, y: 0 }}
          r={mote.r * 3.2}
          colors={[palette.moteCore, palette.moteEdge]}
          positions={[0.15, 1]}
        />
      </Circle>
    </Group>
  );
}
