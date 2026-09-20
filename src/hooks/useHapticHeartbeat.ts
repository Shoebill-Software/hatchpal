import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { subscribeHapticHeartbeat } from './hapticHeartbeat';

export type UseHapticHeartbeatOptions = {
  bpm: number;
  active: boolean;
  pulseImmediately?: boolean;
};

export function useHapticHeartbeat({
  bpm,
  active,
  pulseImmediately = true,
}: UseHapticHeartbeatOptions): void {
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    let appActive = AppState.currentState === 'active';
    let stop: (() => void) | null = null;

    const pulse = (): void => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      void (async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } finally {
          inFlightRef.current = false;
        }
      })();
    };

    const halt = (): void => {
      if (stop) {
        stop();
        stop = null;
      }
    };

    const start = (): void => {
      if (stop != null || !appActive) {
        return;
      }
      stop = subscribeHapticHeartbeat({
        bpm,
        pulse,
        pulseImmediately,
      });
    };

    start();

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      appActive = status === 'active';
      if (appActive) {
        start();
      } else {
        halt();
      }
    });

    return () => {
      halt();
      subscription.remove();
    };
  }, [active, bpm, pulseImmediately]);
}
