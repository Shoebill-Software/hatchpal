import { isSpeciesId } from '@/domain/petIntegrity';
import { SPECIES_IDS, type SpeciesId } from '@/domain/types';

import { FREE_CRADLE_LIMIT, SANCTUARY_CRADLE_LIMIT } from './cradleCapacity';

export const ENTITLEMENT_SANCTUARY_PRO = 'sanctuary_pro';
export const SANCTUARY_PASS_PRODUCT_ID = 'sanctuary_pass_lifetime';
export const SANCTUARY_PASS_FALLBACK_PRICE = '$8.99';
export const FREE_JOURNAL_EXPORTS = 1;

export const FREE_STARTER_IDS = [
  'silkie_chicken',
  'leopard_gecko',
  'american_robin',
  'emu',
  'ball_python',
  'green_sea_turtle',
] as const satisfies readonly SpeciesId[];

export interface SpeciesProduct {
  speciesId: SpeciesId;
  productId: string;
  fallbackPrice: string;
  fallbackAmount: number;
}

/** One-time species unlocks. StoreKit and Play Billing localize the displayed price. */
export const A_LA_CARTE_PRODUCTS: readonly SpeciesProduct[] = [
  {
    speciesId: 'emperor_penguin',
    productId: 'species_emperor_penguin',
    fallbackPrice: '$2.99',
    fallbackAmount: 2.99,
  },
  {
    speciesId: 'platypus',
    productId: 'species_platypus',
    fallbackPrice: '$2.99',
    fallbackAmount: 2.99,
  },
  {
    speciesId: 'saltwater_crocodile',
    productId: 'species_crocodile',
    fallbackPrice: '$2.99',
    fallbackAmount: 2.99,
  },
  {
    speciesId: 'veiled_chameleon',
    productId: 'species_veiled_chameleon',
    fallbackPrice: '$1.99',
    fallbackAmount: 1.99,
  },
  {
    speciesId: 'peregrine_falcon',
    productId: 'species_peregrine_falcon',
    fallbackPrice: '$1.99',
    fallbackAmount: 1.99,
  },
  {
    speciesId: 'barn_owl',
    productId: 'species_barn_owl',
    fallbackPrice: '$1.99',
    fallbackAmount: 1.99,
  },
  {
    speciesId: 'common_ostrich',
    productId: 'species_common_ostrich',
    fallbackPrice: '$2.99',
    fallbackAmount: 2.99,
  },
  {
    speciesId: 'mandarin_duck',
    productId: 'species_mandarin_duck',
    fallbackPrice: '$1.99',
    fallbackAmount: 1.99,
  },
];

export const CATALOG_PRODUCT_IDS: readonly string[] = [
  ...A_LA_CARTE_PRODUCTS.map((item) => item.productId),
  SANCTUARY_PASS_PRODUCT_ID,
];

/**
 * Plain package cached from StoreKit or Play Billing.
 * RevenueCat's class instances are not persisted; this is the serializable slice the UI needs.
 */
export interface PurchasesPackage {
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
  currencyCode: string;
  title: string;
}

export interface CustomerSnapshot {
  activeEntitlementIds: readonly string[];
  activeProductIds: readonly string[];
}

export interface EntitlementResolution {
  isProUnlocked: boolean;
  unlockedSpeciesIds: SpeciesId[];
}

const PRODUCT_TO_SPECIES = new Map<string, SpeciesId>(
  A_LA_CARTE_PRODUCTS.map((item) => [item.productId, item.speciesId])
);

const FREE_STARTER_SET = new Set<string>(FREE_STARTER_IDS);

export function isFreeStarter(speciesId: string): boolean {
  return FREE_STARTER_SET.has(speciesId);
}

export function productIdForSpecies(speciesId: string): string | null {
  const match = A_LA_CARTE_PRODUCTS.find((item) => item.speciesId === speciesId);
  return match?.productId ?? null;
}

export function fallbackPriceForProduct(productId: string): string {
  if (productId === SANCTUARY_PASS_PRODUCT_ID) {
    return SANCTUARY_PASS_FALLBACK_PRICE;
  }
  return A_LA_CARTE_PRODUCTS.find((item) => item.productId === productId)?.fallbackPrice ?? '';
}

export function catalogPackages(): PurchasesPackage[] {
  const speciesPackages = A_LA_CARTE_PRODUCTS.map((item) => ({
    identifier: item.productId,
    productId: item.productId,
    priceString: item.fallbackPrice,
    price: item.fallbackAmount,
    currencyCode: 'USD',
    title: item.productId,
  }));
  return [
    ...speciesPackages,
    {
      identifier: SANCTUARY_PASS_PRODUCT_ID,
      productId: SANCTUARY_PASS_PRODUCT_ID,
      priceString: SANCTUARY_PASS_FALLBACK_PRICE,
      price: 8.99,
      currencyCode: 'USD',
      title: 'Sanctuary Pass',
    },
  ];
}

export function priceStringFor(packages: readonly PurchasesPackage[], productId: string): string {
  return packages.find((item) => item.productId === productId)?.priceString ?? fallbackPriceForProduct(productId);
}

export function resolveEntitlements(snapshot: CustomerSnapshot): EntitlementResolution {
  const entitlements = new Set(snapshot.activeEntitlementIds);
  const products = new Set(snapshot.activeProductIds);
  const isProUnlocked =
    entitlements.has(ENTITLEMENT_SANCTUARY_PRO) || products.has(SANCTUARY_PASS_PRODUCT_ID);

  const unlocked = new Set<SpeciesId>(FREE_STARTER_IDS);
  if (isProUnlocked) {
    for (const id of SPECIES_IDS) {
      unlocked.add(id);
    }
  } else {
    for (const productId of products) {
      const speciesId = PRODUCT_TO_SPECIES.get(productId);
      if (speciesId) {
        unlocked.add(speciesId);
      }
    }
    for (const entitlementId of entitlements) {
      const speciesId = PRODUCT_TO_SPECIES.get(entitlementId);
      if (speciesId) {
        unlocked.add(speciesId);
      }
    }
  }

  return {
    isProUnlocked,
    unlockedSpeciesIds: SPECIES_IDS.filter((id) => unlocked.has(id)),
  };
}

export function isSpeciesAvailable(
  speciesId: string,
  state: { isProUnlocked: boolean; unlockedSpeciesIds: readonly string[] }
): boolean {
  if (!isSpeciesId(speciesId)) {
    return false;
  }
  if (state.isProUnlocked) {
    return true;
  }
  return state.unlockedSpeciesIds.includes(speciesId);
}

export function maxCradlesFor(isProUnlocked: boolean): number {
  return isProUnlocked ? SANCTUARY_CRADLE_LIMIT : FREE_CRADLE_LIMIT;
}

export function canExportJournal(isProUnlocked: boolean, exportsUsed: number): boolean {
  if (isProUnlocked) {
    return true;
  }
  return exportsUsed < FREE_JOURNAL_EXPORTS;
}

export function snapshotFromProductIds(productIds: readonly string[]): CustomerSnapshot {
  const activeProductIds = [...productIds];
  const activeEntitlementIds = activeProductIds.includes(SANCTUARY_PASS_PRODUCT_ID)
    ? [ENTITLEMENT_SANCTUARY_PRO, ...activeProductIds]
    : [...activeProductIds];
  return { activeEntitlementIds, activeProductIds };
}
