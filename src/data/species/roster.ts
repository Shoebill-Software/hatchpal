import type { SpeciesConfig, TaxonomicClass } from '@/domain/types';

export type RosterFilter = 'all' | TaxonomicClass;

export const ROSTER_FILTERS: readonly RosterFilter[] = ['all', 'aves', 'reptilia', 'monotremata'];

export function speciesMatchingFilter(
  species: readonly SpeciesConfig[],
  filter: RosterFilter
): SpeciesConfig[] {
  if (filter === 'all') {
    return [...species];
  }
  return species.filter((item) => item.taxon === filter);
}
