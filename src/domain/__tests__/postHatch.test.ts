import { silkieChickenConfig } from '@/data/species/chicken';
import { leopardGeckoConfig } from '@/data/species/gecko';
import { greenSeaTurtleConfig } from '@/data/species/turtle';
import {
  HATCHLING_MATURATION_THRESHOLD,
  calculateCurrentWeightGrams,
  calculateMaturationProgress,
  resolvePetSnapshot,
} from '@/domain/timeEngine';
import type { PetInstance, SpeciesConfig } from '@/domain/types';
import { createMemoryStateStorage, createPetStoreApi } from '@/store/createPetStore';

describe('Post-hatch maturation', () => {
  const baseEpoch = 1_700_000_000_000;
  const dayMs = 86_400_000;
  const species: readonly SpeciesConfig[] = [
    silkieChickenConfig,
    leopardGeckoConfig,
    greenSeaTurtleConfig,
  ];

  const egg: PetInstance = {
    id: 'test-silkie',
    speciesId: 'silkie_chicken',
    nickname: 'Pip',
    laidAtEpoch: baseEpoch,
    lastVerifiedEpoch: baseEpoch,
    lastInteractedEpoch: baseEpoch,
    healthMultiplier: 1,
    currentTemperatureCelsius: 37.5,
    currentHumidityPct: 55,
    lastWarmedEpoch: baseEpoch,
    lastMistedEpoch: baseEpoch,
    vitalityScore: 1,
    isHatched: false,
  };

  function hatchedPet(hatchEpoch: number, verifiedEpoch = hatchEpoch): PetInstance {
    return {
      ...egg,
      isHatched: true,
      hatchedAtEpoch: hatchEpoch,
      lastVerifiedEpoch: verifiedEpoch,
      lastInteractedEpoch: hatchEpoch,
    };
  }

  it('maps day 0 to 0, the midpoint to 0.5, and clamps completed growth at 1', () => {
    const hatchEpoch = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    const span = silkieChickenConfig.adultMaturationDays;

    expect(calculateMaturationProgress(hatchEpoch, hatchEpoch, span)).toBe(0);
    expect(calculateMaturationProgress(hatchEpoch, hatchEpoch + (span / 2) * dayMs, span)).toBe(0.5);
    expect(calculateMaturationProgress(hatchEpoch, hatchEpoch + (span + 40) * dayMs, span)).toBe(1);

    const newborn = resolvePetSnapshot(hatchedPet(hatchEpoch), silkieChickenConfig, hatchEpoch);
    expect(newborn.postHatchAgeDays).toBe(0);
    expect(newborn.maturationProgress).toBe(0);
    expect(newborn.lifeStage).toBe('hatchling');
    expect(newborn.daysUntilAdult).toBe(span);

    const halfwayEpoch = hatchEpoch + (span / 2) * dayMs;
    const halfway = resolvePetSnapshot(
      hatchedPet(hatchEpoch, halfwayEpoch),
      silkieChickenConfig,
      halfwayEpoch
    );
    expect(halfway.maturationProgress).toBeCloseTo(0.5, 5);
    expect(halfway.postHatchAgeDays).toBeCloseTo(span / 2, 5);

    const adultEpoch = hatchEpoch + (span + 40) * dayMs;
    const adult = resolvePetSnapshot(hatchedPet(hatchEpoch, adultEpoch), silkieChickenConfig, adultEpoch);
    expect(adult.maturationProgress).toBe(1);
    expect(adult.lifeStage).toBe('adult');
    expect(adult.daysUntilAdult).toBe(0);
  });

  it('starts at hatch weight, gains fastest in the juvenile window, and plateaus at adult weight', () => {
    for (const config of species) {
      expect(config.adultWeightGrams).toBeGreaterThan(config.hatchWeightGrams);
      expect(calculateCurrentWeightGrams(config.hatchWeightGrams, config.adultWeightGrams, 0)).toBe(
        config.hatchWeightGrams
      );
      expect(calculateCurrentWeightGrams(config.hatchWeightGrams, config.adultWeightGrams, 1)).toBe(
        config.adultWeightGrams
      );
      expect(calculateCurrentWeightGrams(config.hatchWeightGrams, config.adultWeightGrams, 3)).toBe(
        config.adultWeightGrams
      );

      let previous = config.hatchWeightGrams;
      for (let step = 1; step <= 12; step += 1) {
        const next = calculateCurrentWeightGrams(
          config.hatchWeightGrams,
          config.adultWeightGrams,
          step / 12
        );
        expect(next).toBeGreaterThan(previous);
        previous = next;
      }
    }

    const { hatchWeightGrams, adultWeightGrams, adultMaturationDays } = silkieChickenConfig;
    const gainAt = (day: number): number => {
      const before = calculateCurrentWeightGrams(
        hatchWeightGrams,
        adultWeightGrams,
        (day - 1) / adultMaturationDays
      );
      const after = calculateCurrentWeightGrams(
        hatchWeightGrams,
        adultWeightGrams,
        day / adultMaturationDays
      );
      return after - before;
    };

    let peakDay = 1;
    let peakGain = gainAt(1);
    for (let day = 2; day <= adultMaturationDays; day += 1) {
      const gain = gainAt(day);
      if (gain > peakGain) {
        peakGain = gain;
        peakDay = day;
      }
    }

    const juvenileStartDay = adultMaturationDays * HATCHLING_MATURATION_THRESHOLD;
    expect(peakDay).toBeGreaterThan(juvenileStartDay);
    expect(peakDay).toBeLessThan(adultMaturationDays);
    expect(gainAt(2)).toBeLessThan(peakGain);
    expect(gainAt(adultMaturationDays)).toBeLessThan(peakGain);

    const hatchEpoch = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    const born = resolvePetSnapshot(hatchedPet(hatchEpoch), silkieChickenConfig, hatchEpoch);
    expect(born.currentWeightGrams).toBe(hatchWeightGrams);

    const grownEpoch = hatchEpoch + adultMaturationDays * dayMs;
    const grown = resolvePetSnapshot(
      hatchedPet(hatchEpoch, grownEpoch),
      silkieChickenConfig,
      grownEpoch
    );
    expect(grown.currentWeightGrams).toBe(adultWeightGrams);
  });

  it('freezes post-hatch age and weight when the clock rolls back', () => {
    const hatchEpoch = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    const verified = hatchEpoch + 10 * dayMs;
    const pet = hatchedPet(hatchEpoch, verified);
    const honest = resolvePetSnapshot(pet, silkieChickenConfig, verified);
    const frozen = resolvePetSnapshot(pet, silkieChickenConfig, verified - 4 * dayMs);

    expect(frozen.isClockTampered).toBe(true);
    expect(frozen.clockAnomaly).toBe('rollback');
    expect(frozen.postHatchAgeDays).toBeCloseTo(10, 5);
    expect(frozen.postHatchAgeDays).toBeCloseTo(honest.postHatchAgeDays, 5);
    expect(frozen.currentWeightGrams).toBeCloseTo(honest.currentWeightGrams, 5);
    expect(frozen.currentWeightGrams).toBeGreaterThan(silkieChickenConfig.hatchWeightGrams);
    expect(frozen.maturationProgress).toBeCloseTo(honest.maturationProgress, 5);
  });

  it('stamps hatch only after incubation is complete and keeps that epoch', () => {
    const store = createPetStoreApi({
      storage: createMemoryStateStorage(),
      now: () => baseEpoch,
      createId: () => 'pet-1',
    });

    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().recordInteraction('feed', baseEpoch + 1_000);
    expect(store.getState().pets['pet-1']?.isHatched).toBe(false);
    expect(store.getState().pets['pet-1']?.lastFedEpoch).toBeUndefined();

    store.getState().markHatched(baseEpoch + 10 * dayMs);
    expect(store.getState().pets['pet-1']?.isHatched).toBe(false);
    expect(store.getState().pets['pet-1']?.hatchedAtEpoch).toBeUndefined();

    const hatchEpoch = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    store.getState().markHatched(hatchEpoch);
    const hatched = store.getState().pets['pet-1'];
    expect(hatched?.isHatched).toBe(true);
    expect(hatched?.hatchedAtEpoch).toBe(hatchEpoch);
    expect(hatched?.lastInteractedEpoch).toBe(hatchEpoch);

    store.getState().markHatched(hatchEpoch + dayMs);
    expect(store.getState().pets['pet-1']?.hatchedAtEpoch).toBe(hatchEpoch);
    expect(store.getState().pets['pet-1']?.isHatched).toBe(true);

    store.getState().recordInteraction('feed', hatchEpoch + 5_000);
    store.getState().recordInteraction('weigh', hatchEpoch + 8_000);
    store.getState().recordInteraction('pet', hatchEpoch + 9_000);
    const cared = store.getState().pets['pet-1'];
    expect(cared?.lastFedEpoch).toBe(hatchEpoch + 5_000);
    expect(cared?.lastWeighedEpoch).toBe(hatchEpoch + 8_000);
    expect(cared?.lastInteractedEpoch).toBe(hatchEpoch + 9_000);
  });
});
