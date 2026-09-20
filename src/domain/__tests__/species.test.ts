import { silkieChickenConfig } from '@/data/species/chicken';
import { leopardGeckoConfig } from '@/data/species/gecko';
import { getSpeciesConfig, SPECIES_REGISTRY } from '@/data/species';
import { greenSeaTurtleConfig } from '@/data/species/turtle';

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
});
