import { getSpeciesConfig, listSpeciesConfigs, SPECIES_REGISTRY } from '@/data/species';
import { parsePortraitKey } from '@/data/species/showcase';
import { speciesEn } from '@/data/species/catalogCopy';
import { silkieChickenConfig } from '@/data/species/chicken';
import { leopardGeckoConfig } from '@/data/species/gecko';
import { speciesMatchingFilter } from '@/data/species/roster';
import { greenSeaTurtleConfig } from '@/data/species/turtle';
import type { DevelopmentStage, SpeciesId } from '@/domain/types';
import { DIFFICULTY_TAGS, SPECIES_IDS } from '@/domain/types';
import { calculateCurrentWeightGrams } from '@/domain/timeEngine';

function expectMilestonesOrdered(milestones: { day: number }[]): void {
  expect(milestones.length).toBeGreaterThanOrEqual(6);
  for (let i = 1; i < milestones.length; i += 1) {
    expect(milestones[i].day).toBeGreaterThan(milestones[i - 1].day);
  }
}

describe('Species data registry', () => {
  it('retrieves the silkie chicken config from the registry', () => {
    const config = getSpeciesConfig('silkie_chicken');
    expect(config.id).toBe('silkie_chicken');
    expect(config.incubationDays).toBe(21);
    expect(config.baseHeartRateBpm).toBe(220);
    expect(config.adultMaturationDays).toBe(126);
  });

  it('falls back to silkie chicken for missing or invalid species IDs', () => {
    expect(getSpeciesConfig('unknown_animal').id).toBe('silkie_chicken');
    expect(getSpeciesConfig(undefined).id).toBe('silkie_chicken');
    expect(getSpeciesConfig(null).id).toBe('silkie_chicken');
    expect(getSpeciesConfig(123).id).toBe('silkie_chicken');
  });

  it('registers gecko and turtle biological windows from the spec matrix', () => {
    expect(getSpeciesConfig('leopard_gecko')).toEqual(leopardGeckoConfig);
    expect(getSpeciesConfig('green_sea_turtle')).toEqual(greenSeaTurtleConfig);
    expect(leopardGeckoConfig.incubationDays).toBe(50);
    expect(leopardGeckoConfig.milestones.find((m) => m.stage === 'internal_pip')?.day).toBe(47);
    expect(leopardGeckoConfig.milestones.find((m) => m.stage === 'external_pip')?.day).toBe(49);
    expect(greenSeaTurtleConfig.incubationDays).toBe(60);
    expect(greenSeaTurtleConfig.milestones.find((m) => m.stage === 'internal_pip')?.day).toBe(57);
    expect(greenSeaTurtleConfig.milestones.find((m) => m.stage === 'external_pip')?.day).toBe(59);
  });

  it('keeps every registered species milestone list strictly ordered by day', () => {
    expectMilestonesOrdered(silkieChickenConfig.milestones);
    for (const config of Object.values(SPECIES_REGISTRY)) {
      expectMilestonesOrdered(config.milestones);
      expect(config.milestones.length).toBeGreaterThan(0);
    }
  });

  it('stores common names and milestone copy as English strings', () => {
    for (const config of Object.values(SPECIES_REGISTRY)) {
      expect(typeof config.commonName).toBe('string');
      expect(config.commonName.trim().length).toBeGreaterThan(0);
      expect(config.egg.description.trim().length).toBeGreaterThan(0);
      expect(config.growth.fieldNotes.trim().length).toBeGreaterThan(0);
      for (const milestone of config.milestones) {
        expect(milestone.title.trim().length).toBeGreaterThan(0);
        expect(milestone.scientificSummary.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps candling percentages within [0.0, 1.0]', () => {
    for (const config of Object.values(SPECIES_REGISTRY)) {
      for (const milestone of config.milestones) {
        const { embryoSilhouettePct, airCellPct } = milestone.candling;
        expect(embryoSilhouettePct).toBeGreaterThanOrEqual(0);
        expect(embryoSilhouettePct).toBeLessThanOrEqual(1);
        expect(airCellPct).toBeGreaterThanOrEqual(0);
        expect(airCellPct).toBeLessThanOrEqual(1);
      }
    }
  });

  it('registers the expanded oviparous roster in carousel order', () => {
    expect(listSpeciesConfigs().map((config) => config.id)).toEqual([...SPECIES_IDS]);
    expect(SPECIES_IDS).toEqual(
      expect.arrayContaining([
        'peregrine_falcon',
        'emperor_penguin',
        'barn_owl',
        'mandarin_duck',
        'common_ostrich',
        'emu',
        'american_robin',
        'veiled_chameleon',
        'saltwater_crocodile',
        'ball_python',
        'platypus',
      ])
    );

    const incubationDays: Record<SpeciesId, number> = {
      silkie_chicken: 21,
      peregrine_falcon: 33,
      barn_owl: 32,
      mandarin_duck: 28,
      emperor_penguin: 64,
      common_ostrich: 42,
      emu: 56,
      american_robin: 14,
      leopard_gecko: 50,
      veiled_chameleon: 180,
      ball_python: 55,
      green_sea_turtle: 60,
      saltwater_crocodile: 85,
      platypus: 10,
    };
    for (const config of Object.values(SPECIES_REGISTRY)) {
      expect(config.incubationDays).toBe(incubationDays[config.id]);
      expect(config.milestones[0]?.stage).toBe('cleavage');
      expect(config.milestones.at(-1)?.stage).toBe('hatchling');
      expect(config.milestones.at(-1)?.day).toBe(config.incubationDays);
    }
  });

  it('requires cleavage, a vascular network, internal pip, and emergence on every species', () => {
    const required: DevelopmentStage[] = ['cleavage', 'vascular', 'internal_pip', 'hatchling'];
    for (const config of Object.values(SPECIES_REGISTRY)) {
      const stages = new Set(config.milestones.map((milestone) => milestone.stage));
      for (const stage of required) {
        expect(stages.has(stage)).toBe(true);
      }
    }
  });

  it('keeps hatch weight non-zero and below a strictly rising adult curve', () => {
    for (const config of Object.values(SPECIES_REGISTRY)) {
      expect(config.hatchWeightGrams).toBeGreaterThan(0);
      expect(config.adultWeightGrams).toBeGreaterThan(config.hatchWeightGrams);
      expect(calculateCurrentWeightGrams(config.hatchWeightGrams, config.adultWeightGrams, 0)).toBe(
        config.hatchWeightGrams
      );
      expect(calculateCurrentWeightGrams(config.hatchWeightGrams, config.adultWeightGrams, 1)).toBe(
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
  });

  it('filters the roster by taxonomic class without dropping registry members', () => {
    const all = listSpeciesConfigs();
    expect(speciesMatchingFilter(all, 'all')).toHaveLength(all.length);
    expect(speciesMatchingFilter(all, 'aves').every((species) => species.taxon === 'aves')).toBe(true);
    expect(speciesMatchingFilter(all, 'reptilia').every((species) => species.taxon === 'reptilia')).toBe(true);
    expect(speciesMatchingFilter(all, 'monotremata').map((species) => species.id)).toEqual(['platypus']);
    expect(speciesMatchingFilter(all, 'aves').length).toBeGreaterThanOrEqual(6);
    expect(speciesMatchingFilter(all, 'reptilia').length).toBeGreaterThanOrEqual(5);
  });

  it('gives every species a dossier with facts, habitat, and illustration keys', () => {
    for (const config of Object.values(SPECIES_REGISTRY)) {
      expect(config.showcase.funFacts.length).toBeGreaterThanOrEqual(2);
      expect(config.showcase.funFacts.length).toBeLessThanOrEqual(3);
      for (const fact of config.showcase.funFacts) {
        expect(fact.trim().length).toBeGreaterThan(0);
      }
      expect(config.showcase.habitat.trim().length).toBeGreaterThan(0);
      expect(config.showcase.temperament.trim().length).toBeGreaterThan(0);
      expect(DIFFICULTY_TAGS).toContain(config.showcase.difficultyTag);
      expect(config.showcase.babyIllustration.trim().length).toBeGreaterThan(0);
      expect(config.showcase.adultIllustration.trim().length).toBeGreaterThan(0);
      expect(parsePortraitKey(config.showcase.babyIllustration)).toEqual({
        speciesId: config.id,
        stage: 'baby',
      });
      expect(parsePortraitKey(config.showcase.adultIllustration)).toEqual({
        speciesId: config.id,
        stage: 'adult',
      });
    }
    expect(parsePortraitKey('not-a-portrait')).toBeNull();
    expect(parsePortraitKey('silkie_chicken.egg')).toBeNull();
  });

  it('keeps expanded roster names and field notes aligned with the English catalog', () => {
    expect(speciesEn['species.peregrineFalcon.name']).toBe(getSpeciesConfig('peregrine_falcon').commonName);
    expect(speciesEn['species.platypus.name']).toBe(getSpeciesConfig('platypus').commonName);
    expect(speciesEn['species.saltwaterCrocodile.notes']).toBe(
      getSpeciesConfig('saltwater_crocodile').growth.fieldNotes
    );
    expect(speciesEn['species.emperorPenguin.juvenile']).toBe(getSpeciesConfig('emperor_penguin').juvenile.title);
    expect(getSpeciesConfig('emu').commonName).toBe('Emu');
    expect(getSpeciesConfig('american_robin').commonName).toBe('American Robin');
  });
});
