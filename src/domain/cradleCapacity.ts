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

/** Switch an occupied cradle, open the hatchery, or ask for the pass. */
export type CradleSlotChoice = 'switch' | 'adopt' | 'paywall' | 'none';

/** The add control beside the cradle marks. Hidden once every nest is filled. */
export type CradleOffer = 'open' | 'earn' | 'pass' | 'hidden';

/**
 * How the hatchery should treat this visit.
 * Adding only applies while another egg is already home. An empty nest always begins.
 * Any other visit with an egg in the nest replaces that egg, so the label matches `adoptPet`.
 */
export type AdoptionIntent = 'begin' | 'replace' | 'add';

export interface CradleGate {
  occupied: number;
  allowance: number;
  isPro: boolean;
}

function whole(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function openSlots(gate: CradleGate, limit: number): number {
  return gate.isPro ? limit : Math.min(limit, whole(gate.allowance));
}

/**
 * A swipe moves only between eggs that are already incubating.
 * The add control and the paywall stay on the cradle mark, so a flick cannot buy or abandon.
 */
export function adjacentCradle(activeIndex: number, direction: -1 | 1, occupied: number): number | null {
  if (!Number.isInteger(activeIndex) || (direction !== -1 && direction !== 1)) {
    return null;
  }
  const next = activeIndex + direction;
  const count = whole(occupied);
  if (next < 0 || next >= count) {
    return null;
  }
  return next;
}

export function chooseCradleSlot(index: number, gate: CradleGate, limit = SANCTUARY_CRADLE_LIMIT): CradleSlotChoice {
  const occupied = whole(gate.occupied);
  const cap = whole(limit);
  if (!Number.isInteger(index) || index < 0 || index >= cap) {
    return 'none';
  }
  if (index < occupied) {
    return 'switch';
  }
  if (occupied >= cap) {
    return 'none';
  }
  if (occupied < openSlots(gate, cap)) {
    return 'adopt';
  }
  return 'paywall';
}

export function cradleOffer(gate: CradleGate, limit = SANCTUARY_CRADLE_LIMIT): CradleOffer {
  const occupied = whole(gate.occupied);
  const cap = whole(limit);
  if (occupied >= cap) {
    return 'hidden';
  }
  if (occupied < openSlots(gate, cap)) {
    return 'open';
  }
  if (whole(gate.allowance) <= FREE_CRADLE_LIMIT) {
    return 'earn';
  }
  return 'pass';
}

export function adoptionIntent(input: { adding: boolean; hasPet: boolean }): AdoptionIntent {
  if (input.adding && input.hasPet) {
    return 'add';
  }
  if (input.hasPet) {
    return 'replace';
  }
  return 'begin';
}
