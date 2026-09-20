import { getCurrentMilestone, getMilestoneAtDay, isPipStage } from './milestones';
import {
  ClockAnomaly,
  ClockResolution,
  ClockResolveOptions,
  LifeStage,
  PetInstance,
  PetSnapshot,
  SpeciesConfig,
} from './types';

export const SECONDS_PER_DAY = 86400;
export const MS_PER_DAY = SECONDS_PER_DAY * 1000;
export const CLOCK_ROLLBACK_TOLERANCE_MS = 60_000;
export const LIVE_TICK_MAX_FORWARD_MS = 120_000;
export const HATCHLING_MATURATION_THRESHOLD = 1 / 6;

export function calculateElapsedSeconds(laidAtEpoch: number, currentEpoch: number): number {
  if (!Number.isFinite(laidAtEpoch) || !Number.isFinite(currentEpoch)) {
    return 0;
  }
  return Math.max(0, Math.floor((currentEpoch - laidAtEpoch) / 1000));
}

export function calculateIncubationProgress(
  laidAtEpoch: number,
  currentEpoch: number,
  totalIncubationDays: number
): number {
  const elapsedSeconds = calculateElapsedSeconds(laidAtEpoch, currentEpoch);
  const totalSeconds = totalIncubationDays * SECONDS_PER_DAY;
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 1.0;
  }
  return Math.min(1.0, Math.max(0.0, elapsedSeconds / totalSeconds));
}

export function calculateMaturationProgress(
  hatchEpoch: number,
  currentEpoch: number,
  adultMaturationDays: number
): number {
  const maturedSeconds = calculateElapsedSeconds(hatchEpoch, currentEpoch);
  const totalSeconds = adultMaturationDays * SECONDS_PER_DAY;
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 1.0;
  }
  return Math.min(1.0, Math.max(0.0, maturedSeconds / totalSeconds));
}

export function resolveHatchEpoch(pet: PetInstance, species: SpeciesConfig): number {
  if (Number.isFinite(pet.hatchedAtEpoch)) {
    return pet.hatchedAtEpoch as number;
  }
  const incubationMs = species.incubationDays * MS_PER_DAY;
  if (!Number.isFinite(pet.laidAtEpoch) || !Number.isFinite(incubationMs)) {
    return 0;
  }
  return pet.laidAtEpoch + Math.max(0, incubationMs);
}

export function detectClockTampering(currentEpoch: number, lastVerifiedEpoch: number): boolean {
  if (!Number.isFinite(currentEpoch) || !Number.isFinite(lastVerifiedEpoch)) {
    return true;
  }
  return currentEpoch < lastVerifiedEpoch - CLOCK_ROLLBACK_TOLERANCE_MS;
}

export function detectForwardClockAnomaly(
  currentEpoch: number,
  lastVerifiedEpoch: number,
  maxForwardAdvanceMs: number
): boolean {
  if (!Number.isFinite(currentEpoch) || !Number.isFinite(lastVerifiedEpoch)) {
    return true;
  }
  if (!Number.isFinite(maxForwardAdvanceMs) || maxForwardAdvanceMs < 0) {
    return false;
  }
  return currentEpoch - lastVerifiedEpoch > maxForwardAdvanceMs;
}

export function resolveEffectiveEpoch(
  currentEpoch: number,
  lastVerifiedEpoch: number,
  options?: ClockResolveOptions
): ClockResolution {
  const verified = Number.isFinite(lastVerifiedEpoch) ? lastVerifiedEpoch : 0;
  if (!Number.isFinite(currentEpoch)) {
    return {
      effectiveEpoch: verified,
      isClockTampered: true,
      anomaly: 'rollback',
      shouldCommitVerifiedEpoch: false,
    };
  }

  if (detectClockTampering(currentEpoch, verified)) {
    return {
      effectiveEpoch: verified,
      isClockTampered: true,
      anomaly: 'rollback',
      shouldCommitVerifiedEpoch: false,
    };
  }

  const maxForwardAdvanceMs = options?.maxForwardAdvanceMs;
  if (
    maxForwardAdvanceMs != null &&
    detectForwardClockAnomaly(currentEpoch, verified, maxForwardAdvanceMs)
  ) {
    return {
      effectiveEpoch: verified,
      isClockTampered: true,
      anomaly: 'forward_jump',
      shouldCommitVerifiedEpoch: false,
    };
  }

  return {
    effectiveEpoch: currentEpoch,
    isClockTampered: false,
    anomaly: 'none',
    shouldCommitVerifiedEpoch: currentEpoch >= verified,
  };
}

export function nextVerifiedEpoch(
  currentEpoch: number,
  lastVerifiedEpoch: number,
  options?: ClockResolveOptions
): number {
  const verified = Number.isFinite(lastVerifiedEpoch) ? lastVerifiedEpoch : 0;
  const resolution = resolveEffectiveEpoch(currentEpoch, verified, options);
  if (!resolution.shouldCommitVerifiedEpoch) {
    return verified;
  }
  return Math.max(verified, resolution.effectiveEpoch);
}

export function calculateEmbryoHeartRate(
  baseBpm: number,
  progress: number,
  isPipped: boolean
): number {
  const bpm = Number.isFinite(baseBpm) ? Math.max(0, baseBpm) : 0;
  if (!Number.isFinite(progress) || progress < 0.1) {
    return 0;
  }
  if (isPipped) {
    return Math.round(bpm * 0.9);
  }
  return Math.round(bpm);
}

export function resolveLifeStage(
  isHatched: boolean,
  isPipped: boolean,
  maturationProgress: number
): LifeStage {
  if (!isHatched) {
    return isPipped ? 'pip' : 'egg';
  }
  if (maturationProgress >= 1) {
    return 'adult';
  }
  if (maturationProgress >= HATCHLING_MATURATION_THRESHOLD) {
    return 'juvenile';
  }
  return 'hatchling';
}

export function resolvePetSnapshot(
  pet: PetInstance,
  species: SpeciesConfig,
  currentEpoch: number,
  options?: ClockResolveOptions
): PetSnapshot {
  const clock = resolveEffectiveEpoch(currentEpoch, pet.lastVerifiedEpoch, options);
  const effectiveEpoch = clock.effectiveEpoch;

  const elapsedSeconds = calculateElapsedSeconds(pet.laidAtEpoch, effectiveEpoch);
  const timeBasedIncubation = calculateIncubationProgress(
    pet.laidAtEpoch,
    effectiveEpoch,
    species.incubationDays
  );
  const incubationProgress = pet.isHatched ? 1.0 : timeBasedIncubation;

  const hatchEpoch = resolveHatchEpoch(pet, species);
  const maturationProgress = pet.isHatched
    ? calculateMaturationProgress(hatchEpoch, effectiveEpoch, species.adultMaturationDays)
    : 0;

  const milestoneDay = pet.isHatched
    ? elapsedSeconds / SECONDS_PER_DAY
    : incubationProgress * species.incubationDays;
  const currentMilestone = pet.isHatched
    ? getMilestoneAtDay(milestoneDay, species.milestones)
    : getCurrentMilestone(incubationProgress, species.incubationDays, species.milestones);

  const isPipped = !pet.isHatched && isPipStage(currentMilestone.stage);
  const isReadyToHatch = !pet.isHatched && incubationProgress >= 1.0;
  const lifeStage = resolveLifeStage(pet.isHatched, isPipped, maturationProgress);
  const currentHeartRate = pet.isHatched
    ? Math.round(Number.isFinite(species.baseHeartRateBpm) ? species.baseHeartRateBpm : 0)
    : calculateEmbryoHeartRate(species.baseHeartRateBpm, incubationProgress, isPipped);

  return {
    ageSeconds: elapsedSeconds,
    ageDays: Math.floor(elapsedSeconds / SECONDS_PER_DAY),
    ageHours: Math.floor((elapsedSeconds % SECONDS_PER_DAY) / 3600),
    progress: incubationProgress,
    incubationProgress,
    maturationProgress,
    currentMilestone,
    currentHeartRate,
    lifeStage,
    isPipped,
    isReadyToHatch,
    isHatched: pet.isHatched,
    isClockTampered: clock.isClockTampered,
    clockAnomaly: clock.anomaly,
  };
}

export function resolveHatchedAtEpoch(pet: PetInstance, species: SpeciesConfig): number {
  return resolveHatchEpoch(
    {
      ...pet,
      hatchedAtEpoch: undefined,
    },
    species
  );
}

export { getCurrentMilestone, getMilestoneAtDay } from './milestones';
