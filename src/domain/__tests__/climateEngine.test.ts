import { silkieChickenConfig } from '@/data/species/chicken';
import type { PetInstance } from '@/domain/types';

import {
  AMBIENT_ROOM_CELSIUS,
  DRY_HUMIDITY_PCT,
  FRESH_VITALITY,
  HUMIDITY_TIME_CONSTANT_MS,
  TEMPERATURE_HALF_LIFE_MS,
  VITALITY_CEILING,
  VITALITY_FLOOR,
  VITALITY_RISE_TAU_MS,
  caredHeartRate,
  decayHumidity,
  decayTemperature,
  freshNestClimate,
  mistSubstrate,
  nestTemper,
  readClimate,
  SULK_AFTER_MS,
  STRIKE_AFTER_MS,
  warmNest,
} from '../climateEngine';

const HOUR_MS = 60 * 60 * 1000;

describe('Nest climate engine', () => {
  const baseEpoch = 1_700_000_000_000;
  const species = silkieChickenConfig;

  function nest(overrides: Partial<PetInstance> = {}): PetInstance {
    return {
      id: 'pet-1',
      speciesId: 'silkie_chicken',
      nickname: 'Pip',
      laidAtEpoch: baseEpoch,
      lastVerifiedEpoch: baseEpoch,
      lastInteractedEpoch: baseEpoch,
      healthMultiplier: 1,
      isHatched: false,
      ...freshNestClimate(baseEpoch, species.temperatureTargetCelsius, species.humidityTargetPct),
      ...overrides,
    };
  }

  it('cools toward ambient room temperature on the half-life curve', () => {
    expect(decayTemperature(37.5, 0)).toBeCloseTo(37.5, 5);

    const halfway = decayTemperature(37.5, TEMPERATURE_HALF_LIFE_MS);
    expect(halfway).toBeCloseTo(AMBIENT_ROOM_CELSIUS + (37.5 - AMBIENT_ROOM_CELSIUS) / 2, 5);
    expect(halfway).toBeLessThan(37.5);
    expect(halfway).toBeGreaterThan(AMBIENT_ROOM_CELSIUS);

    const dayLater = decayTemperature(37.5, 24 * HOUR_MS);
    expect(dayLater).toBeLessThan(halfway);
    expect(dayLater).toBeGreaterThan(AMBIENT_ROOM_CELSIUS);

    const settled = decayTemperature(37.5, TEMPERATURE_HALF_LIFE_MS * 12);
    expect(settled).toBeGreaterThan(AMBIENT_ROOM_CELSIUS);
    expect(settled).toBeLessThan(AMBIENT_ROOM_CELSIUS + 0.05);
  });

  it('dries the substrate toward the 30% baseline over the 24-hour time constant', () => {
    expect(decayHumidity(60, 0)).toBeCloseTo(60, 5);

    const oneDay = decayHumidity(60, HUMIDITY_TIME_CONSTANT_MS);
    expect(oneDay).toBeCloseTo(DRY_HUMIDITY_PCT + (60 - DRY_HUMIDITY_PCT) * Math.exp(-1), 5);
    expect(oneDay).toBeLessThan(60);
    expect(oneDay).toBeGreaterThan(DRY_HUMIDITY_PCT);

    const halfDay = decayHumidity(60, HUMIDITY_TIME_CONSTANT_MS / 2);
    expect(halfDay).toBeGreaterThan(oneDay);
    expect(halfDay).toBeLessThan(60);

    const week = decayHumidity(60, HUMIDITY_TIME_CONSTANT_MS * 8);
    expect(week).toBeGreaterThanOrEqual(DRY_HUMIDITY_PCT);
    expect(week).toBeLessThan(DRY_HUMIDITY_PCT + 0.05);
  });

  it('restores temperature and humidity to the species sweet spot when the nest is warmed or misted', () => {
    const pet = nest();
    const later = baseEpoch + 48 * HOUR_MS;
    const neglected = readClimate(pet, species, later);

    expect(neglected.temperatureCelsius).toBeLessThan(species.temperatureTargetCelsius - 1);
    expect(neglected.humidityPct).toBeLessThan(species.humidityTargetPct - 5);
    expect(neglected.inSweetSpot).toBe(false);
    expect(neglected.temperatureStatus).toBe('too_cold');
    expect(neglected.humidityStatus).toBe('dry');

    const warmed = warmNest(pet, species, later);
    const afterWarm = readClimate(warmed, species, later);
    expect(afterWarm.temperatureCelsius).toBeCloseTo(species.temperatureTargetCelsius, 5);
    expect(afterWarm.temperatureStatus).toBe('optimal');
    expect(afterWarm.humidityStatus).toBe('dry');
    expect(afterWarm.inSweetSpot).toBe(false);

    const restored = mistSubstrate(warmed, species, later);
    const afterCare = readClimate(restored, species, later);
    expect(afterCare.humidityPct).toBeCloseTo(species.humidityTargetPct, 5);
    expect(afterCare.temperatureStatus).toBe('optimal');
    expect(afterCare.humidityStatus).toBe('optimal');
    expect(afterCare.inSweetSpot).toBe(true);
    expect(restored.lastWarmedEpoch).toBe(later);
    expect(restored.lastMistedEpoch).toBe(later);
  });

  it('raises vitality inside the tolerance window and never drops below the zero-death floor', () => {
    const cared = readClimate(nest({ vitalityScore: 0.45 }), species, baseEpoch + HOUR_MS);
    expect(cared.inSweetSpot).toBe(true);
    const expectedRise = 0.45 + (VITALITY_CEILING - 0.45) * (1 - Math.exp(-HOUR_MS / VITALITY_RISE_TAU_MS));
    expect(cared.vitalityScore).toBeCloseTo(expectedRise, 5);
    expect(cared.vitalityScore).toBeGreaterThan(0.45);
    expect(cared.vitalityScore).toBeLessThanOrEqual(VITALITY_CEILING);

    const edge = readClimate(
      nest({
        currentTemperatureCelsius: species.temperatureTargetCelsius - 1,
        currentHumidityPct: species.humidityTargetPct + 5,
        vitalityScore: 0.5,
      }),
      species,
      baseEpoch
    );
    expect(edge.inSweetSpot).toBe(true);
    expect(edge.temperatureStatus).toBe('optimal');
    expect(edge.humidityStatus).toBe('optimal');

    const abandoned = readClimate(nest({ vitalityScore: VITALITY_CEILING }), species, baseEpoch + 40 * 24 * HOUR_MS);
    expect(abandoned.inSweetSpot).toBe(false);
    expect(abandoned.vitalityScore).toBeGreaterThanOrEqual(VITALITY_FLOOR);
    expect(abandoned.vitalityScore).toBeLessThan(0.45);
    expect(abandoned.mood === 'chilled' || abandoned.mood === 'sluggish').toBe(true);

    const ancient = readClimate(nest({ vitalityScore: 0.2 }), species, baseEpoch + 120 * 24 * HOUR_MS);
    expect(ancient.vitalityScore).toBeGreaterThanOrEqual(VITALITY_FLOOR);
    expect(ancient.vitalityScore).toBeCloseTo(VITALITY_FLOOR, 2);

    const hatched = nest({ isHatched: true, vitalityScore: 0.62 });
    expect(warmNest(hatched, species, baseEpoch + HOUR_MS)).toBe(hatched);
    expect(mistSubstrate(hatched, species, baseEpoch + HOUR_MS)).toBe(hatched);
  });

  it('keeps a detected heartbeat alive and at full rate only when vitality is thriving', () => {
    expect(caredHeartRate(0, VITALITY_CEILING)).toBe(0);
    expect(caredHeartRate(220, VITALITY_CEILING)).toBe(220);
    expect(caredHeartRate(220, VITALITY_FLOOR)).toBeGreaterThan(0);
    expect(caredHeartRate(220, VITALITY_FLOOR)).toBeLessThan(220);
    expect(caredHeartRate(220, FRESH_VITALITY)).toBeGreaterThan(caredHeartRate(220, VITALITY_FLOOR));
    expect(freshNestClimate(baseEpoch, 37.5, 55).vitalityScore).toBe(FRESH_VITALITY);
  });

  it('lets an egg sulk, fuss, or strike without ever stopping the clock', () => {
    expect(nestTemper(0, 0)).toBe('content');
    expect(nestTemper(SULK_AFTER_MS - 1, 0)).toBe('content');
    expect(nestTemper(SULK_AFTER_MS, 0)).toBe('chilly');
    expect(nestTemper(0, SULK_AFTER_MS)).toBe('parched');
    expect(nestTemper(SULK_AFTER_MS, SULK_AFTER_MS)).toBe('fussy');
    expect(nestTemper(STRIKE_AFTER_MS, SULK_AFTER_MS)).toBe('fussy');
    expect(nestTemper(STRIKE_AFTER_MS, STRIKE_AFTER_MS)).toBe('on_strike');

    const fresh = readClimate(nest(), species, baseEpoch);
    expect(fresh.temper).toBe('content');
    expect(fresh.warmthOffMs).toBe(0);
    expect(fresh.moistureOffMs).toBe(0);

    const drifting = readClimate(nest(), species, baseEpoch + 6 * HOUR_MS);
    expect(drifting.inSweetSpot).toBe(false);
    expect(drifting.temper).toBe('content');
    expect(drifting.warmthOffMs).toBeGreaterThan(0);
    expect(drifting.warmthOffMs).toBeLessThan(SULK_AFTER_MS);

    const chilly = readClimate(nest(), species, baseEpoch + 12 * HOUR_MS);
    expect(chilly.temperatureStatus).toBe('too_cold');
    expect(chilly.temper).toBe('chilly');
    expect(chilly.moistureOffMs).toBeLessThan(SULK_AFTER_MS);

    const fussy = readClimate(nest(), species, baseEpoch + 22 * HOUR_MS);
    expect(fussy.temper).toBe('fussy');

    const striking = readClimate(nest(), species, baseEpoch + 36 * HOUR_MS);
    expect(striking.temper).toBe('on_strike');
    expect(striking.vitalityScore).toBeGreaterThanOrEqual(VITALITY_FLOOR);

    const warmed = readClimate(warmNest(nest(), species, baseEpoch + 36 * HOUR_MS), species, baseEpoch + 36 * HOUR_MS);
    expect(warmed.temperatureStatus).toBe('optimal');
    expect(warmed.temper).toBe('parched');

    const restored = readClimate(
      mistSubstrate(warmNest(nest(), species, baseEpoch + 36 * HOUR_MS), species, baseEpoch + 36 * HOUR_MS),
      species,
      baseEpoch + 36 * HOUR_MS
    );
    expect(restored.temper).toBe('content');
    expect(restored.inSweetSpot).toBe(true);
  });
});
