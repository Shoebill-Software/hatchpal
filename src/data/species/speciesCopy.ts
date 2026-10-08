import { speciesEn } from './catalogCopy';

/** English display string for an expanded-roster species field. */
export function speciesCopy(key: keyof typeof speciesEn): string {
  return speciesEn[key];
}
