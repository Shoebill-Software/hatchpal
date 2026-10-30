import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Canvas, DiffRect, RoundedRect, rect, rrect } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
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
  NEST_TUTORIAL_STEP_COUNT,
  SPOTLIGHT_MOVE_MS,
  SPOTLIGHT_VEIL,
  TUTORIAL_HELLO_TAPS,
  clampTutorialStep,
  type NestTutorialStep,
  type PipMood,
} from '@/constants/tutorial';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { usePreferencesStore, type TutorialSignal } from '@/store/usePreferencesStore';

import { spotlightHole, type SpotlightHole } from './spotlightGeometry';
import { TutorialTooltip } from './TutorialTooltip';
import { useTutorialAnchors, useTutorialRemeasure } from './TutorialAnchor';

const MOVE = { duration: SPOTLIGHT_MOVE_MS, easing: Easing.out(Easing.cubic) };
/** The floating tab bar stays above this overlay, so cards keep clear of it. */
const TAB_BAR_CLEARANCE = Platform.select({ ios: 104, android: 84, default: 84 }) ?? 84;

type Frame = { x: number; y: number; width: number; height: number };

type Reaction = { key: TranslationKey; mood: PipMood };

const BROOD_REACTIONS: Record<string, Reaction> = {
  perfect: { key: 'tutorial.warm.perfect', mood: 'wow' },
  cozy: { key: 'tutorial.warm.cozy', mood: 'happy' },
  toasty: { key: 'tutorial.warm.toasty', mood: 'wink' },
  chilly: { key: 'tutorial.warm.chilly', mood: 'talk' },
};

const MIST_REACTIONS: Record<string, Reaction> = {
  perfect: { key: 'tutorial.mist.perfect', mood: 'wow' },
  dewy: { key: 'tutorial.mist.dewy', mood: 'happy' },
  soggy: { key: 'tutorial.mist.soggy', mood: 'wink' },
  dry: { key: 'tutorial.mist.dry', mood: 'talk' },
};

/** Picks Pip's reply when a signal finishes the step it was waiting on. */
function reactionFor(step: NestTutorialStep, signal: TutorialSignal, taps: number): Reaction | null {
  if (step.waitFor !== signal.action) {
    return null;
  }
  switch (signal.action) {
    case 'egg_taps':
      return taps >= TUTORIAL_HELLO_TAPS ? { key: 'tutorial.hello.done', mood: 'happy' } : null;
    case 'brood':
      return BROOD_REACTIONS[signal.detail ?? ''] ?? BROOD_REACTIONS.cozy ?? null;
    case 'mist':
      return MIST_REACTIONS[signal.detail ?? ''] ?? MIST_REACTIONS.dewy ?? null;
  }
}

/**
 * In-screen coach mark. Unlike a modal it lets touches through the hole, so
 * hands-on steps can wait for the player to brood, mist, or tap the egg.
 */
export function SpotlightOverlay({ nickname }: { nickname: string }) {
  const active = usePreferencesStore((state) => state.isTutorialActive);
  const focused = useIsFocused();
  if (!active || !focused) {
    return null;
  }
  return <ActiveSpotlight nickname={nickname} />;
}

function ActiveSpotlight({ nickname }: { nickname: string }) {
  const { t } = useTranslation();
  const stepIndex = usePreferencesStore((state) => state.currentTutorialStep);
  const signal = usePreferencesStore((state) => state.tutorialSignal);
  const skipTutorial = usePreferencesStore((state) => state.skipTutorial);
  const nextTutorialStep = usePreferencesStore((state) => state.nextTutorialStep);
  const anchors = useTutorialAnchors();
  const remeasure = useTutorialRemeasure();
  const reduceMotion = useReduceMotion();
  const window = useWindowDimensions();
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  const [frame, setFrame] = useState<Frame>({ x: 0, y: 0, width: window.width, height: window.height });
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [taps, setTaps] = useState(0);
  const placed = useRef(false);

  const frameW = useSharedValue(window.width);
  const frameH = useSharedValue(window.height);
  const holeX = useSharedValue(window.width / 2);
  const holeY = useSharedValue(window.height / 2);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);
  const holeR = useSharedValue(16);
  const pulse = useSharedValue(1);

  const index = clampTutorialStep(stepIndex);
  const step = NEST_TUTORIAL_STEPS[index] ?? NEST_TUTORIAL_STEPS[0];
  const anchor = step.target ? anchors[step.target] : undefined;
  const hole: SpotlightHole | null =
    step.target && anchor && frame.width > 0 ? spotlightHole(anchor, frame.x, frame.y, step.target) : null;
  const waiting = step.waitFor != null && reaction == null;
  const passThrough = waiting && hole != null;

  useEffect(() => {
    setReaction(null);
    setTaps(0);
  }, [index]);

  useEffect(() => {
    if (!signal || reaction) {
      return;
    }
    const nextTaps = signal.action === 'egg_taps' && step.waitFor === 'egg_taps' ? taps + 1 : taps;
    if (nextTaps !== taps) {
      setTaps(nextTaps);
    }
    const reply = reactionFor(step, signal, nextTaps);
    if (reply) {
      setReaction(reply);
    }
    // Each signal is consumed once, keyed by its nonce.
  }, [signal?.nonce]);

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

  const targetX = hole?.x ?? null;
  const targetY = hole?.y ?? null;
  const targetW = hole?.width ?? null;
  const targetH = hole?.height ?? null;
  const targetR = hole?.radius ?? null;

  useEffect(() => {
    const duration = reduceMotion || !placed.current ? 0 : MOVE.duration;
    const easing = MOVE.easing;
    if (targetX == null || targetY == null || targetW == null || targetH == null || targetR == null) {
      if (step.target == null) {
        holeX.value = withTiming(frame.width / 2, { duration, easing });
        holeY.value = withTiming(frame.height / 2, { duration, easing });
        holeW.value = withTiming(0, { duration, easing });
        holeH.value = withTiming(0, { duration, easing });
      }
      return;
    }
    holeX.value = withTiming(targetX, { duration, easing });
    holeY.value = withTiming(targetY, { duration, easing });
    holeW.value = withTiming(targetW, { duration, easing });
    holeH.value = withTiming(targetH, { duration, easing });
    holeR.value = withTiming(targetR, { duration, easing });
    placed.current = true;
  }, [
    frame.height,
    frame.width,
    holeH,
    holeR,
    holeW,
    holeX,
    holeY,
    reduceMotion,
    step.target,
    targetH,
    targetR,
    targetW,
    targetX,
    targetY,
  ]);

  const outer = useDerivedValue(() => rrect(rect(-8, -8, frameW.value + 16, frameH.value + 16), 0, 0));
  const inner = useDerivedValue(() =>
    rrect(
      rect(holeX.value, holeY.value, Math.max(0, holeW.value), Math.max(0, holeH.value)),
      Math.max(0, holeR.value),
      Math.max(0, holeR.value)
    )
  );
  const rimOpacity = useDerivedValue(() => (holeW.value < 4 || holeH.value < 4 ? 0 : 0.45 + pulse.value * 0.55));
  const glowOpacity = useDerivedValue(() => (holeW.value < 4 || holeH.value < 4 ? 0 : 0.16 + pulse.value * 0.28));

  const title = t(step.titleKey, { name: nickname });
  const body = reaction ? t(reaction.key) : t(step.bodyKey, { name: nickname });
  const mood = reaction?.mood ?? step.mood;

  return (
    <Animated.View
      pointerEvents="box-none"
      entering={reduceMotion ? undefined : FadeIn.duration(260)}
      exiting={reduceMotion ? undefined : FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, styles.host]}>
      <View ref={hostRef} collapsable={false} onLayout={syncFrame} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <NestStatusBar variant="light" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {frame.width > 0 ? (
          <Canvas style={[StyleSheet.absoluteFill, { width: frame.width, height: frame.height }]} pointerEvents="none">
            <DiffRect inner={inner} outer={outer} color={SPOTLIGHT_VEIL} />
            <RoundedRect x={holeX} y={holeY} width={holeW} height={holeH} r={holeR} style="stroke" strokeWidth={8} color={step.rim} opacity={glowOpacity} />
            <RoundedRect x={holeX} y={holeY} width={holeW} height={holeH} r={holeR} style="stroke" strokeWidth={2} color={step.rim} opacity={rimOpacity} />
          </Canvas>
        ) : null}
      </View>
      {passThrough && hole ? (
        <HoleBlockers hole={hole} width={frame.width} height={frame.height} />
      ) : waiting ? null : (
        <Blocker style={StyleSheet.absoluteFill} />
      )}
      {frame.width > 0 ? (
        <TutorialTooltip
          step={step}
          index={index}
          total={NEST_TUTORIAL_STEP_COUNT}
          title={title}
          body={body}
          mood={mood}
          waiting={waiting}
          progress={step.waitFor === 'egg_taps' ? { done: Math.min(taps, TUTORIAL_HELLO_TAPS), total: TUTORIAL_HELLO_TAPS } : undefined}
          hole={hole}
          screenWidth={frame.width}
          screenHeight={frame.height}
          bottomClearance={TAB_BAR_CLEARANCE}
          reduceMotion={reduceMotion}
          onSkip={skipTutorial}
          onNext={nextTutorialStep}
        />
      ) : null}
      </View>
    </Animated.View>
  );
}

/** Four touch-eating panes around the hole; the hole itself stays live. */
function HoleBlockers({ hole, width, height }: { hole: SpotlightHole; width: number; height: number }) {
  const top = Math.max(0, hole.y);
  const bottom = Math.min(height, hole.y + hole.height);
  const left = Math.max(0, hole.x);
  const right = Math.min(width, hole.x + hole.width);
  return (
    <>
      <Blocker style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top }} />
      <Blocker style={{ position: 'absolute', left: 0, right: 0, top: bottom, bottom: 0 }} />
      <Blocker style={{ position: 'absolute', left: 0, width: left, top, height: bottom - top }} />
      <Blocker style={{ position: 'absolute', left: right, right: 0, top, height: bottom - top }} />
    </>
  );
}

function Blocker({ style }: { style: object }) {
  return (
    <View
      accessible={false}
      collapsable={false}
      importantForAccessibility="no-hide-descendants"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      style={[style, styles.blocker]}
    />
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
    zIndex: 9999,
    elevation: 24,
  },
  blocker: {
    backgroundColor: 'transparent',
  },
});
