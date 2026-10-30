import { A_LA_CARTE_PRODUCTS, FREE_STARTER_IDS } from '@/domain/entitlements';
import { cradleAllowance } from '@/domain/cradleCapacity';
import type { SpeciesId, TaxonomicClass } from '@/domain/types';

import {
  RESERVE_SPECIES_IDS,
  earnedExtraCradles,
  earnedSpeciesIds,
  isReserveSpecies,
  keeperMilestones,
  milestoneForSpecies,
  newlyUnlockedMilestones,
  type HatchCredit,
} from '../keeperRewards';

function credit(speciesId: SpeciesId, taxon: TaxonomicClass): HatchCredit {
  return { speciesId, taxon };
}

describe('keeper rewards', () => {
  it('starts with one nest and no earned species', () => {
    const milestones = keeperMilestones([]);
    expect(milestones.every((milestone) => !milestone.unlocked)).toBe(true);
    expect(earnedSpeciesIds([])).toEqual([]);
    expect(earnedExtraCradles(0)).toBe(0);
    expect(cradleAllowance(false, 0)).toBe(1);
    expect(cradleAllowance(true, 0)).toBe(3);
  });

  it('opens a second nest and the mandarin duck on the first hatch', () => {
    const hatches = [credit('silkie_chicken', 'aves')];
    const milestones = keeperMilestones(hatches);
    const first = milestones.find((milestone) => milestone.id === 'first_hatch');
    expect(first?.unlocked).toBe(true);
    expect(first?.rewards).toEqual([
      { kind: 'cradle' },
      { kind: 'species', speciesId: 'mandarin_duck' },
    ]);
    expect(earnedSpeciesIds(hatches)).toEqual(['mandarin_duck']);
    expect(earnedExtraCradles(1)).toBe(1);
    expect(cradleAllowance(false, 1)).toBe(2);
    expect(cradleAllowance(false, 4)).toBe(2);
    expect(cradleAllowance(true, 4)).toBe(3);
    expect(milestones.find((milestone) => milestone.id === 'three_hatches')?.progress).toBe(1);
    expect(milestones.find((milestone) => milestone.id === 'two_birds')?.progress).toBe(1);
  });

  it('counts repeated hatches toward three, and unique taxa toward birds and reptiles', () => {
    const repeats = [
      credit('silkie_chicken', 'aves'),
      credit('silkie_chicken', 'aves'),
      credit('silkie_chicken', 'aves'),
    ];
    const fromRepeats = keeperMilestones(repeats);
    expect(fromRepeats.find((milestone) => milestone.id === 'three_hatches')?.unlocked).toBe(true);
    expect(earnedSpeciesIds(repeats)).toEqual(['mandarin_duck', 'barn_owl']);
    expect(fromRepeats.find((milestone) => milestone.id === 'two_birds')?.unlocked).toBe(false);

    const mixed = [
      credit('silkie_chicken', 'aves'),
      credit('american_robin', 'aves'),
      credit('leopard_gecko', 'reptilia'),
      credit('ball_python', 'reptilia'),
      credit('platypus', 'monotremata'),
    ];
    const fromMixed = keeperMilestones(mixed);
    expect(fromMixed.every((milestone) => milestone.unlocked)).toBe(true);
    expect(earnedSpeciesIds(mixed)).toEqual([
      'mandarin_duck',
      'barn_owl',
      'peregrine_falcon',
      'veiled_chameleon',
    ]);
    expect(milestoneForSpecies(fromMixed, 'peregrine_falcon')?.id).toBe('two_birds');
    expect(milestoneForSpecies(fromMixed, 'emperor_penguin')).toBeNull();
  });

  it('reports only the milestones a new hatch just completed', () => {
    const before = keeperMilestones([]);
    const after = keeperMilestones([credit('emu', 'aves')]);
    expect(newlyUnlockedMilestones(before, after).map((milestone) => milestone.id)).toEqual(['first_hatch']);
    expect(newlyUnlockedMilestones(after, after)).toEqual([]);
  });

  it('keeps the reserve paid and earnable species buyable ahead of time', () => {
    const earned = ['mandarin_duck', 'barn_owl', 'peregrine_falcon', 'veiled_chameleon'];
    const catalog = new Set(A_LA_CARTE_PRODUCTS.map((item) => item.speciesId));
    for (const speciesId of earned) {
      expect(isReserveSpecies(speciesId)).toBe(false);
      expect(FREE_STARTER_IDS).not.toContain(speciesId);
      expect(catalog.has(speciesId as (typeof A_LA_CARTE_PRODUCTS)[number]['speciesId'])).toBe(true);
    }
    for (const speciesId of RESERVE_SPECIES_IDS) {
      expect(isReserveSpecies(speciesId)).toBe(true);
      expect(catalog.has(speciesId)).toBe(true);
      expect(FREE_STARTER_IDS).not.toContain(speciesId);
    }
  });
});