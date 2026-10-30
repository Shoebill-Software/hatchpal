import type { BroodOutcome, CareResult, MistOutcome, PetStatus } from '@/domain/types';

import type { SoundEffectId } from './soundCues';

export type PlayableCue = {
  id: SoundEffectId;
  volume?: number;
};

export type CareReleaseFeel = 'success' | 'warning' | 'light';

/** Incubating eggs accept care. Hatched and unviable nests do not. */
export function nestAcceptsCare(pet: { isHatched: boolean; status?: PetStatus }): boolean {
  return !pet.isHatched && pet.status !== 'unviable';
}

export function spritzLanded(result: CareResult | null): boolean {
  return result != null && typeof result.addedPct === 'number' && Number.isFinite(result.addedPct);
}

export function broodLanded(result: CareResult | null): result is CareResult & { brood: BroodOutcome } {
  return result?.brood != null;
}

export function mistLanded(result: CareResult | null): result is CareResult & { mist: MistOutcome } {
  return result?.mist != null;
}

/** Warmth release: the nest settles, and a perfect landing adds the chime. */
export function warmthReleaseCues(outcome: BroodOutcome): readonly PlayableCue[] {
  if (outcome === 'perfect') {
    return [{ id: 'warm_settle' }, { id: 'perfect_chime', volume: 0.5 }];
  }
  return [{ id: 'warm_settle' }];
}

/** Moisture release: the mist settles, and a perfect landing adds the chime. */
export function moistureReleaseCues(outcome: MistOutcome): readonly PlayableCue[] {
  if (outcome === 'perfect') {
    return [{ id: 'mist_settle' }, { id: 'perfect_chime', volume: 0.45 }];
  }
  return [{ id: 'mist_settle' }];
}

export const WISH_GRANTED_CUE: PlayableCue = { id: 'wish_granted' };

/** How a landed brood or mist should feel in the hand. A granted wish uses success on its own. */
export function careReleaseFeel(outcome: BroodOutcome | MistOutcome): CareReleaseFeel {
  if (outcome === 'perfect') {
    return 'success';
  }
  if (outcome === 'cozy' || outcome === 'dewy') {
    return 'light';
  }
  return 'warning';
}
