import type { PetSnapshot, SpeciesConfig } from '@/domain/types';

/** Chicken-style turning cadence: three turns per day. */
export const TURN_INTERVAL_MS = 8 * 60 * 60 * 1000;

export function speciesRequiresTurning(species: SpeciesConfig): boolean {
  return species.turningRequiredUntilDay > 0;
}

export function isTurningLockdown(snapshot: PetSnapshot, species: SpeciesConfig): boolean {
  if (!speciesRequiresTurning(species)) {
    return false;
  }
  if (snapshot.isHatched || snapshot.isReadyToHatch) {
    return true;
  }
  return snapshot.ageDays >= species.turningRequiredUntilDay;
}

export function canTurnEgg(snapshot: PetSnapshot, species: SpeciesConfig): boolean {
  return speciesRequiresTurning(species) && !isTurningLockdown(snapshot, species);
}

export function millisecondsSince(fromEpoch: number, nowEpoch: number): number {
  if (!Number.isFinite(fromEpoch) || !Number.isFinite(nowEpoch)) {
    return 0;
  }
  return Math.max(0, nowEpoch - fromEpoch);
}

export function turnCareStatus(
  lastTurnedEpoch: number,
  nowEpoch: number,
  canTurn: boolean
): 'optimal' | 'warning' | 'neutral' {
  if (!canTurn) {
    return 'neutral';
  }
  return millisecondsSince(lastTurnedEpoch, nowEpoch) >= TURN_INTERVAL_MS ? 'warning' : 'optimal';
}
