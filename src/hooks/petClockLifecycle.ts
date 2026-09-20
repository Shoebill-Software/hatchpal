export const PET_CLOCK_TICK_INTERVAL_MS = 30_000;

export type PetClockAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension' | string;

export type PetClockLifecycleOptions = {
  addAppStateListener: (listener: (status: PetClockAppState) => void) => () => void;
  onForeground: () => void;
  onTick: () => void;
  shouldTick: () => boolean;
  intervalMs?: number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

/**
 * Subscribes to app foregrounding and a display-only refresh interval.
 * Age is never advanced by the timer; callers recompute snapshots from timestamps.
 */
export function subscribePetClockLifecycle(options: PetClockLifecycleOptions): () => void {
  const intervalMs = options.intervalMs ?? PET_CLOCK_TICK_INTERVAL_MS;
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stopTick = (): void => {
    if (intervalId != null) {
      clearIntervalFn(intervalId);
      intervalId = null;
    }
  };

  const startTick = (): void => {
    if (intervalId != null || !options.shouldTick()) {
      return;
    }
    intervalId = setIntervalFn(() => {
      if (!options.shouldTick()) {
        stopTick();
        return;
      }
      options.onTick();
    }, intervalMs);
  };

  if (options.shouldTick()) {
    options.onForeground();
    startTick();
  }

  const unsubscribeAppState = options.addAppStateListener((status) => {
    if (status === 'active') {
      if (options.shouldTick()) {
        options.onForeground();
        startTick();
      } else {
        stopTick();
      }
      return;
    }
    stopTick();
  });

  return () => {
    stopTick();
    unsubscribeAppState();
  };
}
