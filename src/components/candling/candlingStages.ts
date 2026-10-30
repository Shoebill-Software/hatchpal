import type { BiologicalMilestone, DevelopmentStage } from '@/domain/types';
import type { TranslationKey } from '@/i18n/en';

/**
 * Pure developmental model for progressive candling. Live UI samples species
 * milestone `candling` features (vessels, eye, silhouette, air cell, movement)
 * and lerps between neighboring milestones so the chamber tracks the journal
 * readout without inventing its own clocks.
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

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Soft-step a boolean feature across the gap between two milestones. */
function boolBlend(from: boolean, to: boolean, t: number): number {
  if (from === to) {
    return from ? 1 : 0;
  }
  return from ? clamp01(1 - t) : clamp01(t);
}

export function candlingStageIdForDevelopment(stage: DevelopmentStage): CandlingStageId {
  switch (stage) {
    case 'cleavage':
      return 'early';
    case 'vascular':
      return 'vascular';
    case 'organogenesis':
      return 'embryo';
    case 'internal_pip':
    case 'external_pip':
    case 'hatchling':
    case 'juvenile':
    case 'adult':
    default:
      return 'prehatch';
  }
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

/**
 * Generic progress curve used by anatomy unit tests and as a fallback when a
 * species has no milestones. Prefer {@link resolveCandlingStageFromMilestones}
 * on the live candling path.
 */
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

/**
 * Samples the species milestone candling features at the current day and
 * blends continuous fields between neighboring milestones. Feature flags
 * (vessels / eye / movement) fade across the same span so the chamber agrees
 * with the journal readout instead of a global progress timer.
 */
export function resolveCandlingStageFromMilestones(
  progress: number,
  incubationDays: number,
  milestones: readonly BiologicalMilestone[],
): CandlingStageDescriptor {
  const p = clamp01(progress);
  if (!milestones.length) {
    return resolveCandlingStage(p);
  }

  const days = Number.isFinite(incubationDays) && incubationDays > 0 ? incubationDays : 1;
  const day = p * days;
  const sorted = milestones.slice().sort((a, b) => a.day - b.day);

  let prevIndex = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    if (sorted[index].day <= day) {
      prevIndex = index;
    } else {
      break;
    }
  }

  const prev = sorted[prevIndex];
  const next = sorted[Math.min(prevIndex + 1, sorted.length - 1)];
  const span = next.day - prev.day;
  const t = span > 1e-6 ? clamp01((day - prev.day) / span) : 0;

  const embryo = clamp01(lerp(prev.candling.embryoSilhouettePct, next.candling.embryoSilhouettePct, t));
  const airCell = clamp01(lerp(prev.candling.airCellPct, next.candling.airCellPct, t));
  const vessels = boolBlend(prev.candling.bloodVesselsVisible, next.candling.bloodVesselsVisible, t);
  const eye = boolBlend(prev.candling.eyeSpotVisible, next.candling.eyeSpotVisible, t);
  const movement = boolBlend(prev.candling.movementDetectable, next.candling.movementDetectable, t);
  // Yolk stays bright while the germ is a speck, then yields to the body mass.
  const yolk = clamp01((0.95 - embryo * 0.82) * (1 - ramp(embryo, 0.5, 0.88) * 0.55));
  const crowding = ramp(embryo, 0.45, 0.88);

  return {
    id: candlingStageIdForDevelopment(prev.stage),
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
