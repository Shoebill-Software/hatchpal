export function heartbeatIntervalMs(bpm: number): number | null {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    return null;
  }
  const intervalMs = (60 / bpm) * 1000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return null;
  }
  return intervalMs;
}

export type HapticHeartbeatOptions = {
  bpm: number;
  pulse: () => void;
  pulseImmediately?: boolean;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

/**
 * Starts a BPM-synchronized pulse loop. Returns a disposer that must be called
 * on unmount, gesture end, or whenever the heartbeat should go silent.
 */
export function subscribeHapticHeartbeat(options: HapticHeartbeatOptions): () => void {
  const intervalMs = heartbeatIntervalMs(options.bpm);
  if (intervalMs == null) {
    return () => undefined;
  }

  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  if (options.pulseImmediately !== false) {
    options.pulse();
  }

  const intervalId = setIntervalFn(() => {
    options.pulse();
  }, intervalMs);

  return () => {
    clearIntervalFn(intervalId);
  };
}
