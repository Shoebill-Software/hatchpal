import type { TranslationKey } from '@/i18n/en';

/**
 * Pure developmental model for progressive candling. Given the incubation
 * fraction (currentDay / totalDays) it produces continuous, day-by-day visual
 * parameters so the embryo evolves smoothly rather than snapping between the
 * discrete biological milestones.
 */

export type CandlingStageId = 'early' | 'vascular' | 'embryo' | 'prehatch';

export interface CandlingStageDescriptor {
  id: CandlingStageId;
  /** Clamped incubation progress in [0, 1]. */
  progress: number;
  /** Floating yolk shadow visibility in [0, 1]. Prominent early, fades as the embryo fills the shell. */
  yolk: number;
  /** Vascular "spider" network opacity in [0, 1]. */
  vessels: number;
  /** Embryo mass size as a fraction of the shell radius in [0, 1]. */
  embryo: number;
  /** Dark eye-spot visibility in [0, 1]. */
  eye: number;
  /** Air-cell expansion at the blunt pole in [0, 1]. */
  airCell: number;
  /** Shell crowding/darkening as the creature occupies the interior, in [0, 1]. */
  crowding: number;
  /** Subtle spontaneous-movement amplitude in [0, 1]. */
  movement: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Linear 0..1 ramp across [start, end]. Flat outside the window. */
export function ramp(value: number, start: number, end: number): number {
  if (end <= start) {
    return value >= end ? 1 : 0;
  }
  return clamp01((value - start) / (end - start));
}

export function resolveCandlingStageId(progress: number): CandlingStageId {
  const p = clamp01(progress);
  if (p < 0.2) {
    return 'early';
  }
  if (p < 0.4) {
    return 'vascular';
  }
  if (p < 0.75) {
    return 'embryo';
  }
  return 'prehatch';
}

export function resolveCandlingStage(progress: number): CandlingStageDescriptor {
  const p = clamp01(progress);

  const yolk = clamp01((0.35 + ramp(p, 0, 0.06) * 0.65) * (1 - ramp(p, 0.38, 0.78) * 0.9));
  // The vessel net is obvious in the middle, then the body covers it.
  const vessels = clamp01(ramp(p, 0.16, 0.32) * (1 - ramp(p, 0.5, 0.88) * 0.85));
  const embryo = clamp01(0.1 + ramp(p, 0.38, 1) * 0.82);
  const eye = ramp(p, 0.42, 0.52);
  // A fresh egg already has a small air cell. It widens toward internal pip.
  const airCell = clamp01(0.1 + ramp(p, 0.15, 1) * 0.55 + ramp(p, 0.78, 1) * 0.22);
  const crowding = ramp(p, 0.48, 0.9);
  const movement = clamp01(ramp(p, 0.45, 0.7));

  return {
    id: resolveCandlingStageId(p),
    progress: p,
    yolk,
    vessels,
    embryo,
    eye,
    airCell,
    crowding,
    movement,
  };
}

export function candlingStageLabelKey(id: CandlingStageId): TranslationKey {
  switch (id) {
    case 'vascular':
      return 'candling.stage.vascular';
    case 'embryo':
      return 'candling.stage.embryo';
    case 'prehatch':
      return 'candling.stage.prehatch';
    case 'early':
    default:
      return 'candling.stage.early';
  }
}
