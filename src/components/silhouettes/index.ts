import type { SpeciesId } from '@/domain/types';

import { SILHOUETTE_ART, type SilhouetteArt } from '@/components/silhouetteArt';

/**
 * One plate per species. Hatchlings are the adult outline drawn smaller;
 * the egg carousel shows only the adult.
 */
export function getSilhouettePlate(speciesId: SpeciesId): SilhouetteArt {
  return SILHOUETTE_ART[speciesId];
}
