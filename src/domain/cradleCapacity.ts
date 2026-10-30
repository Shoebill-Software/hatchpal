import { earnedExtraCradles, type HatchCredit } from './keeperRewards';

/** A brand-new keeper has one nest. A hatch opens the second. The pass opens the third. */
export const FREE_CRADLE_LIMIT = 1;
export const SANCTUARY_CRADLE_LIMIT = 3;

let readIsPro: () => boolean = () => false;
let readHatches: () => readonly HatchCredit[] = () => [];

/** The purchases store registers this so incubation limits follow the cached entitlement. */
export function registerProReader(reader: () => boolean): void {
  readIsPro = reader;
}

/** The collection store registers this so a successful hatch can open the second nest. */
export function registerHatchReader(reader: () => readonly HatchCredit[]): void {
  readHatches = reader;
}

export function readHatchCredits(): readonly HatchCredit[] {
  return readHatches();
}

export function cradleAllowance(isProUnlocked: boolean, hatchCount: number): number {
  if (isProUnlocked) {
    return SANCTUARY_CRADLE_LIMIT;
  }
  return Math.min(SANCTUARY_CRADLE_LIMIT, FREE_CRADLE_LIMIT + earnedExtraCradles(hatchCount));
}

export function readMaxCradleCount(): number {
  return cradleAllowance(readIsPro(), readHatches().length);
}
