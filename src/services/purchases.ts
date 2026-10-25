import { NativeModules, Platform } from 'react-native';

import {
  CATALOG_PRODUCT_IDS,
  catalogPackages,
  fallbackPriceForProduct,
  productIdForSpecies,
  SANCTUARY_PASS_PRODUCT_ID,
  snapshotFromProductIds,
  type CustomerSnapshot,
  type PurchasesPackage,
} from '@/domain/entitlements';
import { isSpeciesId } from '@/domain/petIntegrity';
import { PurchaseCancelledError, PurchaseFailedError } from '@/services/purchaseErrors';

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? '';

let provider: 'native' | 'mock' = 'mock';
let configured = false;
let mockSeeded = false;
const mockOwned = new Set<string>();

function apiKeyForPlatform(): string | null {
  if (Platform.OS === 'ios' && APPLE_KEY.length > 0) {
    return APPLE_KEY;
  }
  if (Platform.OS === 'android' && GOOGLE_KEY.length > 0) {
    return GOOGLE_KEY;
  }
  return null;
}

function nativePurchasesPresent(): boolean {
  if (process.env.JEST_WORKER_ID !== undefined) {
    return false;
  }
  try {
    return NativeModules?.RNPurchases != null;
  } catch {
    return false;
  }
}

type RevenueCatModule = typeof import('react-native-purchases');

async function loadSdk(): Promise<RevenueCatModule> {
  return import('react-native-purchases');
}

async function ensureMockLedger(): Promise<void> {
  if (mockSeeded) {
    return;
  }
  mockSeeded = true;
  try {
    const store = await import('@/store/usePurchasesStore');
    const state = store.usePurchasesStore.getState();
    if (state.isProUnlocked) {
      mockOwned.add(SANCTUARY_PASS_PRODUCT_ID);
    }
    for (const speciesId of state.unlockedSpeciesIds) {
      if (!isSpeciesId(speciesId)) {
        continue;
      }
      const productId = productIdForSpecies(speciesId);
      if (productId) {
        mockOwned.add(productId);
      }
    }
  } catch {
    mockSeeded = false;
  }
}

export function purchasesProviderMode(): 'native' | 'mock' {
  return provider;
}

/**
 * Configures RevenueCat when a public SDK key and the native StoreKit / Play Billing
 * module are both present. Expo Go and Jest stay on the mock catalog.
 */
export async function initializePurchases(): Promise<void> {
  await ensureMockLedger();
  const apiKey = apiKeyForPlatform();
  if (!apiKey || !nativePurchasesPresent()) {
    provider = 'mock';
    configured = true;
    return;
  }

  try {
    const { default: Purchases } = await loadSdk();
    if (!configured) {
      Purchases.configure({ apiKey });
      configured = true;
    }
    provider = 'native';
  } catch {
    provider = 'mock';
    configured = true;
  }
}

function packagesFromProducts(
  products: readonly {
    identifier: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  }[]
): PurchasesPackage[] {
  const byId = new Map(products.map((product) => [product.identifier, product]));
  return catalogPackages().map((fallback) => {
    const product = byId.get(fallback.productId);
    if (!product) {
      return fallback;
    }
    return {
      identifier: product.identifier,
      productId: product.identifier,
      priceString: product.priceString || fallbackPriceForProduct(product.identifier),
      price: product.price,
      currencyCode: product.currencyCode || 'USD',
      title: product.title || fallback.title,
    };
  });
}

/** Localized prices from the store, or the catalog fallback when the native SDK is absent. */
export async function fetchOfferings(): Promise<PurchasesPackage[]> {
  if (provider !== 'native') {
    return catalogPackages();
  }
  try {
    const { default: Purchases, PRODUCT_CATEGORY } = await loadSdk();
    const products = await Purchases.getProducts([...CATALOG_PRODUCT_IDS], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    if (products.length === 0) {
      return catalogPackages();
    }
    return packagesFromProducts(products);
  } catch {
    return catalogPackages();
  }
}

function mapCustomerInfo(info: {
  entitlements: { active: Record<string, { identifier: string; productIdentifier: string }> };
  allPurchasedProductIdentifiers: string[];
}): CustomerSnapshot {
  const activeEntitlementIds = Object.values(info.entitlements.active).map((entitlement) => entitlement.identifier);
  const productIds = new Set<string>(info.allPurchasedProductIdentifiers);
  for (const entitlement of Object.values(info.entitlements.active)) {
    if (entitlement.productIdentifier) {
      productIds.add(entitlement.productIdentifier);
    }
    activeEntitlementIds.push(entitlement.productIdentifier);
  }
  return {
    activeEntitlementIds,
    activeProductIds: [...productIds],
  };
}

function throwPurchaseError(error: unknown): never {
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; userCancelled?: boolean | null; message?: string };
    if (record.userCancelled === true || String(record.code) === '1') {
      throw new PurchaseCancelledError();
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      throw new PurchaseFailedError(record.message);
    }
  }
  throw new PurchaseFailedError();
}

/** Opens the native payment sheet, or records the unlock locally when StoreKit is unavailable. */
export async function purchaseProduct(productId: string): Promise<CustomerSnapshot> {
  if (!CATALOG_PRODUCT_IDS.includes(productId)) {
    throw new PurchaseFailedError('Unknown product');
  }
  if (provider !== 'native') {
    await ensureMockLedger();
    mockOwned.add(productId);
    return snapshotFromProductIds([...mockOwned]);
  }
  try {
    const { default: Purchases, PRODUCT_CATEGORY } = await loadSdk();
    const products = await Purchases.getProducts([productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    const product = products[0];
    if (!product) {
      throw new PurchaseFailedError('This species is not available from the store yet.');
    }
    const result = await Purchases.purchaseStoreProduct(product);
    return mapCustomerInfo(result.customerInfo);
  } catch (error) {
    throwPurchaseError(error);
  }
}

/** Restores App Store / Play purchases. The mock provider replays unlocks already cached on device. */
export async function restorePurchases(): Promise<CustomerSnapshot> {
  if (provider !== 'native') {
    await ensureMockLedger();
    return snapshotFromProductIds([...mockOwned]);
  }
  try {
    const { default: Purchases } = await loadSdk();
    const info = await Purchases.restorePurchases();
    return mapCustomerInfo(info);
  } catch (error) {
    throwPurchaseError(error);
  }
}
