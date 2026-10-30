import type { PetInstance, SpeciesConfig } from '@/domain/types';

import { WEATHER_DRIFT, weatherAt } from './nestWeather';

/**
 * Nest micro-climate is a pure function of care timestamps.
 * Nothing here advances on a timer. Callers pass `nowEpoch`.
 *
 * Temperature relaxes toward room air on a 21-hour half-life, the midpoint of
 * the 18–24 hour band. Humidity relaxes toward a dry substrate on a 24-hour
 * time constant. The weather on the day of the most recent care scales both.
 * Vitality rewards time inside the species sweet spot and
 * eases toward a living floor during casual neglect. A climate strike
 * collapses displayed vitality to 0.0; more than twelve hours at zero
 * makes the embryo unviable. Species that incubate dry reach a strike
 * from warmth alone. Everyone else needs warmth and moisture both off.
 */

export const AMBIENT_ROOM_CELSIUS = 21;
export const DRY_HUMIDITY_PCT = 30;
export const TEMPERATURE_HALF_LIFE_MS = 21 * 60 * 60 * 1000;
export const HUMIDITY_TIME_CONSTANT_MS = 24 * 60 * 60 * 1000;
export const TEMPERATURE_TOLERANCE_CELSIUS = 1;
export const HUMIDITY_TOLERANCE_PCT = 5;
export const VITALITY_FLOOR = 0.3;
export const VITALITY_CEILING = 1;
export const FRESH_VITALITY = 0.78;
/** Displayed vitality is 0.0 for this long after a climate strike before the embryo is lost. */
export const UNVIABLE_AFTER_ZERO_MS = 12 * 60 * 60 * 1000;
export const VITALITY_RISE_TAU_MS = 4 * 60 * 60 * 1000;
export const VITALITY_FALL_TAU_MS = 18 * 60 * 60 * 1000;
/** Brooding can push the nest this far past the species target before the lamp cuts out. */
export const BROOD_MAX_OVERSHOOT_CELSIUS = 3;
export const MAX_HUMIDITY_PCT = 100;

const HEART_RATE_FLOOR_SCALE = 0.86;

export type TemperatureStatus = 'optimal' | 'too_cold' | 'too_warm';
export type HumidityStatus = 'optimal' | 'dry' | 'humid';
export type VitalityMood = 'thriving' | 'steady' | 'sluggish' | 'chilled';

/**
 * Time spent outside the sweet spot before the egg starts acting out.
 * A sulk is cosmetic: the hatch clock keeps running and vitality stays above its floor.
 */
export const SULK_AFTER_MS = 8 * 60 * 60 * 1000;
/** Both readings have to be off this long before the egg goes on strike. */
export const STRIKE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Dry-country eggs sit on the humidity floor, so moisture never leaves its band. */
export function requiresMoistureCare(species: { humidityTargetPct: number }): boolean {
  return species.humidityTargetPct > DRY_HUMIDITY_PCT + HUMIDITY_TOLERANCE_PCT;
}

export type NestTemper = 'content' | 'chilly' | 'parched' | 'fussy' | 'on_strike';

export interface NestClimateFields {
  currentTemperatureCelsius: number;
  currentHumidityPct: number;
  lastWarmedEpoch: number;
  lastMistedEpoch: number;
  vitalityScore: number;
}

export interface ClimateReading {
  temperatureCelsius: number;
  humidityPct: number;
  vitalityScore: number;
  inSweetSpot: boolean;
  temperatureStatus: TemperatureStatus;
  humidityStatus: HumidityStatus;
  mood: VitalityMood;
  /** Milliseconds the warmth reading has been outside the species band. */
  warmthOffMs: number;
  /** Milliseconds the humidity reading has been outside the species band. */
  moistureOffMs: number;
  temper: NestTemper;
}

interface InsideWindow {
  start: number;
  end: number;
}

export function freshNestClimate(
  nowEpoch: number,
  temperatureTargetCelsius: number,
  humidityTargetPct: number
): NestClimateFields {
  const epoch = finiteEpoch(nowEpoch, 0);
  return {
    currentTemperatureCelsius: finiteNumber(temperatureTargetCelsius, AMBIENT_ROOM_CELSIUS),
    currentHumidityPct: finiteNumber(humidityTargetPct, DRY_HUMIDITY_PCT),
    lastWarmedEpoch: epoch,
    lastMistedEpoch: epoch,
    vitalityScore: FRESH_VITALITY,
  };
}

export function clampVitality(value: unknown, fallback = FRESH_VITALITY): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(VITALITY_CEILING, Math.max(VITALITY_FLOOR, numeric));
}

/** Exponential half-life toward ambient room temperature. */
export function decayTemperature(
  setpointCelsius: number,
  elapsedMs: number,
  halfLifeMs = TEMPERATURE_HALF_LIFE_MS
): number {
  return decayHalfLife(
    finiteNumber(setpointCelsius, AMBIENT_ROOM_CELSIUS),
    AMBIENT_ROOM_CELSIUS,
    elapsedMs,
    halfLifeMs
  );
}

/** Exponential relaxation toward the dry substrate baseline. */
export function decayHumidity(
  setpointPct: number,
  elapsedMs: number,
  timeConstantMs = HUMIDITY_TIME_CONSTANT_MS
): number {
  return decayExponential(
    finiteNumber(setpointPct, DRY_HUMIDITY_PCT),
    DRY_HUMIDITY_PCT,
    elapsedMs,
    timeConstantMs
  );
}

/** Drift constants in force since the most recent warming and misting. */
export function driftConstants(pet: PetInstance): { temperatureHalfLifeMs: number; humidityTimeConstantMs: number } {
  return {
    temperatureHalfLifeMs: TEMPERATURE_HALF_LIFE_MS * WEATHER_DRIFT[weatherAt(pet, pet.lastWarmedEpoch)].warmth,
    humidityTimeConstantMs: HUMIDITY_TIME_CONSTANT_MS * WEATHER_DRIFT[weatherAt(pet, pet.lastMistedEpoch)].moisture,
  };
}

export function temperatureStatus(celsius: number, targetCelsius: number): TemperatureStatus {
  if (celsius < targetCelsius - TEMPERATURE_TOLERANCE_CELSIUS) {
    return 'too_cold';
  }
  if (celsius > targetCelsius + TEMPERATURE_TOLERANCE_CELSIUS) {
    return 'too_warm';
  }
  return 'optimal';
}

export function humidityStatus(pct: number, targetPct: number): HumidityStatus {
  if (pct < targetPct - HUMIDITY_TOLERANCE_PCT) {
    return 'dry';
  }
  if (pct > targetPct + HUMIDITY_TOLERANCE_PCT) {
    return 'humid';
  }
  return 'optimal';
}

export function nestTemper(
  warmthOffMs: number,
  moistureOffMs: number,
  moistureRequired = true
): NestTemper {
  const warmth = Math.max(0, warmthOffMs);
  if (!moistureRequired) {
    if (warmth >= STRIKE_AFTER_MS) {
      return 'on_strike';
    }
    if (warmth >= SULK_AFTER_MS) {
      return 'chilly';
    }
    return 'content';
  }
  const moisture = Math.max(0, moistureOffMs);
  const warmthSulk = warmth >= SULK_AFTER_MS;
  const moistureSulk = moisture >= SULK_AFTER_MS;
  if (warmthSulk && moistureSulk && warmth >= STRIKE_AFTER_MS && moisture >= STRIKE_AFTER_MS) {
    return 'on_strike';
  }
  if (warmthSulk && moistureSulk) {
    return 'fussy';
  }
  if (warmthSulk) {
    return 'chilly';
  }
  if (moistureSulk) {
    return 'parched';
  }
  return 'content';
}

export function vitalityMood(
  vitalityScore: number,
  inSweetSpot: boolean,
  temperature: TemperatureStatus
): VitalityMood {
  if (inSweetSpot && vitalityScore >= 0.82) {
    return 'thriving';
  }
  if (inSweetSpot) {
    return 'steady';
  }
  if (temperature === 'too_cold') {
    return 'chilled';
  }
  return 'sluggish';
}

/**
 * Scales a detected embryo rate down toward a living floor.
 * Undetected hearts stay at 0. A thriving nest keeps the full rate.
 */
export function caredHeartRate(baseRate: number, vitalityScore: number): number {
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    return 0;
  }
  const vitality = clampVitality(vitalityScore);
  const span = VITALITY_CEILING - VITALITY_FLOOR;
  const unit = span <= 0 ? 1 : (vitality - VITALITY_FLOOR) / span;
  const scale = HEART_RATE_FLOOR_SCALE + (1 - HEART_RATE_FLOOR_SCALE) * unit;
  return Math.max(1, Math.round(baseRate * scale));
}

export function readClimate(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): ClimateReading {
  const now = finiteEpoch(nowEpoch, pet.lastWarmedEpoch);
  const drift = driftConstants(pet);
  const temperatureCelsius = decayTemperature(
    pet.currentTemperatureCelsius,
    elapsedMs(pet.lastWarmedEpoch, now),
    drift.temperatureHalfLifeMs
  );
  const humidityPct = decayHumidity(
    pet.currentHumidityPct,
    elapsedMs(pet.lastMistedEpoch, now),
    drift.humidityTimeConstantMs
  );
  const temperature = temperatureStatus(temperatureCelsius, species.temperatureTargetCelsius);
  const humidity = humidityStatus(humidityPct, species.humidityTargetPct);
  const inSweetSpot = temperature === 'optimal' && humidity === 'optimal';
  const vitalityScore = projectVitality(pet, species, now);
  const bands = climateBands(pet, species);
  const anchor = Math.max(finiteEpoch(pet.lastWarmedEpoch, 0), finiteEpoch(pet.lastMistedEpoch, 0));
  const warmthOffMs = msOutside(bands.temperature, now, finiteEpoch(pet.lastWarmedEpoch, anchor));
  const moistureOffMs = msOutside(bands.humidity, now, finiteEpoch(pet.lastMistedEpoch, anchor));

  return {
    temperatureCelsius,
    humidityPct,
    vitalityScore,
    inSweetSpot,
    temperatureStatus: temperature,
    humidityStatus: humidity,
    mood: vitalityMood(vitalityScore, inSweetSpot, temperature),
    warmthOffMs,
    moistureOffMs,
    temper: nestTemper(warmthOffMs, moistureOffMs, requiresMoistureCare(species)),
  };
}

/**
 * Sets the nest temperature from this moment. Without `celsius` the nest lands
 * exactly on the species target. A brooded reading is clamped between room air
 * and {@link BROOD_MAX_OVERSHOOT_CELSIUS} past the target.
 */
export function warmNest(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number,
  celsius?: number
): PetInstance {
  if (pet.isHatched || pet.status === 'unviable' || !Number.isFinite(nowEpoch)) {
    return pet;
  }
  const now = finiteEpoch(nowEpoch, pet.lastWarmedEpoch);
  const target = species.temperatureTargetCelsius;
  const reading =
    celsius == null || !Number.isFinite(celsius)
      ? target
      : Math.min(target + BROOD_MAX_OVERSHOOT_CELSIUS, Math.max(AMBIENT_ROOM_CELSIUS, celsius));
  return {
    ...pet,
    currentTemperatureCelsius: reading,
    lastWarmedEpoch: now,
    vitalityScore: projectVitality(pet, species, now),
    lastInteractedEpoch: now,
  };
}

/**
 * Adds `addPct` points of humidity on top of the current reading. Without it the
 * substrate lands exactly on the species target.
 */
export function mistSubstrate(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number,
  addPct?: number
): PetInstance {
  if (pet.isHatched || pet.status === 'unviable' || !Number.isFinite(nowEpoch)) {
    return pet;
  }
  const now = finiteEpoch(nowEpoch, pet.lastMistedEpoch);
  const reading =
    addPct == null || !Number.isFinite(addPct)
      ? species.humidityTargetPct
      : Math.min(MAX_HUMIDITY_PCT, readClimate(pet, species, now).humidityPct + Math.max(0, addPct));
  return {
    ...pet,
    currentHumidityPct: reading,
    lastMistedEpoch: now,
    vitalityScore: projectVitality(pet, species, now),
    lastInteractedEpoch: now,
  };
}

function projectVitality(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): number {
  const anchor = Math.max(finiteEpoch(pet.lastWarmedEpoch, 0), finiteEpoch(pet.lastMistedEpoch, 0));
  const now = finiteEpoch(nowEpoch, anchor);
  const bands = climateBands(pet, species);
  return integrateVitality(
    clampVitality(pet.vitalityScore),
    anchor,
    now,
    intersectWindows(bands.temperature, bands.humidity)
  );
}

function climateBands(
  pet: PetInstance,
  species: SpeciesConfig
): { temperature: InsideWindow; humidity: InsideWindow } {
  const anchor = Math.max(finiteEpoch(pet.lastWarmedEpoch, 0), finiteEpoch(pet.lastMistedEpoch, 0));
  const drift = driftConstants(pet);
  return {
    temperature: coolingWindow(
      finiteEpoch(pet.lastWarmedEpoch, anchor),
      finiteNumber(pet.currentTemperatureCelsius, species.temperatureTargetCelsius),
      AMBIENT_ROOM_CELSIUS,
      species.temperatureTargetCelsius - TEMPERATURE_TOLERANCE_CELSIUS,
      species.temperatureTargetCelsius + TEMPERATURE_TOLERANCE_CELSIUS,
      (bound) =>
        elapsedUntilHalfLife(
          finiteNumber(pet.currentTemperatureCelsius, species.temperatureTargetCelsius),
          AMBIENT_ROOM_CELSIUS,
          bound,
          drift.temperatureHalfLifeMs
        )
    ),
    humidity: coolingWindow(
      finiteEpoch(pet.lastMistedEpoch, anchor),
      finiteNumber(pet.currentHumidityPct, species.humidityTargetPct),
      DRY_HUMIDITY_PCT,
      species.humidityTargetPct - HUMIDITY_TOLERANCE_PCT,
      species.humidityTargetPct + HUMIDITY_TOLERANCE_PCT,
      (bound) =>
        elapsedUntilExponential(
          finiteNumber(pet.currentHumidityPct, species.humidityTargetPct),
          DRY_HUMIDITY_PCT,
          bound,
          drift.humidityTimeConstantMs
        )
    ),
  };
}

function msOutside(window: InsideWindow, now: number, origin: number): number {
  if (now <= origin) {
    return 0;
  }
  if (now < window.start) {
    return now - origin;
  }
  if (now <= window.end || !Number.isFinite(window.end)) {
    return 0;
  }
  return now - window.end;
}

function integrateVitality(score: number, anchor: number, now: number, inside: InsideWindow): number {
  if (now <= anchor) {
    return clampVitality(score);
  }

  const segments: { elapsed: number; rising: boolean }[] = [];
  const windowStart = Math.max(anchor, inside.start);
  const windowEnd = Math.min(now, inside.end);

  if (windowEnd > windowStart) {
    if (windowStart > anchor) {
      segments.push({ elapsed: windowStart - anchor, rising: false });
    }
    segments.push({ elapsed: windowEnd - windowStart, rising: true });
    if (now > windowEnd) {
      segments.push({ elapsed: now - windowEnd, rising: false });
    }
  } else {
    segments.push({ elapsed: now - anchor, rising: false });
  }

  return segments.reduce(
    (value, segment) =>
      approach(
        value,
        segment.rising ? VITALITY_CEILING : VITALITY_FLOOR,
        segment.elapsed,
        segment.rising ? VITALITY_RISE_TAU_MS : VITALITY_FALL_TAU_MS
      ),
    clampVitality(score)
  );
}

function approach(value: number, target: number, elapsedMs: number, tauMs: number): number {
  if (elapsedMs <= 0 || tauMs <= 0) {
    return clampVitality(value);
  }
  const gain = 1 - Math.exp(-elapsedMs / tauMs);
  return clampVitality(value + (target - value) * gain);
}

function coolingWindow(
  originEpoch: number,
  setpoint: number,
  floor: number,
  lowerBound: number,
  upperBound: number,
  timeToReach: (bound: number) => number | null
): InsideWindow {
  const inside = setpoint >= lowerBound && setpoint <= upperBound;
  if (!(setpoint > floor)) {
    return inside
      ? { start: originEpoch, end: Number.POSITIVE_INFINITY }
      : { start: originEpoch, end: originEpoch };
  }
  if (setpoint < lowerBound) {
    return { start: originEpoch, end: originEpoch };
  }

  const leaveElapsed = timeToReach(lowerBound);
  const leaveEpoch = leaveElapsed == null ? Number.POSITIVE_INFINITY : originEpoch + leaveElapsed;

  if (inside) {
    return { start: originEpoch, end: leaveEpoch };
  }

  const enterElapsed = timeToReach(upperBound);
  if (enterElapsed == null) {
    return { start: originEpoch, end: originEpoch };
  }
  const enterEpoch = originEpoch + enterElapsed;
  if (leaveEpoch <= enterEpoch) {
    return { start: enterEpoch, end: enterEpoch };
  }
  return { start: enterEpoch, end: leaveEpoch };
}

function intersectWindows(left: InsideWindow, right: InsideWindow): InsideWindow {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  if (end <= start) {
    return { start, end: start };
  }
  return { start, end };
}

function decayHalfLife(setpoint: number, floor: number, elapsedMs: number, halfLifeMs: number): number {
  const elapsed = Math.max(0, finiteNumber(elapsedMs, 0));
  if (halfLifeMs <= 0) {
    return floor;
  }
  const factor = Math.pow(0.5, elapsed / halfLifeMs);
  return floor + (setpoint - floor) * factor;
}

function decayExponential(setpoint: number, floor: number, elapsedMs: number, tauMs: number): number {
  const elapsed = Math.max(0, finiteNumber(elapsedMs, 0));
  if (tauMs <= 0) {
    return floor;
  }
  const factor = Math.exp(-elapsed / tauMs);
  return floor + (setpoint - floor) * factor;
}

function elapsedUntilHalfLife(
  setpoint: number,
  floor: number,
  bound: number,
  halfLifeMs: number
): number | null {
  return elapsedUntilRatio(setpoint, floor, bound, (ratio) => (halfLifeMs * Math.log(ratio)) / Math.log(0.5));
}

function elapsedUntilExponential(
  setpoint: number,
  floor: number,
  bound: number,
  tauMs: number
): number | null {
  return elapsedUntilRatio(setpoint, floor, bound, (ratio) => -tauMs * Math.log(ratio));
}

function elapsedUntilRatio(
  setpoint: number,
  floor: number,
  bound: number,
  elapsedForRatio: (ratio: number) => number
): number | null {
  const span = setpoint - floor;
  if (Math.abs(span) < 1e-9) {
    return null;
  }
  const ratio = (bound - floor) / span;
  if (ratio <= 0) {
    return null;
  }
  if (ratio >= 1) {
    return 0;
  }
  const elapsed = elapsedForRatio(ratio);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : null;
}

function elapsedMs(fromEpoch: number, nowEpoch: number): number {
  if (!Number.isFinite(fromEpoch) || !Number.isFinite(nowEpoch)) {
    return 0;
  }
  return Math.max(0, nowEpoch - fromEpoch);
}

function finiteEpoch(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * How long the nest has been on strike. Zero until the failing climate has been
 * outside the sweet spot for at least {@link STRIKE_AFTER_MS}. Dry-country eggs
 * count warmth alone.
 */
export function strikeDurationMs(reading: ClimateReading, moistureRequired = true): number {
  if (reading.temper !== 'on_strike') {
    return 0;
  }
  const elapsed = moistureRequired
    ? Math.min(reading.warmthOffMs, reading.moistureOffMs)
    : reading.warmthOffMs;
  return Math.max(0, elapsed - STRIKE_AFTER_MS);
}

/**
 * Vitality shown to the player. Casual neglect stays on the living floor;
 * a climate strike collapses the reading to 0.0.
 */
export function displayedVitality(reading: ClimateReading): number {
  return reading.temper === 'on_strike' ? 0 : reading.vitalityScore;
}

function climateCollapsed(pet: PetInstance, species: SpeciesConfig, epoch: number): boolean {
  if (!Number.isFinite(epoch)) {
    return false;
  }
  const reading = readClimate(pet, species, epoch);
  return strikeDurationMs(reading, requiresMoistureCare(species)) > UNVIABLE_AFTER_ZERO_MS;
}

/**
 * When neglect, with no further care, makes the embryo unviable.
 * Searches backward if the nest is already lost, or up to an hour past the
 * twelve-hour strike window if a loss is still ahead. Returns null when the
 * egg is hatched or still has time beyond that window.
 */
export function projectedClimateLossEpoch(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number
): number | null {
  if (pet.isHatched || !Number.isFinite(nowEpoch)) {
    return null;
  }
  const now = Math.round(nowEpoch);
  if (climateCollapsed(pet, species, now)) {
    const origin = Number.isFinite(pet.laidAtEpoch) ? Math.round(pet.laidAtEpoch) : now;
    return earliestCollapsedEpoch(pet, species, Math.min(origin, now), now);
  }
  const horizon = now + UNVIABLE_AFTER_ZERO_MS + 60 * 60 * 1000;
  if (!climateCollapsed(pet, species, horizon)) {
    return null;
  }
  return earliestCollapsedEpoch(pet, species, now, horizon);
}

function earliestCollapsedEpoch(
  pet: PetInstance,
  species: SpeciesConfig,
  low: number,
  high: number
): number {
  let start = Math.min(low, high);
  let end = Math.max(low, high);
  if (climateCollapsed(pet, species, start)) {
    return start;
  }
  while (end - start > 1) {
    const mid = start + Math.floor((end - start) / 2);
    if (climateCollapsed(pet, species, mid)) {
      end = mid;
    } else {
      start = mid;
    }
  }
  return end;
}

/**
 * Whether the embryo has become unviable from prolonged climate collapse.
 * An already-flagged egg stays unviable; later care cannot revive it.
 */
export function isEmbryoUnviable(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): boolean {
  if (pet.isHatched) {
    return false;
  }
  if (pet.status === 'unviable') {
    return true;
  }
  const reading = readClimate(pet, species, nowEpoch);
  return strikeDurationMs(reading, requiresMoistureCare(species)) > UNVIABLE_AFTER_ZERO_MS;
}

/**
 * Commits the terminal `unviable` status when the climate has collapsed.
 * Returns the same instance when nothing changes.
 */
export function applyClimateMortality(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number
): PetInstance {
  if (pet.isHatched || pet.status === 'unviable') {
    return pet;
  }
  if (!isEmbryoUnviable(pet, species, nowEpoch)) {
    return pet;
  }
  return { ...pet, status: 'unviable' };
}
