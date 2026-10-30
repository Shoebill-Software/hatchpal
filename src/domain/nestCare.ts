import {
  AMBIENT_ROOM_CELSIUS,
  BROOD_MAX_OVERSHOOT_CELSIUS,
  DRY_HUMIDITY_PCT,
  HUMIDITY_TOLERANCE_PCT,
  TEMPERATURE_TOLERANCE_CELSIUS,
  mistSubstrate,
  readClimate,
  requiresMoistureCare,
  warmNest,
} from './climateEngine';
import { hashString, mixSeed } from './seed';
import {
  AFFINITY_KINDS,
  type AffinityKind,
  type BroodOutcome,
  type CareEvent,
  type CareResult,
  type MistOutcome,
  type NestCareLog,
  type PetInstance,
  type SpeciesConfig,
  type Temperament,
  type WishKind,
} from './types';

/**
 * Hands-on nest care. Brooding is a press-and-hold that heats the nest live;
 * misting is a run of spritzes that soak in. Landing close to the species target
 * is a perfect result. Every few hours the egg may make a wish; granting it earns
 * a heart. The habits behind those results shape the hatchling's temperament.
 */

/** A release this close to the target counts as a perfect brood. */
export const BROOD_PERFECT_CELSIUS = 0.3;
/** Heating rate in the final approach, where the skill lives. */
export const BROOD_NEAR_RATE = 0.9;
/** Extra heating per degree of distance beyond the final approach, so a cold nest catches up fast. */
export const BROOD_FAR_GAIN = 1.1;
/** Width of the final approach below the target. */
export const BROOD_APPROACH_CELSIUS = 2;
/** The first moments of a hold heat gently so a quick tap barely moves the needle. */
export const BROOD_EASE_IN_MS = 320;

export const WISH_WINDOW_MS = 6 * 60 * 60 * 1000;
export const LULLABY_TAPS = 3;
/** Taps must land within this span to count as one lullaby. */
export const LULLABY_SPAN_MS = 2400;
/** How long after the last spritz the mist is judged. */
export const MIST_SETTLE_MS = 1300;

const GRANTED_WINDOW_CAP = 12;
const WISH_CHANCE_PCT = 72;
const MIN_TEMPERAMENT_POINTS = 4;
const SPRITZ_VARIATION = [1, 0.72, 1.24, 0.86, 1.14, 0.94, 1.3, 0.78, 1.06, 0.9] as const;

export const WISH_AFFINITY: Record<WishKind, AffinityKind | null> = {
  perfect_brood: 'warmth',
  perfect_mist: 'moisture',
  lullaby: 'song',
  peek: 'curiosity',
  sweet_spot: null,
};

export function emptyCareLog(): NestCareLog {
  return {
    hearts: 0,
    grantedWindows: [],
    affinity: { warmth: 0, moisture: 0, song: 0, curiosity: 0 },
    creditedWindows: { warmth: -1, moisture: -1, song: -1, curiosity: -1 },
    spritzes: 0,
  };
}

export function careLogOf(pet: Pick<PetInstance, 'care'>): NestCareLog {
  return pet.care ?? emptyCareLog();
}

/** Ceiling for a brood: the lamp cuts out past this. */
export function broodCeiling(species: Pick<SpeciesConfig, 'temperatureTargetCelsius'>): number {
  return species.temperatureTargetCelsius + BROOD_MAX_OVERSHOOT_CELSIUS;
}

/** Heating rate in °C per second at `currentCelsius`, `heldMs` into a hold. */
export function broodRate(currentCelsius: number, targetCelsius: number, heldMs: number): number {
  const distance = Math.max(0, targetCelsius - BROOD_APPROACH_CELSIUS - currentCelsius);
  const ease = Math.min(1, Math.max(0, heldMs) / BROOD_EASE_IN_MS);
  return (BROOD_NEAR_RATE + BROOD_FAR_GAIN * distance) * (0.35 + 0.65 * ease);
}

/** Advances a live brood by one frame. */
export function broodStep(
  currentCelsius: number,
  species: Pick<SpeciesConfig, 'temperatureTargetCelsius'>,
  heldMs: number,
  dtMs: number
): number {
  const start = Number.isFinite(currentCelsius) ? currentCelsius : AMBIENT_ROOM_CELSIUS;
  const dt = Math.max(0, Math.min(100, dtMs)) / 1000;
  const next = start + broodRate(start, species.temperatureTargetCelsius, heldMs) * dt;
  return Math.min(broodCeiling(species), next);
}

export function classifyBrood(startCelsius: number, endCelsius: number, targetCelsius: number): BroodOutcome {
  if (endCelsius > targetCelsius + TEMPERATURE_TOLERANCE_CELSIUS) {
    return 'toasty';
  }
  if (endCelsius < targetCelsius - TEMPERATURE_TOLERANCE_CELSIUS) {
    return 'chilly';
  }
  const landed = Math.abs(endCelsius - targetCelsius) <= BROOD_PERFECT_CELSIUS;
  const climbed = startCelsius < targetCelsius - BROOD_PERFECT_CELSIUS;
  return landed && climbed ? 'perfect' : 'cozy';
}

/** Average spritz strength. Humid species get a stronger nozzle so the run stays short. */
export function baseSpritzPct(species: Pick<SpeciesConfig, 'humidityTargetPct'>): number {
  return Math.min(8, Math.max(2.5, (species.humidityTargetPct - DRY_HUMIDITY_PCT) / 7));
}

/** Strength of the `sequence`-th spritz of this egg's life. Deterministic, never uniform. */
export function spritzAmount(species: Pick<SpeciesConfig, 'humidityTargetPct'>, sequence: number): number {
  const index = Math.abs(Math.floor(Number.isFinite(sequence) ? sequence : 0)) % SPRITZ_VARIATION.length;
  return baseSpritzPct(species) * (SPRITZ_VARIATION[index] ?? 1);
}

export function mistPerfectBand(species: Pick<SpeciesConfig, 'humidityTargetPct'>): number {
  return Math.max(1.5, baseSpritzPct(species) * 0.3);
}

export function classifyMist(
  startPct: number,
  endPct: number,
  species: Pick<SpeciesConfig, 'humidityTargetPct'>
): MistOutcome {
  const target = species.humidityTargetPct;
  if (endPct > target + HUMIDITY_TOLERANCE_PCT) {
    return 'soggy';
  }
  if (endPct < target - HUMIDITY_TOLERANCE_PCT) {
    return 'dry';
  }
  const band = mistPerfectBand(species);
  const landed = Math.abs(endPct - target) <= band;
  const climbed = startPct < target - band;
  return landed && climbed ? 'perfect' : 'dewy';
}

/** Ratites incubate dry. Their nests drift to the dry baseline on their own and never need mist. */
export function prefersDryNest(species: Pick<SpeciesConfig, 'humidityTargetPct'>): boolean {
  return !requiresMoistureCare(species);
}

export function wishWindowIndex(pet: Pick<PetInstance, 'laidAtEpoch'>, nowEpoch: number): number {
  if (!Number.isFinite(nowEpoch) || !Number.isFinite(pet.laidAtEpoch)) {
    return 0;
  }
  return Math.max(0, Math.floor((nowEpoch - pet.laidAtEpoch) / WISH_WINDOW_MS));
}

export function wishWindowEndsAt(pet: Pick<PetInstance, 'laidAtEpoch'>, index: number): number {
  return pet.laidAtEpoch + (Math.max(0, index) + 1) * WISH_WINDOW_MS;
}

function wishPool(species: Pick<SpeciesConfig, 'humidityTargetPct'>): readonly WishKind[] {
  return prefersDryNest(species)
    ? ['perfect_brood', 'lullaby', 'peek', 'sweet_spot']
    : ['perfect_brood', 'perfect_mist', 'lullaby', 'peek', 'sweet_spot'];
}

function rawWish(seed: number, pool: readonly WishKind[], index: number): WishKind | null {
  if (index <= 0) {
    return 'lullaby';
  }
  if (mixSeed(seed, index * 2) % 100 >= WISH_CHANCE_PCT) {
    return null;
  }
  return pool[mixSeed(seed, index * 2 + 1) % pool.length] ?? null;
}

const MAX_CHAINED_WINDOW = 4000;
const wishChains = new Map<string, (WishKind | null)[]>();

/**
 * The wish for a window, or null for a quiet window. The very first window always
 * asks for a lullaby, and a wish never repeats the previous window's kind.
 */
export function wishForWindow(
  pet: Pick<PetInstance, 'id' | 'weatherSeed'>,
  species: Pick<SpeciesConfig, 'humidityTargetPct'>,
  index: number
): WishKind | null {
  const window = Math.floor(index);
  if (!Number.isFinite(window) || window <= 0) {
    return 'lullaby';
  }
  const seed = typeof pet.weatherSeed === 'number' ? pet.weatherSeed : hashString(pet.id);
  const pool = wishPool(species);
  if (window > MAX_CHAINED_WINDOW) {
    return rawWish(seed, pool, window);
  }
  const key = `${seed}:${pool.length}`;
  let chain = wishChains.get(key);
  if (!chain) {
    if (wishChains.size >= 16) {
      wishChains.clear();
    }
    chain = ['lullaby'];
    wishChains.set(key, chain);
  }
  for (let next = chain.length; next <= window; next += 1) {
    const raw = rawWish(seed, pool, next);
    const previous = chain[next - 1] ?? null;
    chain.push(raw != null && raw === previous ? (pool[(pool.indexOf(raw) + 1) % pool.length] ?? raw) : raw);
  }
  return chain[window] ?? null;
}

export type ActiveWish = { kind: WishKind; index: number; endsAt: number };

/** The open wish right now, or null when the window is quiet, granted, or the egg is not incubating. */
export function activeWish(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): ActiveWish | null {
  if (pet.isHatched || pet.status === 'unviable') {
    return null;
  }
  const index = wishWindowIndex(pet, nowEpoch);
  if (careLogOf(pet).grantedWindows.includes(index)) {
    return null;
  }
  const kind = wishForWindow(pet, species, index);
  return kind ? { kind, index, endsAt: wishWindowEndsAt(pet, index) } : null;
}

function creditHabit(log: NestCareLog, kind: AffinityKind, window: number): NestCareLog {
  if (log.creditedWindows[kind] === window) {
    return log;
  }
  return {
    ...log,
    affinity: { ...log.affinity, [kind]: log.affinity[kind] + 1 },
    creditedWindows: { ...log.creditedWindows, [kind]: window },
  };
}

function grant(log: NestCareLog, wish: ActiveWish): NestCareLog {
  const bonus = WISH_AFFINITY[wish.kind];
  return {
    ...log,
    hearts: log.hearts + 1,
    grantedWindows: [wish.index, ...log.grantedWindows.filter((index) => index !== wish.index)].slice(
      0,
      GRANTED_WINDOW_CAP
    ),
    affinity: bonus ? { ...log.affinity, [bonus]: log.affinity[bonus] + 1 } : log.affinity,
  };
}

function wishSatisfied(
  wish: ActiveWish,
  event: CareEvent,
  outcome: { brood?: BroodOutcome; mist?: MistOutcome },
  inSweetSpot: boolean
): boolean {
  switch (wish.kind) {
    case 'perfect_brood':
      return event.kind === 'brood' && outcome.brood === 'perfect';
    case 'perfect_mist':
      return event.kind === 'mist_settled' && outcome.mist === 'perfect';
    case 'lullaby':
      return event.kind === 'lullaby';
    case 'peek':
      return event.kind === 'peek';
    case 'sweet_spot':
      return (event.kind === 'brood' || event.kind === 'mist_settled') && inSweetSpot;
  }
}

/**
 * Applies one care event. Returns the same pet instance when nothing changed,
 * plus the outcome the nest should celebrate.
 */
export function applyCareEvent(
  pet: PetInstance,
  species: SpeciesConfig,
  event: CareEvent,
  nowEpoch: number
): { pet: PetInstance; result: CareResult } {
  if (pet.isHatched || pet.status === 'unviable' || !Number.isFinite(nowEpoch)) {
    return { pet, result: { granted: null } };
  }
  const window = wishWindowIndex(pet, nowEpoch);
  const wish = activeWish(pet, species, nowEpoch);
  let next = pet;
  let log = careLogOf(pet);
  const result: CareResult = { granted: null };
  const credit = (current: NestCareLog, kind: AffinityKind): NestCareLog => {
    const updated = creditHabit(current, kind, window);
    if (updated !== current) {
      result.credited = kind;
    }
    return updated;
  };

  switch (event.kind) {
    case 'brood': {
      next = warmNest(pet, species, nowEpoch, event.celsius);
      result.brood = classifyBrood(event.startCelsius, next.currentTemperatureCelsius, species.temperatureTargetCelsius);
      if (result.brood === 'perfect') {
        log = credit(log, 'warmth');
      }
      break;
    }
    case 'spritz': {
      const amount = spritzAmount(species, log.spritzes);
      next = mistSubstrate(pet, species, nowEpoch, amount);
      result.addedPct = next.currentHumidityPct - readClimate(pet, species, nowEpoch).humidityPct;
      log = { ...log, spritzes: log.spritzes + 1 };
      break;
    }
    case 'mist_settled': {
      result.mist = classifyMist(event.startPct, readClimate(pet, species, nowEpoch).humidityPct, species);
      if (result.mist === 'perfect') {
        log = credit(log, 'moisture');
      }
      break;
    }
    case 'lullaby': {
      log = credit(log, 'song');
      break;
    }
    case 'peek': {
      log = credit(log, 'curiosity');
      break;
    }
  }

  if (wish && wishSatisfied(wish, event, result, readClimate(next, species, nowEpoch).inSweetSpot)) {
    log = grant(log, wish);
    result.granted = wish.kind;
  }

  if (log === careLogOf(pet) && next === pet) {
    return { pet, result };
  }
  return {
    pet: { ...next, care: log, lastInteractedEpoch: Math.max(next.lastInteractedEpoch, nowEpoch) },
    result,
  };
}

const TEMPERAMENT_FOR: Record<AffinityKind, Temperament> = {
  warmth: 'sunny',
  moisture: 'dewy',
  song: 'songful',
  curiosity: 'curious',
};

/** The habit the egg saw most. A thin or tied record reads as easygoing. */
export function resolveTemperament(log: NestCareLog | undefined): Temperament {
  if (!log) {
    return 'easygoing';
  }
  const ranked = AFFINITY_KINDS.map((kind) => ({ kind, points: log.affinity[kind] ?? 0 })).sort(
    (a, b) => b.points - a.points
  );
  const total = ranked.reduce((sum, entry) => sum + entry.points, 0);
  const [first, second] = ranked;
  if (!first || total < MIN_TEMPERAMENT_POINTS || (second && second.points === first.points)) {
    return 'easygoing';
  }
  return TEMPERAMENT_FOR[first.kind];
}

export function sanitizeCareLog(value: unknown): NestCareLog | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const count = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
  const windowIndex = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input) ? Math.max(-1, Math.floor(input)) : -1;
  const record = (input: unknown): Record<string, unknown> =>
    input != null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const affinity = record(raw.affinity);
  const credited = record(raw.creditedWindows);
  const granted = Array.isArray(raw.grantedWindows) ? raw.grantedWindows : [];
  return {
    hearts: count(raw.hearts),
    grantedWindows: granted
      .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0)
      .map((entry) => Math.floor(entry))
      .slice(0, GRANTED_WINDOW_CAP),
    affinity: {
      warmth: count(affinity.warmth),
      moisture: count(affinity.moisture),
      song: count(affinity.song),
      curiosity: count(affinity.curiosity),
    },
    creditedWindows: {
      warmth: windowIndex(credited.warmth),
      moisture: windowIndex(credited.moisture),
      song: windowIndex(credited.song),
      curiosity: windowIndex(credited.curiosity),
    },
    spritzes: count(raw.spritzes),
  };
}
