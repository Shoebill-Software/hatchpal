import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Canvas, DiffRect, RoundedRect, rect, rrect } from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NestStatusBar } from '@/components/NestStatusBar';
import {
  NEST_TUTORIAL_STEPS,
  SPOTLIGHT_MOVE_MS,
  SPOTLIGHT_VEIL,
  clampTutorialStep,
} from '@/constants/tutorial';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { usePreferencesStore } from '@/store/usePreferencesStore';

import { spotlightHole, type SpotlightHole } from './spotlightGeometry';
import { TutorialTooltip } from './TutorialTooltip';
import { useTutorialAnchors, useTutorialRemeasure } from './TutorialAnchor';

const MOVE = { duration: SPOTLIGHT_MOVE_MS, easing: Easing.out(Easing.cubic) };

type Frame = { x: number; y: number; width: number; height: number };

/**
 * Full-screen coach mark. A translucent modal covers the native tab bar and both
 * system bars; the hole is positioned from page coordinates minus this overlay's origin.
 */
export function SpotlightOverlay() {
  const active = usePreferencesStore((state) => state.isTutorialActive);
  const focused = useIsFocused();
  if (!active || !focused) {
    return null;
  }
  return <ActiveSpotlight />;
}

function ActiveSpotlight() {
  const stepIndex = usePreferencesStore((state) => state.currentTutorialStep);
  const skipTutorial = usePreferencesStore((state) => state.skipTutorial);
  const nextTutorialStep = usePreferencesStore((state) => state.nextTutorialStep);
  const previousTutorialStep = usePreferencesStore((state) => state.previousTutorialStep);
  const completeTutorial = usePreferencesStore((state) => state.completeTutorial);
  const anchors = useTutorialAnchors();
  const remeasure = useTutorialRemeasure();
  const reduceMotion = useReduceMotion();
  const window = useWindowDimensions();
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  const [frame, setFrame] = useState<Frame>({ x: 0, y: 0, width: window.width, height: window.height });
  const placed = useRef(false);

  const frameW = useSharedValue(window.width);
  const frameH = useSharedValue(window.height);
  const holeX = useSharedValue(0);
  const holeY = useSharedValue(0);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);
  const holeR = useSharedValue(16);
  const pulse = useSharedValue(1);

  const index = clampTutorialStep(stepIndex);
  const step = NEST_TUTORIAL_STEPS[index] ?? NEST_TUTORIAL_STEPS[0];
  const anchor = anchors[step.target];
  const hole: SpotlightHole | null =
    anchor && frame.width > 0 ? spotlightHole(anchor, frame.x, frame.y, step.target) : null;
  const targetX = hole?.x ?? null;
  const targetY = hole?.y ?? null;
  const targetW = hole?.width ?? null;
  const targetH = hole?.height ?? null;
  const targetR = hole?.radius ?? null;

  const syncFrame = useCallback(
    (event?: LayoutChangeEvent) => {
      const layout = event?.nativeEvent.layout;
      const apply = (next: Frame) => {
        if (next.width < 1 || next.height < 1) {
          return;
        }
        frameW.value = next.width;
        frameH.value = next.height;
        setFrame((current) => (sameFrame(current, next) ? current : next));
      };
      const node = hostRef.current;
      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((x, y, width, height) => {
          if (width < 1 || height < 1) {
            if (layout && layout.width > 0 && layout.height > 0) {
              apply({ x: 0, y: 0, width: layout.width, height: layout.height });
            }
            return;
          }
          apply({ x, y, width, height });
        });
        return;
      }
      if (layout && layout.width > 0 && layout.height > 0) {
        apply({ x: 0, y: 0, width: layout.width, height: layout.height });
      }
    },
    [frameH, frameW]
  );

  useEffect(() => {
    remeasure();
    const early = setTimeout(remeasure, 32);
    const late = setTimeout(remeasure, reduceMotion ? 240 : 360);
    return () => {
      clearTimeout(early);
      clearTimeout(late);
    };
  }, [index, reduceMotion, remeasure]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 880 }), withTiming(1, { duration: 880 })),
      -1,
      false
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [index, pulse, reduceMotion]);

  useEffect(() => {
    if (targetX == null || targetY == null || targetW == null || targetH == null || targetR == null) {
      return;
    }
    const duration = reduceMotion || !placed.current ? 0 : MOVE.duration;
    const easing = MOVE.easing;
    holeX.value = withTiming(targetX, { duration, easing });
    holeY.value = withTiming(targetY, { duration, easing });
    holeW.value = withTiming(targetW, { duration, easing });
    holeH.value = withTiming(targetH, { duration, easing });
    holeR.value = withTiming(targetR, { duration, easing });
    placed.current = true;
  }, [holeH, holeR, holeW, holeX, holeY, reduceMotion, targetH, targetR, targetW, targetX, targetY]);

  const outer = useDerivedValue(() => rrect(rect(-8, -8, frameW.value + 16, frameH.value + 16), 0, 0));
  const inner = useDerivedValue(() =>
    rrect(rect(holeX.value, holeY.value, Math.max(0, holeW.value), Math.max(0, holeH.value)), Math.max(0, holeR.value), Math.max(0, holeR.value))
  );
  const rimOpacity = useDerivedValue(() => {
    if (holeW.value < 4 || holeH.value < 4) {
      return 0;
    }
    return 0.45 + pulse.value * 0.55;
  });
  const glowOpacity = useDerivedValue(() => {
    if (holeW.value < 4 || holeH.value < 4) {
      return 0;
    }
    return 0.16 + pulse.value * 0.28;
  });

  return (
    <Modal
      visible
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      supportedOrientations={['portrait']}
      onRequestClose={skipTutorial}
      onShow={remeasure}>
      <View ref={hostRef} collapsable={false} onLayout={syncFrame} style={styles.host}>
        <NestStatusBar variant="light" />
        {frame.width > 0 ? (
          <Canvas style={{ width: frame.width, height: frame.height }} pointerEvents="none">
            <DiffRect inner={inner} outer={outer} color={SPOTLIGHT_VEIL} />
            <RoundedRect
              x={holeX}
              y={holeY}
              width={holeW}
              height={holeH}
              r={holeR}
              style="stroke"
              strokeWidth={8}
              color={step.rim}
              opacity={glowOpacity}
            />
            <RoundedRect
              x={holeX}
              y={holeY}
              width={holeW}
              height={holeH}
              r={holeR}
              style="stroke"
              strokeWidth={2}
              color={step.rim}
              opacity={rimOpacity}
            />
          </Canvas>
        ) : null}
        <View
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
          onStartShouldSetResponder={() => true}
        />
        {frame.width > 0 ? (
          <TutorialTooltip
            stepIndex={index}
            hole={hole}
            screenWidth={frame.width}
            screenHeight={frame.height}
            reduceMotion={reduceMotion}
            onSkip={skipTutorial}
            onBack={previousTutorialStep}
            onNext={nextTutorialStep}
            onComplete={completeTutorial}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function sameFrame(a: Frame, b: Frame): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    zIndex: 9999,
    elevation: 24,
  },
});
