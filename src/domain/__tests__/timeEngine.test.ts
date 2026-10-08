import { silkieChickenConfig } from '@/data/species/chicken';
import { getSortedMilestones } from '@/domain/milestones';
import { PetInstance } from '@/domain/types';
import {
  LIVE_TICK_MAX_FORWARD_MS,
  calculateElapsedSeconds,
  calculateEmbryoHeartRate,
  calculateIncubationProgress,
  calculateMaturationProgress,
  detectClockTampering,
  getCurrentMilestone,
  nextVerifiedEpoch,
  resolveEffectiveEpoch,
  resolvePetSnapshot,
} from '@/domain/timeEngine';

describe('Time & Simulation Engine', () => {
  const baseEpoch = 1700000000000;
  const dayMs = 86400 * 1000;

  const mockPet: PetInstance = {
    id: 'test-silkie',
    speciesId: 'silkie_chicken',
    nickname: 'Pip',
    laidAtEpoch: baseEpoch,
    lastVerifiedEpoch: baseEpoch,
    lastInteractedEpoch: baseEpoch,
    healthMultiplier: 1.0,
    currentTemperatureCelsius: 37.5,
    currentHumidityPct: 55,
    lastWarmedEpoch: baseEpoch,
    lastMistedEpoch: baseEpoch,
    vitalityScore: 1,
    isHatched: false,
  };

  it('calculates elapsed seconds exactly and clamps reversed clocks to zero', () => {
    expect(calculateElapsedSeconds(baseEpoch, baseEpoch + 3600 * 1000)).toBe(3600);
    expect(calculateElapsedSeconds(baseEpoch, baseEpoch - 5000)).toBe(0);
    expect(calculateElapsedSeconds(Number.NaN, baseEpoch)).toBe(0);
  });

  it('normalizes incubation progress to [0.0, 1.0]', () => {
    const halfwayEpoch = baseEpoch + 10.5 * dayMs;
    expect(calculateIncubationProgress(baseEpoch, halfwayEpoch, 21)).toBeCloseTo(0.5, 3);
    expect(calculateIncubationProgress(baseEpoch, baseEpoch + 25 * dayMs, 21)).toBe(1.0);
  });

  it('clamps progress to 1.0 for invalid incubation duration', () => {
    expect(calculateIncubationProgress(baseEpoch, baseEpoch + dayMs, 0)).toBe(1.0);
    expect(calculateIncubationProgress(baseEpoch, baseEpoch + dayMs, -3)).toBe(1.0);
  });

  it('detects system clock rollback beyond the 60-second tolerance', () => {
    const verifiedEpoch = baseEpoch + 5 * dayMs;
    expect(detectClockTampering(verifiedEpoch - 120000, verifiedEpoch)).toBe(true);
    expect(detectClockTampering(verifiedEpoch + 10000, verifiedEpoch)).toBe(false);
    expect(detectClockTampering(verifiedEpoch - 59000, verifiedEpoch)).toBe(false);
    expect(detectClockTampering(verifiedEpoch - 60000, verifiedEpoch)).toBe(false);
    expect(detectClockTampering(verifiedEpoch - 60001, verifiedEpoch)).toBe(true);
  });

  it('freezes snapshots on rollback by minutes, hours, and days', () => {
    const verifiedEpoch = baseEpoch + 10 * dayMs;
    const pet: PetInstance = { ...mockPet, lastVerifiedEpoch: verifiedEpoch };

    const cases = [
      { label: 'minutes', current: verifiedEpoch - 12 * 60 * 1000, expectedDays: 10 },
      { label: 'hours', current: verifiedEpoch - 3 * 3600 * 1000, expectedDays: 10 },
      { label: 'days', current: verifiedEpoch - 5 * dayMs, expectedDays: 10 },
    ];

    for (const testCase of cases) {
      const snapshot = resolvePetSnapshot(pet, silkieChickenConfig, testCase.current);
      expect(snapshot.isClockTampered).toBe(true);
      expect(snapshot.clockAnomaly).toBe('rollback');
      expect(snapshot.ageDays).toBe(testCase.expectedDays);
      expect(snapshot.progress).toBeCloseTo(10 / 21, 3);
    }
  });

  it('refuses to persist a live forward jump so a later rollback cannot keep cheated progress', () => {
    const jumped = baseEpoch + 14 * dayMs;
    expect(
      nextVerifiedEpoch(jumped, baseEpoch, { maxForwardAdvanceMs: LIVE_TICK_MAX_FORWARD_MS })
    ).toBe(baseEpoch);

    const liveFreeze = resolveEffectiveEpoch(jumped, baseEpoch, {
      maxForwardAdvanceMs: LIVE_TICK_MAX_FORWARD_MS,
    });
    expect(liveFreeze.anomaly).toBe('forward_jump');
    expect(liveFreeze.shouldCommitVerifiedEpoch).toBe(false);
    expect(liveFreeze.effectiveEpoch).toBe(baseEpoch);

    const displayDuringJump = resolvePetSnapshot(mockPet, silkieChickenConfig, jumped);
    expect(displayDuringJump.ageDays).toBe(14);
    expect(displayDuringJump.isClockTampered).toBe(false);

    const afterClockRestored = resolvePetSnapshot(
      { ...mockPet, lastVerifiedEpoch: baseEpoch },
      silkieChickenConfig,
      baseEpoch + 90_000
    );
    expect(afterClockRestored.isClockTampered).toBe(false);
    expect(afterClockRestored.ageSeconds).toBe(90);

    const ifLastVerifiedHadBeenCommitted = resolvePetSnapshot(
      { ...mockPet, lastVerifiedEpoch: jumped },
      silkieChickenConfig,
      baseEpoch + 90_000
    );
    expect(ifLastVerifiedHadBeenCommitted.isClockTampered).toBe(true);
    expect(ifLastVerifiedHadBeenCommitted.ageDays).toBe(14);
  });

  it('still grants genuine long-absence catch-up when no live forward cap is set', () => {
    const resumed = baseEpoch + 14 * dayMs;
    expect(nextVerifiedEpoch(resumed, baseEpoch)).toBe(resumed);
    const snapshot = resolvePetSnapshot(mockPet, silkieChickenConfig, resumed);
    expect(snapshot.ageDays).toBe(14);
    expect(snapshot.isClockTampered).toBe(false);
  });

  it('resolves incubation milestones at day 0, mid incubation, internal pip, external pip, and hatch', () => {
    const day0 = resolvePetSnapshot(mockPet, silkieChickenConfig, baseEpoch);
    expect(day0.currentMilestone.day).toBe(0);
    expect(day0.currentMilestone.stage).toBe('cleavage');
    expect(day0.lifeStage).toBe('egg');
    expect(day0.progress).toBe(0);
    expect(day0.currentHeartRate).toBe(0);

    const mid = resolvePetSnapshot(mockPet, silkieChickenConfig, baseEpoch + 8 * dayMs);
    expect(mid.currentMilestone.day).toBe(8);
    expect(mid.currentMilestone.stage).toBe('organogenesis');
    expect(mid.progress).toBeCloseTo(8 / 21, 5);

    const internalPip = resolvePetSnapshot(mockPet, silkieChickenConfig, baseEpoch + 19 * dayMs);
    expect(internalPip.currentMilestone.stage).toBe('internal_pip');
    expect(internalPip.isPipped).toBe(true);
    expect(internalPip.lifeStage).toBe('pip');
    expect(internalPip.currentHeartRate).toBe(198);

    const externalPip = resolvePetSnapshot(mockPet, silkieChickenConfig, baseEpoch + 20 * dayMs);
    expect(externalPip.currentMilestone.stage).toBe('external_pip');
    expect(externalPip.isPipped).toBe(true);
    expect(externalPip.isReadyToHatch).toBe(false);

    const hatchDay = resolvePetSnapshot(mockPet, silkieChickenConfig, baseEpoch + 21 * dayMs);
    expect(hatchDay.progress).toBe(1);
    expect(hatchDay.isReadyToHatch).toBe(true);
    expect(hatchDay.currentMilestone.stage).toBe('hatchling');
    expect(hatchDay.isPipped).toBe(false);
    expect(hatchDay.lifeStage).toBe('egg');
  });

  it('holds the previous milestone until the next day threshold', () => {
    const m5 = getCurrentMilestone(5 / 21, 21, silkieChickenConfig.milestones);
    expect(m5.day).toBe(3);
    expect(m5.stage).toBe('vascular');
  });

  it('does not re-sort the same milestone array on repeated lookups', () => {
    const first = getSortedMilestones(silkieChickenConfig.milestones);
    const second = getSortedMilestones(silkieChickenConfig.milestones);
    expect(second).toBe(first);
  });

  it('returns a safe fallback milestone instead of throwing on an empty list', () => {
    const fallback = getCurrentMilestone(0.5, 21, []);
    expect(fallback.day).toBe(0);
    expect(fallback.stage).toBe('cleavage');
  });

  it('calculates embryonic pulse from progress and pip status', () => {
    expect(calculateEmbryoHeartRate(220, 0.05, false)).toBe(0);
    expect(calculateEmbryoHeartRate(220, 0.5, false)).toBe(220);
    expect(calculateEmbryoHeartRate(220, 0.95, true)).toBe(198);
  });

  it('projects age, milestone, and pulse without active timers', () => {
    const day14Epoch = baseEpoch + 14 * dayMs + 5 * 3600 * 1000;
    const snapshot = resolvePetSnapshot(mockPet, silkieChickenConfig, day14Epoch);

    expect(snapshot.isClockTampered).toBe(false);
    expect(snapshot.ageDays).toBe(14);
    expect(snapshot.ageHours).toBe(5);
    expect(snapshot.ageSeconds).toBe(14 * 86400 + 5 * 3600);
    expect(snapshot.progress).toBeCloseTo((14 + 5 / 24) / 21, 5);
    expect(snapshot.currentMilestone.day).toBe(14);
    expect(snapshot.maturationProgress).toBe(0);
    expect(snapshot.isHatched).toBe(false);
  });

  it('continues post-hatch maturation independently of incubation progress', () => {
    const hatchEpoch = baseEpoch + 21 * dayMs;
    const hatchedPet: PetInstance = {
      ...mockPet,
      isHatched: true,
      hatchedAtEpoch: hatchEpoch,
      lastVerifiedEpoch: hatchEpoch,
    };

    const hatchling = resolvePetSnapshot(hatchedPet, silkieChickenConfig, hatchEpoch);
    expect(hatchling.incubationProgress).toBe(1);
    expect(hatchling.progress).toBe(1);
    expect(hatchling.maturationProgress).toBe(0);
    expect(hatchling.lifeStage).toBe('hatchling');
    expect(hatchling.isReadyToHatch).toBe(false);
    expect(hatchling.isPipped).toBe(false);
    expect(hatchling.currentHeartRate).toBe(220);

    const juvenileEpoch = hatchEpoch + 40 * dayMs;
    const growingPet: PetInstance = {
      ...hatchedPet,
      lastVerifiedEpoch: juvenileEpoch,
    };
    const juvenile = resolvePetSnapshot(growingPet, silkieChickenConfig, juvenileEpoch);
    expect(juvenile.ageDays).toBe(61);
    expect(juvenile.maturationProgress).toBeCloseTo(40 / 126, 5);
    expect(juvenile.lifeStage).toBe('juvenile');
    expect(calculateMaturationProgress(hatchEpoch, juvenileEpoch, 126)).toBeCloseTo(40 / 126, 5);

    const adultEpoch = hatchEpoch + 126 * dayMs;
    const adult = resolvePetSnapshot(
      { ...hatchedPet, lastVerifiedEpoch: adultEpoch },
      silkieChickenConfig,
      adultEpoch
    );
    expect(adult.maturationProgress).toBe(1);
    expect(adult.lifeStage).toBe('adult');
  });
});
