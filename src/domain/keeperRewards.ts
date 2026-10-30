import type { SpeciesId, TaxonomicClass } from './types';

/**
 * Play rewards derived from the hatch archive.
 * The second nest and four species are earned. Penguin, platypus, crocodile,
 * and ostrich stay in the paid reserve, alone or inside the Sanctuary Pass.
 */

export const RESERVE_SPECIES_IDS = [
  'emperor_penguin',
  'platypus',
  'saltwater_crocodile',
  'common_ostrich',
] as const satisfies readonly SpeciesId[];

export const KEEPER_MILESTONE_IDS = ['first_hatch', 'three_hatches', 'two_birds', 'two_reptiles'] as const;

export type KeeperMilestoneId = (typeof KEEPER_MILESTONE_IDS)[number];

export type KeeperReward =
  | { kind: 'cradle' }
  | { kind: 'species'; speciesId: SpeciesId };

export interface HatchCredit {
  speciesId: SpeciesId;
  taxon: TaxonomicClass;
}

export interface KeeperMilestone {
  id: KeeperMilestoneId;
  goal: number;
  progress: number;
  unlocked: boolean;
  rewards: readonly KeeperReward[];
}

const FIRST_HATCH_GOAL = 1;
const THREE_HATCH_GOAL = 3;
const TWO_TAXA_GOAL = 2;

const MILESTONE_REWARDS: Record<KeeperMilestoneId, readonly KeeperReward[]> = {
  first_hatch: [
    { kind: 'cradle' },
    { kind: 'species', speciesId: 'mandarin_duck' },
  ],
  three_hatches: [{ kind: 'species', speciesId: 'barn_owl' }],
  two_birds: [{ kind: 'species', speciesId: 'peregrine_falcon' }],
  two_reptiles: [{ kind: 'species', speciesId: 'veiled_chameleon' }],
};

interface HatchSummary {
  count: number;
  aves: number;
  reptilia: number;
}

function summarize(hatches: readonly HatchCredit[]): HatchSummary {
  const aves = new Set<string>();
  const reptilia = new Set<string>();
  for (const hatch of hatches) {
    if (hatch.taxon === 'aves') {
      aves.add(hatch.speciesId);
    } else if (hatch.taxon === 'reptilia') {
      reptilia.add(hatch.speciesId);
    }
  }
  return { count: hatches.length, aves: aves.size, reptilia: reptilia.size };
}

function clampProgress(value: number, goal: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(goal, Math.floor(value));
}

export function toHatchCredits(
  archive: readonly { speciesId: SpeciesId }[],
  taxonOf: (speciesId: SpeciesId) => TaxonomicClass
): HatchCredit[] {
  return archive.map((entry) => ({
    speciesId: entry.speciesId,
    taxon: taxonOf(entry.speciesId),
  }));
}

export function keeperMilestones(hatches: readonly HatchCredit[]): KeeperMilestone[] {
  const summary = summarize(hatches);
  const rows: readonly { id: KeeperMilestoneId; goal: number; progress: number }[] = [
    { id: 'first_hatch', goal: FIRST_HATCH_GOAL, progress: summary.count },
    { id: 'three_hatches', goal: THREE_HATCH_GOAL, progress: summary.count },
    { id: 'two_birds', goal: TWO_TAXA_GOAL, progress: summary.aves },
    { id: 'two_reptiles', goal: TWO_TAXA_GOAL, progress: summary.reptilia },
  ];
  return rows.map((row) => {
    const progress = clampProgress(row.progress, row.goal);
    return {
      id: row.id,
      goal: row.goal,
      progress,
      unlocked: progress >= row.goal,
      rewards: MILESTONE_REWARDS[row.id],
    };
  });
}

export function rewardsForMilestone(id: KeeperMilestoneId): readonly KeeperReward[] {
  return MILESTONE_REWARDS[id];
}

export function isKeeperMilestoneId(value: string): value is KeeperMilestoneId {
  return (KEEPER_MILESTONE_IDS as readonly string[]).includes(value);
}

export function speciesRewardedBy(milestones: readonly KeeperMilestone[]): SpeciesId[] {
  const ids: SpeciesId[] = [];
  for (const milestone of milestones) {
    if (!milestone.unlocked) {
      continue;
    }
    for (const reward of milestone.rewards) {
      if (reward.kind === 'species' && !ids.includes(reward.speciesId)) {
        ids.push(reward.speciesId);
      }
    }
  }
  return ids;
}

export function earnedSpeciesIds(hatches: readonly HatchCredit[]): SpeciesId[] {
  return speciesRewardedBy(keeperMilestones(hatches));
}

/** Extra cradle granted by play. The Sanctuary Pass still supplies the third. */
export function earnedExtraCradles(hatchCount: number): number {
  return Number.isFinite(hatchCount) && hatchCount >= FIRST_HATCH_GOAL ? 1 : 0;
}

export function milestoneForSpecies(
  milestones: readonly KeeperMilestone[],
  speciesId: string
): KeeperMilestone | null {
  return (
    milestones.find((milestone) =>
      milestone.rewards.some((reward) => reward.kind === 'species' && reward.speciesId === speciesId)
    ) ?? null
  );
}

export function newlyUnlockedMilestones(
  before: readonly KeeperMilestone[],
  after: readonly KeeperMilestone[]
): KeeperMilestone[] {
  const open = new Set(before.filter((milestone) => milestone.unlocked).map((milestone) => milestone.id));
  return after.filter((milestone) => milestone.unlocked && !open.has(milestone.id));
}

export function isReserveSpecies(speciesId: string): boolean {
  return (RESERVE_SPECIES_IDS as readonly string[]).includes(speciesId);
}
