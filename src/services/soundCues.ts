import type { DevelopmentStage, PetSnapshot } from '@/domain/types';

export const SOUND_EFFECT_IDS = [
  'tap',
  'pip_tap',
  'internal_peep',
  'shell_crack',
  'hatch_call',
  'heartbeat',
] as const;

export type SoundEffectId = (typeof SOUND_EFFECT_IDS)[number];

export type ShellTapSnapshot = Pick<
  PetSnapshot,
  'isPipped' | 'isHatched' | 'isReadyToHatch' | 'currentMilestone'
>;

/** Acoustic event for a finger tap on the shell. */
export function resolveShellTapEffect(snapshot: ShellTapSnapshot): SoundEffectId {
  const stage = snapshot.currentMilestone.stage;
  if (snapshot.isHatched || snapshot.isReadyToHatch || stage === 'hatchling') {
    return 'hatch_call';
  }
  if (stage === 'external_pip') {
    return 'shell_crack';
  }
  if (snapshot.isPipped || stage === 'internal_pip') {
    return 'pip_tap';
  }
  return 'tap';
}

/** Faint nest cue while the embryo is pipped. Null before the pip. */
export function resolveNestPipEffect(stage: DevelopmentStage | null): SoundEffectId | null {
  if (stage === 'external_pip') {
    return 'pip_tap';
  }
  if (stage === 'internal_pip') {
    return 'internal_peep';
  }
  return null;
}

export function nestPipIntervalMs(effect: SoundEffectId): number {
  return effect === 'pip_tap' ? 3200 : 5600;
}
