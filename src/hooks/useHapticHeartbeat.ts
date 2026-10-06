import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { subscribeHapticHeartbeat } from './hapticHeartbeat';

export type UseHapticHeartbeatOptions = {
  bpm: number;
  active: boolean;
  pulseImmediately?: boolean;
  onPulse?: () => void;
};

export function useHapticHeartbeat({
  bpm,
  active,
  pulseImmediately = true,
  onPulse,
}: UseHapticHeartbeatOptions): void {
  const inFlightRef = useRef(false);
  const onPulseRef = useRef(onPulse);
  onPulseRef.current = onPulse;

  useEffect(() => {
    if (!active) {
      return;
    }

    let appActive = AppState.currentState === 'active';
    let stop: (() => void) | null = null;

    const pulse = (): void => {
      onPulseRef.current?.();
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      void (async () => {
        try {
          await triggerImpact(ImpactFeedbackStyle.Light);
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
