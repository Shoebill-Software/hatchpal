import type { DevelopmentStage, PetSnapshot } from '@/domain/types';

export const SOUND_EFFECT_IDS = [
  'tap',
  'pip_tap',
  'internal_peep',
  'shell_crack',
  'hatch_call',
  'heartbeat',
  'ember_loop',
  'warm_settle',
  'mist_spritz_a',
  'mist_spritz_b',
  'mist_spritz_c',
  'mist_settle',
  'perfect_chime',
  'wish_granted',
  'pip_blip_a',
  'pip_blip_b',
  'pip_blip_c',
  'pip_peep',
] as const;

export type SoundEffectId = (typeof SOUND_EFFECT_IDS)[number];

/** Cues that loop until stopped instead of disposing after one pass. */
export const LOOPING_EFFECT_IDS: readonly SoundEffectId[] = ['ember_loop'];

const SPRITZ_VARIANTS = ['mist_spritz_a', 'mist_spritz_b', 'mist_spritz_c'] as const satisfies readonly SoundEffectId[];
const BLIP_VARIANTS = ['pip_blip_a', 'pip_blip_b', 'pip_blip_c'] as const satisfies readonly SoundEffectId[];

/** Rotates spray samples so a quick run of spritzes overlaps instead of restarting one player. */
export function spritzEffect(sequence: number): SoundEffectId {
  return SPRITZ_VARIANTS[Math.abs(Math.floor(sequence)) % SPRITZ_VARIANTS.length] ?? 'mist_spritz_a';
}

/** The guide's chatter blip for the given character position. */
export function blipEffect(position: number): SoundEffectId {
  return BLIP_VARIANTS[Math.abs(Math.floor(position * 7 + position / 3)) % BLIP_VARIANTS.length] ?? 'pip_blip_a';
}

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
