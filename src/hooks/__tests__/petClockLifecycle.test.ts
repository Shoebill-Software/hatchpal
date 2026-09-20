import {
  PET_CLOCK_TICK_INTERVAL_MS,
  subscribePetClockLifecycle,
} from '@/hooks/petClockLifecycle';

describe('Pet clock lifecycle bridge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes immediately on subscribe when a pet is active, then ticks while mounted', () => {
    const onForeground = jest.fn();
    const onTick = jest.fn();
    const listeners: Array<(status: string) => void> = [];

    const unsubscribe = subscribePetClockLifecycle({
      shouldTick: () => true,
      onForeground,
      onTick,
      addAppStateListener: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        };
      },
    });

    expect(onForeground).toHaveBeenCalledTimes(1);
    expect(onTick).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(1);

    listeners[0]?.('background');
    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS * 2);
    expect(onTick).toHaveBeenCalledTimes(1);

    listeners[0]?.('active');
    expect(onForeground).toHaveBeenCalledTimes(2);

    unsubscribe();
    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS * 2);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(0);
  });

  it('does not start a ticker until a pet exists, then refreshes immediately on adoption', () => {
    const onForeground = jest.fn();
    const onTick = jest.fn();
    let hasPet = false;

    const unsubscribe = subscribePetClockLifecycle({
      shouldTick: () => hasPet,
      onForeground,
      onTick,
      addAppStateListener: () => () => undefined,
    });

    expect(onForeground).not.toHaveBeenCalled();
    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS);
    expect(onTick).not.toHaveBeenCalled();
    unsubscribe();

    hasPet = true;
    const stop = subscribePetClockLifecycle({
      shouldTick: () => hasPet,
      onForeground,
      onTick,
      addAppStateListener: () => () => undefined,
    });

    expect(onForeground).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(1);

    hasPet = false;
    jest.advanceTimersByTime(PET_CLOCK_TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(1);
    stop();
  });
});
