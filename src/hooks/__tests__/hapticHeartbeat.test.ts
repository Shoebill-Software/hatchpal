import { heartbeatIntervalMs, subscribeHapticHeartbeat } from '@/hooks/hapticHeartbeat';
import {
  createEggPath,
  createVesselNetwork,
  isPointInEgg,
  layoutEgg,
  lightConeRadius,
  lightProximity,
} from '@/components/candlingGeometry';

describe('heartbeatIntervalMs', () => {
  it('converts BPM into a millisecond interval using (60 / BPM) * 1000', () => {
    expect(heartbeatIntervalMs(220)).toBeCloseTo((60 / 220) * 1000);
    expect(heartbeatIntervalMs(110)).toBeCloseTo((60 / 110) * 1000);
    expect(heartbeatIntervalMs(90)).toBeCloseTo((60 / 90) * 1000);
  });

  it('returns null when there is no pulse to render', () => {
    expect(heartbeatIntervalMs(0)).toBeNull();
    expect(heartbeatIntervalMs(-12)).toBeNull();
    expect(heartbeatIntervalMs(Number.NaN)).toBeNull();
    expect(heartbeatIntervalMs(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('subscribeHapticHeartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pulses immediately, then on every BPM interval, and stops after dispose', () => {
    const pulse = jest.fn();
    const stop = subscribeHapticHeartbeat({
      bpm: 120,
      pulse,
      pulseImmediately: true,
    });

    expect(pulse).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(pulse).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(500);
    expect(pulse).toHaveBeenCalledTimes(3);

    stop();
    jest.advanceTimersByTime(2000);
    expect(pulse).toHaveBeenCalledTimes(3);
  });

  it('does not start a timer when BPM is 0', () => {
    const pulse = jest.fn();
    const stop = subscribeHapticHeartbeat({ bpm: 0, pulse });
    expect(pulse).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(pulse).not.toHaveBeenCalled();
    stop();
  });

  it('can suppress the immediate beat so a contact haptic does not double-fire', () => {
    const pulse = jest.fn();
    const stop = subscribeHapticHeartbeat({
      bpm: 60,
      pulse,
      pulseImmediately: false,
    });
    expect(pulse).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(pulse).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('candling geometry', () => {
  it('fits an egg in the canvas and keeps the pointed oval centered', () => {
    const layout = layoutEgg(400, 640, 40);
    expect(layout.cx).toBe(200);
    expect(layout.cy).toBe(320);
    expect(layout.rx).toBeGreaterThan(0);
    expect(layout.ry).toBeGreaterThan(layout.rx);
    expect(layout.path.startsWith('M ')).toBe(true);
    expect(createEggPath(layout.cx, layout.cy, layout.rx, layout.ry)).toContain('Z');
  });

  it('treats the egg interior as a hittable ellipse with a small slack margin', () => {
    expect(isPointInEgg(100, 120, 100, 120, 40, 60)).toBe(true);
    expect(isPointInEgg(100, 120, 100, 120, 40, 60, 1)).toBe(true);
    expect(isPointInEgg(400, 400, 100, 120, 40, 60)).toBe(false);
  });

  it('makes the light cone stronger as the source approaches the egg center', () => {
    const center = lightProximity(100, 120, 100, 120, 80);
    const edge = lightProximity(180, 120, 100, 120, 80);
    expect(center).toBe(1);
    expect(edge).toBeLessThan(center);
    expect(lightConeRadius(center, 100)).toBeGreaterThan(lightConeRadius(edge, 100));
  });

  it('builds a branched vessel network from the embryo origin', () => {
    const network = createVesselNetwork(98, 130, 48);
    expect(network.arteries.includes('M 98 130')).toBe(true);
    expect(network.capillaries.length).toBeGreaterThan(20);
    expect(network.terminalis.startsWith('M ')).toBe(true);
  });
});
