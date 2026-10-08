import type { PetInstance, SpeciesConfig } from '@/domain/types';

/**
 * Nest micro-climate is a pure function of care timestamps.
 * Nothing here advances on a timer. Callers pass `nowEpoch`.
 *
 * Temperature relaxes toward room air on a 21-hour half-life, the midpoint of
 * the 18–24 hour band. Humidity relaxes toward a dry substrate on a 24-hour
 * time constant. Vitality rewards time inside the species sweet spot and
 * eases toward a floor when the nest is neglected. It never reaches zero:
 * a chilled egg stays alive, and the 1:1 hatch clock is not stalled.
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
export const VITALITY_RISE_TAU_MS = 4 * 60 * 60 * 1000;
export const VITALITY_FALL_TAU_MS = 18 * 60 * 60 * 1000;

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
export function decayTemperature(setpointCelsius: number, elapsedMs: number): number {
  return decayHalfLife(
    finiteNumber(setpointCelsius, AMBIENT_ROOM_CELSIUS),
    AMBIENT_ROOM_CELSIUS,
    elapsedMs,
    TEMPERATURE_HALF_LIFE_MS
  );
}

/** Exponential relaxation toward the dry substrate baseline. */
export function decayHumidity(setpointPct: number, elapsedMs: number): number {
  return decayExponential(
    finiteNumber(setpointPct, DRY_HUMIDITY_PCT),
    DRY_HUMIDITY_PCT,
    elapsedMs,
    HUMIDITY_TIME_CONSTANT_MS
  );
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

export function nestTemper(warmthOffMs: number, moistureOffMs: number): NestTemper {
  const warmth = Math.max(0, warmthOffMs);
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
  const temperatureCelsius = decayTemperature(
    pet.currentTemperatureCelsius,
    elapsedMs(pet.lastWarmedEpoch, now)
  );
  const humidityPct = decayHumidity(pet.currentHumidityPct, elapsedMs(pet.lastMistedEpoch, now));
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
    temper: nestTemper(warmthOffMs, moistureOffMs),
  };
}

export function warmNest(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): PetInstance {
  if (pet.isHatched || !Number.isFinite(nowEpoch)) {
    return pet;
  }
  const now = finiteEpoch(nowEpoch, pet.lastWarmedEpoch);
  return {
    ...pet,
    currentTemperatureCelsius: species.temperatureTargetCelsius,
    lastWarmedEpoch: now,
    vitalityScore: projectVitality(pet, species, now),
    lastInteractedEpoch: now,
  };
}

export function mistSubstrate(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): PetInstance {
  if (pet.isHatched || !Number.isFinite(nowEpoch)) {
    return pet;
  }
  const now = finiteEpoch(nowEpoch, pet.lastMistedEpoch);
  return {
    ...pet,
    currentHumidityPct: species.humidityTargetPct,
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
          TEMPERATURE_HALF_LIFE_MS
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
          HUMIDITY_TIME_CONSTANT_MS
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
