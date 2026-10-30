import { useMemo } from 'react';

import { getSpeciesConfig } from '@/data/species';
import { isSpeciesAvailable } from '@/domain/entitlements';
import {
  keeperMilestones,
  milestoneForSpecies,
  speciesRewardedBy,
  toHatchCredits,
  type KeeperMilestone,
  type KeeperReward,
} from '@/domain/keeperRewards';
import { useCollectionStore } from '@/store/useCollectionStore';
import { usePurchasesStore } from '@/store/usePurchasesStore';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';

export const KEEPER_TITLE_KEY: Record<KeeperMilestone['id'], TranslationKey> = {
  first_hatch: 'keeper.first_hatch.title',
  three_hatches: 'keeper.three_hatches.title',
  two_birds: 'keeper.two_birds.title',
  two_reptiles: 'keeper.two_reptiles.title',
};

export const KEEPER_DETAIL_KEY: Record<KeeperMilestone['id'], TranslationKey> = {
  first_hatch: 'keeper.first_hatch.detail',
  three_hatches: 'keeper.three_hatches.detail',
  two_birds: 'keeper.two_birds.detail',
  two_reptiles: 'keeper.two_reptiles.detail',
};

export const KEEPER_PROGRESS_KEY: Record<KeeperMilestone['id'], TranslationKey> = {
  first_hatch: 'keeper.first_hatch.progress',
  three_hatches: 'keeper.three_hatches.progress',
  two_birds: 'keeper.two_birds.progress',
  two_reptiles: 'keeper.two_reptiles.progress',
};

export function keeperRewardLabel(reward: KeeperReward, t: TranslateFn, tone: 'chip' | 'sentence' = 'chip'): string {
  if (reward.kind === 'cradle') {
    return t(tone === 'sentence' ? 'keeper.reward.secondNest' : 'keeper.reward.secondNestChip');
  }
  return getSpeciesConfig(reward.speciesId).commonName;
}

export function useKeeperAccess() {
  const isProUnlocked = usePurchasesStore((state) => state.isProUnlocked);
  const unlockedSpeciesIds = usePurchasesStore((state) => state.unlockedSpeciesIds);
  const archive = useCollectionStore((state) => state.hatchedArchive);
  const milestones = useMemo(
    () =>
      keeperMilestones(
        toHatchCredits(archive, (speciesId) => getSpeciesConfig(speciesId).taxon)
      ),
    [archive]
  );
  const earnedSpeciesIds = useMemo(() => speciesRewardedBy(milestones), [milestones]);
  const isAvailable = (speciesId: string): boolean =>
    isSpeciesAvailable(speciesId, {
      isProUnlocked,
      unlockedSpeciesIds,
      earnedSpeciesIds,
    });

  return {
    isProUnlocked,
    milestones,
    isAvailable,
    gateFor: (speciesId: string) => milestoneForSpecies(milestones, speciesId),
  };
}
