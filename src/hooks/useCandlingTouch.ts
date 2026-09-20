import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { layoutEgg, type EggLayout } from '@/components/candlingGeometry';

export type CandlingLightMode = 'manual' | 'fixed';

export type CandlingTouchController = {
  lightX: SharedValue<number>;
  lightY: SharedValue<number>;
  glow: SharedValue<number>;
  eggCx: SharedValue<number>;
  eggCy: SharedValue<number>;
  eggRx: SharedValue<number>;
  eggRy: SharedValue<number>;
  layout: EggLayout | null;
  isTouching: boolean;
  isIlluminated: boolean;
  gesture: ReturnType<typeof Gesture.Pan>;
  handleLayout: (event: LayoutChangeEvent) => void;
};

export type UseCandlingTouchOptions = {
  mode: CandlingLightMode;
  enabled?: boolean;
  onTouchBegin?: () => void;
  onTouchEnd?: () => void;
};

export function useCandlingTouch({
  mode,
  enabled = true,
  onTouchBegin,
  onTouchEnd,
}: UseCandlingTouchOptions): CandlingTouchController {
  const lightX = useSharedValue(0);
  const lightY = useSharedValue(0);
  const glow = useSharedValue(0);
  const eggCx = useSharedValue(0);
  const eggCy = useSharedValue(0);
  const eggRx = useSharedValue(0);
  const eggRy = useSharedValue(0);
  const modeIsFixed = useSharedValue(mode === 'fixed' ? 1 : 0);
  const gestureEnabled = useSharedValue(enabled && mode === 'manual' ? 1 : 0);
  const ignoreTouch = useSharedValue(0);

  const [layout, setLayout] = useState<EggLayout | null>(null);
  const [isTouching, setIsTouching] = useState(false);

  const onTouchBeginRef = useRef(onTouchBegin);
  onTouchBeginRef.current = onTouchBegin;
  const onTouchEndRef = useRef(onTouchEnd);
  onTouchEndRef.current = onTouchEnd;

  const notifyBegin = useCallback(() => {
    setIsTouching(true);
    onTouchBeginRef.current?.();
  }, []);

  const notifyEnd = useCallback(() => {
    setIsTouching(false);
    onTouchEndRef.current?.();
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width <= 0 || height <= 0) {
        return;
      }
      const next = layoutEgg(width, height);
      setLayout(next);
      eggCx.value = next.cx;
      eggCy.value = next.cy;
      eggRx.value = next.rx;
      eggRy.value = next.ry;
      if (mode === 'fixed') {
        lightX.value = next.cx;
        lightY.value = next.cy;
        glow.value = 1;
      }
    },
    [eggCx, eggCy, eggRx, eggRy, glow, lightX, lightY, mode]
  );

  useEffect(() => {
    modeIsFixed.value = mode === 'fixed' ? 1 : 0;
    gestureEnabled.value = enabled && mode === 'manual' ? 1 : 0;
  }, [enabled, gestureEnabled, mode, modeIsFixed]);

  useEffect(() => {
    if (mode !== 'fixed') {
      return;
    }
    setIsTouching(false);
    glow.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    if (layout) {
      lightX.value = withTiming(layout.cx, { duration: 280, easing: Easing.out(Easing.cubic) });
      lightY.value = withTiming(layout.cy, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [glow, layout, lightX, lightY, mode]);

  useEffect(() => {
    if (mode !== 'manual') {
      return;
    }
    setIsTouching(false);
    glow.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [glow, mode]);

  useEffect(() => {
    return () => {
      glow.value = 0;
      ignoreTouch.value = 0;
    };
  }, [glow, ignoreTouch]);

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onBegin((event) => {
        if (gestureEnabled.value !== 1) {
          ignoreTouch.value = 1;
          return;
        }
        const rx = Math.max(eggRx.value, 1);
        const ry = Math.max(eggRy.value, 1);
        const nx = (event.x - eggCx.value) / rx;
        const ny = (event.y - eggCy.value) / ry;
        const inside = nx * nx + ny * ny <= 1.06 * 1.06;
        if (!inside) {
          ignoreTouch.value = 1;
          return;
        }
        ignoreTouch.value = 0;
        lightX.value = event.x;
        lightY.value = event.y;
        glow.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
        scheduleOnRN(notifyBegin);
      })
      .onChange((event) => {
        if (ignoreTouch.value === 1 || gestureEnabled.value !== 1) {
          return;
        }
        lightX.value = lightX.value + (event.x - lightX.value) * 0.38;
        lightY.value = lightY.value + (event.y - lightY.value) * 0.38;
      })
      .onFinalize(() => {
        if (ignoreTouch.value === 1) {
          ignoreTouch.value = 0;
          return;
        }
        if (modeIsFixed.value === 1) {
          return;
        }
        glow.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
        scheduleOnRN(notifyEnd);
      });
  }, [
    eggCx,
    eggCy,
    eggRx,
    eggRy,
    gestureEnabled,
    glow,
    ignoreTouch,
    lightX,
    lightY,
    modeIsFixed,
    notifyBegin,
    notifyEnd,
  ]);

  return {
    lightX,
    lightY,
    glow,
    eggCx,
    eggCy,
    eggRx,
    eggRy,
    layout,
    isTouching,
    isIlluminated: mode === 'fixed' || isTouching,
    gesture,
    handleLayout,
  };
}
