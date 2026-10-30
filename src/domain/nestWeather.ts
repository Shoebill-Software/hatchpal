import { mixSeed } from './seed';
import type { PetInstance } from './types';

/**
 * Each incubation day draws a room condition from the egg's seed. Weather only
 * scales how quickly warmth and moisture drift after the most recent care, so the
 * climate curve stays a closed-form function of care timestamps.
 */
export const NEST_WEATHERS = ['mild', 'cold_snap', 'balmy', 'dry_spell', 'muggy'] as const;

export type NestWeather = (typeof NEST_WEATHERS)[number];

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Multipliers on the warmth half-life and the moisture time constant. Below 1 drifts faster. */
export const WEATHER_DRIFT: Record<NestWeather, { warmth: number; moisture: number }> = {
  mild: { warmth: 1, moisture: 1 },
  cold_snap: { warmth: 0.6, moisture: 1 },
  balmy: { warmth: 1.6, moisture: 1 },
  dry_spell: { warmth: 1, moisture: 0.6 },
  muggy: { warmth: 1, moisture: 1.6 },
};

/** Day 0 is always mild so a first egg settles in gently. */
export function weatherForDay(seed: number, day: number): NestWeather {
  if (!Number.isFinite(day) || day <= 0) {
    return 'mild';
  }
  const roll = mixSeed(seed, 1000 + Math.floor(day)) % 100;
  if (roll < 36) {
    return 'mild';
  }
  if (roll < 52) {
    return 'cold_snap';
  }
  if (roll < 68) {
    return 'balmy';
  }
  if (roll < 84) {
    return 'dry_spell';
  }
  return 'muggy';
}

export function incubationDayAt(pet: Pick<PetInstance, 'laidAtEpoch'>, epoch: number): number {
  if (!Number.isFinite(epoch) || !Number.isFinite(pet.laidAtEpoch)) {
    return 0;
  }
  return Math.max(0, Math.floor((epoch - pet.laidAtEpoch) / DAY_MS));
}

/** Eggs without a seed (saves from before weather existed) always see mild weather. */
export function weatherAt(pet: Pick<PetInstance, 'laidAtEpoch' | 'weatherSeed'>, epoch: number): NestWeather {
  if (typeof pet.weatherSeed !== 'number' || !Number.isFinite(pet.weatherSeed)) {
    return 'mild';
  }
  return weatherForDay(pet.weatherSeed, incubationDayAt(pet, epoch));
}
