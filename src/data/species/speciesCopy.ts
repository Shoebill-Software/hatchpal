import { localized, type LocalizedCopy } from '@/domain/types';

import { speciesDe, speciesEn } from './catalogCopy';

export function speciesCopy(key: keyof typeof speciesEn & keyof typeof speciesDe): LocalizedCopy {
  return localized(speciesEn[key], speciesDe[key]);
}
