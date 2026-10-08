import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import type { TutorialTargetId } from '@/constants/tutorial';

import { sameTutorialRect, type TutorialRect } from './spotlightGeometry';

export type TutorialAnchorMap = Partial<Record<TutorialTargetId, TutorialRect>>;

type MeasureHost = {
  measure: (
    callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void
  ) => void;
};

type TutorialAnchorApi = {
  registerAnchor: (id: TutorialTargetId, rect: TutorialRect) => void;
  clearAnchor: (id: TutorialTargetId) => void;
  registerMeasurer: (id: TutorialTargetId, measure: () => void) => void;
  unregisterMeasurer: (id: TutorialTargetId) => void;
  remeasureAnchors: () => void;
};

const AnchorApiContext = createContext<TutorialAnchorApi | null>(null);
const AnchorMapContext = createContext<TutorialAnchorMap>({});

export function TutorialAnchorProvider({ children }: { children: ReactNode }) {
  const [anchors, setAnchors] = useState<TutorialAnchorMap>({});
  const measurers = useRef(new Map<TutorialTargetId, () => void>());

  const registerAnchor = useCallback((id: TutorialTargetId, rect: TutorialRect) => {
    setAnchors((current) => {
      const previous = current[id];
      if (previous && sameTutorialRect(previous, rect)) {
        return current;
      }
      return { ...current, [id]: rect };
    });
  }, [setAnchors]);

  const clearAnchor = useCallback((id: TutorialTargetId) => {
    setAnchors((current) => {
      if (current[id] == null) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, [setAnchors]);

  const registerMeasurer = useCallback((id: TutorialTargetId, measure: () => void) => {
    measurers.current.set(id, measure);
  }, []);

  const unregisterMeasurer = useCallback((id: TutorialTargetId) => {
    measurers.current.delete(id);
  }, []);

  const remeasureAnchors = useCallback(() => {
    measurers.current.forEach((measure) => {
      measure();
    });
  }, []);

  const api = useMemo<TutorialAnchorApi>(
    () => ({
      registerAnchor,
      clearAnchor,
      registerMeasurer,
      unregisterMeasurer,
      remeasureAnchors,
    }),
    [clearAnchor, registerAnchor, registerMeasurer, remeasureAnchors, unregisterMeasurer]
  );

  return (
    <AnchorApiContext.Provider value={api}>
      <AnchorMapContext.Provider value={anchors}>{children}</AnchorMapContext.Provider>
    </AnchorApiContext.Provider>
  );
}

export function useTutorialAnchors(): TutorialAnchorMap {
  return useContext(AnchorMapContext);
}

export function useTutorialRemeasure(): () => void {
  const api = useContext(AnchorApiContext);
  return useCallback(() => {
    api?.remeasureAnchors();
  }, [api]);
}

export function useTutorialAnchor(targetId: TutorialTargetId | null): {
  ref: RefObject<ComponentRef<typeof View> | null>;
  onLayout: () => void;
} {
  const api = useContext(AnchorApiContext);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const targetRef = useRef(targetId);
  const apiRef = useRef(api);
  targetRef.current = targetId;
  apiRef.current = api;

  const publish = useCallback(() => {
    const id = targetRef.current;
    const currentApi = apiRef.current;
    const host = asMeasureHost(ref.current);
    if (!id || !currentApi || !host) {
      return;
    }
    host.measure((x, y, width, height, pageX, pageY) => {
      if (targetRef.current !== id) {
        return;
      }
      if (width < 1 || height < 1 || !Number.isFinite(pageX) || !Number.isFinite(pageY)) {
        return;
      }
      currentApi.registerAnchor(id, { x, y, width, height, pageX, pageY });
    });
  }, []);

  useEffect(() => {
    if (!targetId || !api) {
      return;
    }
    api.registerMeasurer(targetId, publish);
    const frame = requestAnimationFrame(publish);
    return () => {
      cancelAnimationFrame(frame);
      api.unregisterMeasurer(targetId);
      api.clearAnchor(targetId);
    };
  }, [api, publish, targetId]);

  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (!targetId) {
      return;
    }
    const frame = requestAnimationFrame(publish);
    return () => cancelAnimationFrame(frame);
  }, [height, publish, targetId, width]);

  return { ref, onLayout: publish };
}

export function TutorialAnchor({
  targetId,
  children,
  style,
}: {
  targetId: TutorialTargetId;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { ref, onLayout } = useTutorialAnchor(targetId);
  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={style}>
      {children}
    </View>
  );
}

function asMeasureHost(node: ComponentRef<typeof View> | null): MeasureHost | null {
  if (node == null || typeof node !== 'object' || !('measure' in node)) {
    return null;
  }
  const candidate = node as { measure?: MeasureHost['measure'] };
  if (typeof candidate.measure !== 'function') {
    return null;
  }
  return { measure: candidate.measure };
}
