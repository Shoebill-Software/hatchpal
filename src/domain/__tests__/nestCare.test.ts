import { silkieChickenConfig } from '@/data/species/chicken';
import { commonOstrichConfig } from '@/data/species/commonOstrich';
import { greenSeaTurtleConfig } from '@/data/species/turtle';
import type { PetInstance } from '@/domain/types';

import {
  HUMIDITY_TIME_CONSTANT_MS,
  TEMPERATURE_HALF_LIFE_MS,
  UNVIABLE_AFTER_ZERO_MS,
  freshNestClimate,
  readClimate,
} from '../climateEngine';
import {
  BROOD_PERFECT_CELSIUS,
  WISH_WINDOW_MS,
  activeWish,
  applyCareEvent,
  baseSpritzPct,
  broodCeiling,
  broodStep,
  classifyBrood,
  classifyMist,
  emptyCareLog,
  mistPerfectBand,
  resolveTemperament,
  sanitizeCareLog,
  spritzAmount,
  wishForWindow,
} from '../nestCare';
import { DAY_MS, WEATHER_DRIFT, weatherAt, weatherForDay } from '../nestWeather';
import { createPetInstance, sanitizePetInstance } from '../petIntegrity';
import { hashString } from '../seed';
import type { WishKind } from '../types';

const HOUR_MS = 60 * 60 * 1000;
const BASE = 1_700_000_000_000;
const species = silkieChickenConfig;

function egg(overrides: Partial<PetInstance> = {}): PetInstance {
  return {
    id: 'egg-1',
    speciesId: 'silkie_chicken',
    nickname: 'Pip',
    laidAtEpoch: BASE,
    lastVerifiedEpoch: BASE,
    lastInteractedEpoch: BASE,
    healthMultiplier: 1,
    isHatched: false,
    weatherSeed: 12345,
    care: emptyCareLog(),
    ...freshNestClimate(BASE, species.temperatureTargetCelsius, species.humidityTargetPct),
    ...overrides,
  };
}

describe('brooding', () => {
  it('heats fast when cold and slows to a steady approach near the target', () => {
    const target = species.temperatureTargetCelsius;
    const farStep = broodStep(25, species, 1000, 16) - 25;
    const nearStep = broodStep(target - 0.5, species, 1000, 16) - (target - 0.5);
    expect(farStep).toBeGreaterThan(nearStep * 5);
    expect(nearStep).toBeGreaterThan(0);
  });

  it('eases in so a quick tap barely moves the needle', () => {
    const tap = broodStep(36, species, 0, 16) - 36;
    const held = broodStep(36, species, 2000, 16) - 36;
    expect(tap).toBeLessThan(held);
  });

  it('never heats past the lamp ceiling', () => {
    let celsius = 30;
    for (let held = 0; held < 30_000; held += 16) {
      celsius = broodStep(celsius, species, held, 16);
    }
    expect(celsius).toBeCloseTo(broodCeiling(species), 5);
  });

  it('reaches the target from room air within a few seconds of holding', () => {
    let celsius = 21;
    let held = 0;
    while (celsius < species.temperatureTargetCelsius && held < 20_000) {
      celsius = broodStep(celsius, species, held, 16);
      held += 16;
    }
    expect(held).toBeLessThan(6000);
  });

  it('only calls a landing perfect when the brood actually climbed into the notch', () => {
    const target = species.temperatureTargetCelsius;
    expect(classifyBrood(35, target + 0.1, target)).toBe('perfect');
    expect(classifyBrood(target, target + 0.05, target)).toBe('cozy');
    expect(classifyBrood(35, target + BROOD_PERFECT_CELSIUS + 0.2, target)).toBe('cozy');
    expect(classifyBrood(35, target + 1.6, target)).toBe('toasty');
    expect(classifyBrood(30, target - 1.6, target)).toBe('chilly');
  });
});

describe('misting', () => {
  it('sizes the nozzle to the species and varies each spritz deterministically', () => {
    expect(baseSpritzPct(greenSeaTurtleConfig)).toBeGreaterThan(baseSpritzPct(species));
    const run = Array.from({ length: 6 }, (_, index) => spritzAmount(species, index));
    expect(new Set(run.map((value) => value.toFixed(3))).size).toBeGreaterThan(3);
    expect(spritzAmount(species, 3)).toBe(spritzAmount(species, 3));
  });

  it('judges the settled humidity against the species band', () => {
    const target = species.humidityTargetPct;
    expect(classifyMist(40, target + 0.5, species)).toBe('perfect');
    expect(classifyMist(target, target + 0.5, species)).toBe('dewy');
    expect(classifyMist(40, target + 7, species)).toBe('soggy');
    expect(classifyMist(30, target - 7, species)).toBe('dry');
  });

  it('adds each spritz on top of the current reading and counts it', () => {
    const later = BASE + 12 * HOUR_MS;
    const pet = egg();
    const before = readClimate(pet, species, later).humidityPct;
    const { pet: misted, result } = applyCareEvent(pet, species, { kind: 'spritz' }, later);
    expect(result.addedPct).toBeCloseTo(spritzAmount(species, 0), 5);
    expect(readClimate(misted, species, later).humidityPct).toBeCloseTo(before + spritzAmount(species, 0), 5);
    expect(misted.care?.spritzes).toBe(1);
    expect(misted.lastMistedEpoch).toBe(later);
  });
});

describe('nest weather', () => {
  it('starts every egg on a mild day and is deterministic per seed', () => {
    expect(weatherForDay(99, 0)).toBe('mild');
    expect(weatherForDay(99, 5)).toBe(weatherForDay(99, 5));
    const seen = new Set(Array.from({ length: 60 }, (_, day) => weatherForDay(424242, day + 1)));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('treats eggs without a seed as always mild', () => {
    const legacy = egg({ weatherSeed: undefined });
    expect(weatherAt(legacy, BASE + 9 * DAY_MS)).toBe('mild');
  });

  it('scales drift by the weather on the day of the last care', () => {
    const seed = findSeedWith('cold_snap', 1);
    const cared = BASE + DAY_MS + HOUR_MS;
    const cold = egg({ weatherSeed: seed, lastWarmedEpoch: cared, lastMistedEpoch: cared });
    const mild = egg({ weatherSeed: undefined, lastWarmedEpoch: cared, lastMistedEpoch: cared });
    const later = cared + 6 * HOUR_MS;
    expect(readClimate(cold, species, later).temperatureCelsius).toBeLessThan(
      readClimate(mild, species, later).temperatureCelsius
    );
    expect(WEATHER_DRIFT.cold_snap.warmth * TEMPERATURE_HALF_LIFE_MS).toBeLessThan(TEMPERATURE_HALF_LIFE_MS);
    expect(WEATHER_DRIFT.muggy.moisture * HUMIDITY_TIME_CONSTANT_MS).toBeGreaterThan(HUMIDITY_TIME_CONSTANT_MS);
  });
});

describe('wishes and hearts', () => {
  it('always opens with a lullaby wish and never repeats a kind back to back', () => {
    const pet = egg();
    expect(wishForWindow(pet, species, 0)).toBe('lullaby');
    let previous = wishForWindow(pet, species, 0);
    for (let index = 1; index < 200; index += 1) {
      const wish = wishForWindow(pet, species, index);
      if (wish && previous) {
        expect(wish).not.toBe(previous);
      }
      previous = wish;
    }
  });

  it('keeps the wish chain stable for the same seed across calls', () => {
    const pet = egg({ weatherSeed: 4242 });
    const first = Array.from({ length: 40 }, (_, index) => wishForWindow(pet, species, index));
    const twin = egg({ id: 'other', weatherSeed: 4242 });
    const second = Array.from({ length: 40 }, (_, index) => wishForWindow(twin, species, index));
    expect(second).toEqual(first);
  });

  it('never asks a dry-nesting ratite for a perfect mist', () => {
    const ostrich = egg({ speciesId: 'common_ostrich' });
    for (let index = 0; index < 200; index += 1) {
      expect(wishForWindow(ostrich, commonOstrichConfig, index)).not.toBe('perfect_mist');
    }
  });

  it('grants the lullaby once, earns a heart, and closes the window', () => {
    const now = BASE + HOUR_MS;
    const first = applyCareEvent(egg(), species, { kind: 'lullaby' }, now);
    expect(first.result.granted).toBe('lullaby');
    expect(first.result.credited).toBe('song');
    expect(first.pet.care?.hearts).toBe(1);
    // Habit point + matching-wish bonus.
    expect(first.pet.care?.affinity.song).toBe(2);
    expect(activeWish(first.pet, species, now)).toBeNull();

    const again = applyCareEvent(first.pet, species, { kind: 'lullaby' }, now + 1000);
    expect(again.result.granted).toBeNull();
    expect(again.result.credited).toBeUndefined();
    expect(again.pet.care?.hearts).toBe(1);
    expect(again.pet.care?.affinity.song).toBe(2);
  });

  it('grants a perfect-brood wish only for a perfect landing', () => {
    const pet = egg();
    const index = findWindow(pet, 'perfect_brood');
    const now = BASE + index * WISH_WINDOW_MS + HOUR_MS;
    const target = species.temperatureTargetCelsius;
    const cozy = applyCareEvent(pet, species, { kind: 'brood', startCelsius: 34, celsius: target + 0.8 }, now);
    expect(cozy.result.brood).toBe('cozy');
    expect(cozy.result.granted).toBeNull();
    const perfect = applyCareEvent(pet, species, { kind: 'brood', startCelsius: 34, celsius: target }, now);
    expect(perfect.result.brood).toBe('perfect');
    expect(perfect.result.granted).toBe('perfect_brood');
    expect(perfect.pet.currentTemperatureCelsius).toBeCloseTo(target, 5);
    expect(perfect.pet.care?.hearts).toBe(1);
    expect(perfect.pet.care?.affinity.warmth).toBe(2);
  });

  it('grants a perfect-mist wish once the settled humidity lands in the notch', () => {
    const pet = egg();
    const index = findWindow(pet, 'perfect_mist');
    const now = BASE + index * WISH_WINDOW_MS + HOUR_MS;
    const target = species.humidityTargetPct;
    const band = mistPerfectBand(species);
    const startPct = target - band - 2;
    const nearMiss = applyCareEvent(
      {
        ...pet,
        currentHumidityPct: target + band + 0.5,
        lastMistedEpoch: now,
      },
      species,
      { kind: 'mist_settled', startPct },
      now
    );
    expect(nearMiss.result.mist).toBe('dewy');
    expect(nearMiss.result.granted).toBeNull();

    const perfect = applyCareEvent(
      {
        ...pet,
        currentHumidityPct: target,
        lastMistedEpoch: now,
      },
      species,
      { kind: 'mist_settled', startPct },
      now
    );
    expect(perfect.result.mist).toBe('perfect');
    expect(perfect.result.granted).toBe('perfect_mist');
    expect(perfect.pet.care?.hearts).toBe(1);
    expect(perfect.pet.care?.affinity.moisture).toBe(2);
  });

  it('grants a sweet-spot wish from a brood that leaves the nest in band', () => {
    const pet = egg();
    const index = findWindow(pet, 'sweet_spot');
    const now = BASE + index * WISH_WINDOW_MS + HOUR_MS;
    const target = species.temperatureTargetCelsius;
    // Keep moisture on target so the brood alone can restore the sweet spot.
    const ready = {
      ...pet,
      currentHumidityPct: species.humidityTargetPct,
      lastMistedEpoch: now,
      currentTemperatureCelsius: 34,
      lastWarmedEpoch: now - HOUR_MS,
    };
    const granted = applyCareEvent(
      ready,
      species,
      { kind: 'brood', startCelsius: 34, celsius: target + 0.8 },
      now
    );
    expect(granted.result.brood).toBe('cozy');
    expect(granted.result.granted).toBe('sweet_spot');
    expect(granted.pet.care?.hearts).toBe(1);
    expect(readClimate(granted.pet, species, now).inSweetSpot).toBe(true);
  });

  it('stops wishing once the egg has hatched', () => {
    expect(activeWish(egg({ isHatched: true }), species, BASE)).toBeNull();
    const hatched = egg({ isHatched: true });
    expect(applyCareEvent(hatched, species, { kind: 'lullaby' }, BASE).pet).toBe(hatched);
  });
});

describe('affinity caps', () => {
  it('credits each habit at most once per wish window', () => {
    const now = BASE + HOUR_MS;
    const first = applyCareEvent(egg(), species, { kind: 'peek' }, now);
    expect(first.result.credited).toBe('curiosity');
    expect(first.pet.care?.affinity.curiosity).toBe(1);

    const second = applyCareEvent(first.pet, species, { kind: 'peek' }, now + 500);
    expect(second.result.credited).toBeUndefined();
    expect(second.pet.care?.affinity.curiosity).toBe(1);
    expect(second.pet).toBe(first.pet);

    const nextWindow = BASE + WISH_WINDOW_MS + HOUR_MS;
    const third = applyCareEvent(first.pet, species, { kind: 'peek' }, nextWindow);
    expect(third.result.credited).toBe('curiosity');
    expect(third.pet.care?.affinity.curiosity).toBe(2);
  });

  it('still awards the matching-wish affinity bonus on top of the habit point', () => {
    const pet = egg();
    const index = findWindow(pet, 'perfect_brood');
    const now = BASE + index * WISH_WINDOW_MS + HOUR_MS;
    const target = species.temperatureTargetCelsius;
    const perfect = applyCareEvent(pet, species, { kind: 'brood', startCelsius: 34, celsius: target }, now);
    expect(perfect.result.credited).toBe('warmth');
    expect(perfect.result.granted).toBe('perfect_brood');
    expect(perfect.pet.care?.affinity.warmth).toBe(2);
  });
});

describe('temperament', () => {
  it('reads the dominant habit and falls back to easygoing on thin or tied records', () => {
    const log = emptyCareLog();
    expect(resolveTemperament(log)).toBe('easygoing');
    expect(resolveTemperament({ ...log, affinity: { warmth: 5, moisture: 2, song: 1, curiosity: 0 } })).toBe('sunny');
    expect(resolveTemperament({ ...log, affinity: { warmth: 3, moisture: 3, song: 0, curiosity: 0 } })).toBe('easygoing');
    expect(resolveTemperament({ ...log, affinity: { warmth: 0, moisture: 0, song: 1, curiosity: 4 } })).toBe('curious');
    expect(resolveTemperament(undefined)).toBe('easygoing');
  });
});

describe('unviable care', () => {
  it('blocks wishes and care once the unviable status is committed', () => {
    const flagged = egg({ status: 'unviable' });
    expect(activeWish(flagged, species, BASE + HOUR_MS)).toBeNull();

    const refused = applyCareEvent(flagged, species, { kind: 'lullaby' }, BASE + HOUR_MS);
    expect(refused.pet).toBe(flagged);
    expect(refused.result.granted).toBeNull();

    const brood = applyCareEvent(
      flagged,
      species,
      { kind: 'brood', startCelsius: 21, celsius: species.temperatureTargetCelsius },
      BASE + HOUR_MS
    );
    expect(brood.pet).toBe(flagged);
    expect(brood.pet.currentTemperatureCelsius).toBe(flagged.currentTemperatureCelsius);
  });

  it('still allows last-chance care before the status flag is written', () => {
    const lostEpoch = BASE + 36 * HOUR_MS + UNVIABLE_AFTER_ZERO_MS + HOUR_MS;
    const rescued = applyCareEvent(
      egg(),
      species,
      { kind: 'brood', startCelsius: 21, celsius: species.temperatureTargetCelsius },
      lostEpoch
    );
    expect(rescued.pet.status).not.toBe('unviable');
    expect(rescued.pet.currentTemperatureCelsius).toBeCloseTo(species.temperatureTargetCelsius, 5);
    expect(rescued.pet.lastWarmedEpoch).toBe(lostEpoch);
  });
});

describe('persistence', () => {
  it('seeds new eggs and survives a sanitize round trip', () => {
    const fresh = createPetInstance({ id: 'abc', speciesId: 'silkie_chicken', nickname: 'Dot', nowEpoch: BASE });
    expect(typeof fresh.weatherSeed).toBe('number');
    expect(fresh.weatherSeed).toBe(hashString('abc'));
    expect(fresh.care).toEqual(emptyCareLog());
    const restored = sanitizePetInstance(JSON.parse(JSON.stringify(fresh)), BASE);
    expect(restored?.weatherSeed).toBe(fresh.weatherSeed);
    expect(restored?.care).toEqual(fresh.care);
  });

  it('materializes an empty care log for legacy eggs and dedupes granted windows', () => {
    const legacy = sanitizePetInstance(
      {
        id: 'legacy',
        speciesId: 'silkie_chicken',
        nickname: 'Pip',
        laidAtEpoch: BASE,
        lastVerifiedEpoch: BASE,
        lastInteractedEpoch: BASE,
        healthMultiplier: 1,
        currentTemperatureCelsius: 37.5,
        currentHumidityPct: 55,
        lastWarmedEpoch: BASE,
        lastMistedEpoch: BASE,
        vitalityScore: 0.8,
        isHatched: false,
      },
      BASE
    );
    expect(legacy?.care).toEqual(emptyCareLog());
    expect(legacy?.weatherSeed).toBeUndefined();

    const repaired = sanitizeCareLog({
      hearts: -3,
      grantedWindows: [2, 'x', -1, 4.7, 2, 9],
      affinity: { warmth: 'lots', song: 2 },
      creditedWindows: null,
      spritzes: Number.NaN,
    });
    expect(repaired).toEqual({
      hearts: 0,
      grantedWindows: [2, 4, 9],
      affinity: { warmth: 0, moisture: 0, song: 2, curiosity: 0 },
      creditedWindows: { warmth: -1, moisture: -1, song: -1, curiosity: -1 },
      spritzes: 0,
    });
    expect(sanitizeCareLog('nope')).toBeUndefined();
  });

  it('keeps weatherSeed and care hearts across a save reload after care', () => {
    const now = BASE + HOUR_MS;
    const cared = applyCareEvent(egg({ id: 'reload-egg' }), species, { kind: 'lullaby' }, now);
    const restored = sanitizePetInstance(JSON.parse(JSON.stringify(cared.pet)), now);
    expect(restored?.weatherSeed).toBe(cared.pet.weatherSeed);
    expect(restored?.care?.hearts).toBe(1);
    expect(restored?.care?.affinity.song).toBe(2);
    expect(restored?.care?.grantedWindows).toEqual([0]);
  });
});

function findSeedWith(weather: 'cold_snap', day: number): number {
  for (let seed = 1; seed < 10_000; seed += 1) {
    if (weatherForDay(seed, day) === weather) {
      return seed;
    }
  }
  throw new Error('no seed found');
}

function findWindow(pet: PetInstance, kind: WishKind): number {
  for (let index = 1; index < 400; index += 1) {
    if (wishForWindow(pet, species, index) === kind) {
      return index;
    }
  }
  throw new Error(`no window found for ${kind}`);
}
