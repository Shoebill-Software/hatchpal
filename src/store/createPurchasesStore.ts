import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import { persist, type StateStorage } from 'zustand/middleware';

import {
  canExportJournal,
  catalogPackages,
  FREE_STARTER_IDS,
  isSpeciesAvailable as speciesIsAvailable,
  maxCradlesFor,
  resolveEntitlements,
  type CustomerSnapshot,
  type PurchasesPackage,
} from '@/domain/entitlements';
import { isSpeciesId } from '@/domain/petIntegrity';
import { SPECIES_IDS, type SpeciesId } from '@/domain/types';
import { createMemoryStateStorage, createSafeJsonStorage } from '@/store/createPetStore';

export const PURCHASES_STORE_PERSIST_KEY = 'hatchpal.purchases';
export const PURCHASES_STORE_PERSIST_VERSION = 1;

export type PurchaseClient = {
  initialize: () => Promise<void>;
  fetchOfferings: () => Promise<PurchasesPackage[]>;
  purchaseProduct: (productId: string) => Promise<CustomerSnapshot>;
  restorePurchases: () => Promise<CustomerSnapshot>;
};

export type PurchasesPersistedState = {
  isProUnlocked: boolean;
  unlockedSpeciesIds: SpeciesId[];
  availablePackages: PurchasesPackage[];
  journalExportsUsed: number;
};

export type PurchasesStore = PurchasesPersistedState & {
  hasHydrated: boolean;
  isLoadingPurchases: boolean;
  isSpeciesAvailable: (speciesId: string) => boolean;
  getMaxCradleCount: () => number;
  canExportFieldJournal: () => boolean;
  initialize: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<CustomerSnapshot>;
  recordJournalExport: () => boolean;
};

const EMPTY_PERSISTED: PurchasesPersistedState = {
  isProUnlocked: false,
  unlockedSpeciesIds: [...FREE_STARTER_IDS],
  availablePackages: catalogPackages(),
  journalExportsUsed: 0,
};

function isPackage(value: unknown): value is PurchasesPackage {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.identifier === 'string' &&
    typeof record.productId === 'string' &&
    typeof record.priceString === 'string' &&
    typeof record.price === 'number' &&
    Number.isFinite(record.price) &&
    typeof record.currencyCode === 'string' &&
    typeof record.title === 'string'
  );
}

export function sanitizePurchasesState(value: unknown): PurchasesPersistedState {
  const raw =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const nested =
    raw.state != null && typeof raw.state === 'object' ? (raw.state as Record<string, unknown>) : raw;

  const isProUnlocked = nested.isProUnlocked === true;
  const listed = Array.isArray(nested.unlockedSpeciesIds)
    ? nested.unlockedSpeciesIds.filter((id): id is SpeciesId => isSpeciesId(id))
    : [];
  const unlocked = new Set<SpeciesId>(FREE_STARTER_IDS);
  for (const id of listed) {
    unlocked.add(id);
  }
  if (isProUnlocked) {
    for (const id of SPECIES_IDS) {
      unlocked.add(id);
    }
  }

  const packages = Array.isArray(nested.availablePackages)
    ? nested.availablePackages.filter(isPackage)
    : [];
  const used = nested.journalExportsUsed;
  const journalExportsUsed =
    typeof used === 'number' && Number.isFinite(used) && used > 0 ? Math.floor(used) : 0;

  return {
    isProUnlocked,
    unlockedSpeciesIds: SPECIES_IDS.filter((id) => unlocked.has(id)),
    availablePackages: packages.length > 0 ? packages : catalogPackages(),
    journalExportsUsed,
  };
}

async function liveClient(): Promise<PurchaseClient> {
  const service = await import('@/services/purchases');
  return {
    initialize: service.initializePurchases,
    fetchOfferings: service.fetchOfferings,
    purchaseProduct: service.purchaseProduct,
    restorePurchases: service.restorePurchases,
  };
}

export function createPurchasesStoreSlice(
  client: PurchaseClient | null = null
): StateCreator<PurchasesStore> {
  const resolveClient = async (): Promise<PurchaseClient> => client ?? liveClient();

  return (set, get) => ({
    ...EMPTY_PERSISTED,
    hasHydrated: false,
    isLoadingPurchases: false,
    isSpeciesAvailable: (speciesId) => speciesIsAvailable(speciesId, get()),
    getMaxCradleCount: () => maxCradlesFor(get().isProUnlocked),
    canExportFieldJournal: () => canExportJournal(get().isProUnlocked, get().journalExportsUsed),
    initialize: async () => {
      set({ isLoadingPurchases: true });
      try {
        const purchases = await resolveClient();
        await purchases.initialize();
        const availablePackages = await purchases.fetchOfferings();
        set({ availablePackages, isLoadingPurchases: false });
      } catch {
        set({ isLoadingPurchases: false, availablePackages: get().availablePackages });
      }
    },
    refreshOfferings: async () => {
      try {
        const purchases = await resolveClient();
        const availablePackages = await purchases.fetchOfferings();
        set({ availablePackages });
      } catch {
        // Keep the last localized prices when the store is unreachable.
      }
    },
    purchaseProduct: async (productId) => {
      set({ isLoadingPurchases: true });
      try {
        const purchases = await resolveClient();
        const snapshot = await purchases.purchaseProduct(productId);
        const resolved = resolveEntitlements(snapshot);
        set({
          isProUnlocked: resolved.isProUnlocked,
          unlockedSpeciesIds: resolved.unlockedSpeciesIds,
          isLoadingPurchases: false,
        });
      } catch (error) {
        set({ isLoadingPurchases: false });
        throw error;
      }
    },
    restorePurchases: async () => {
      set({ isLoadingPurchases: true });
      try {
        const purchases = await resolveClient();
        const snapshot = await purchases.restorePurchases();
        const resolved = resolveEntitlements(snapshot);
        set({
          isProUnlocked: resolved.isProUnlocked,
          unlockedSpeciesIds: resolved.unlockedSpeciesIds,
          isLoadingPurchases: false,
        });
        return snapshot;
      } catch (error) {
        set({ isLoadingPurchases: false });
        throw error;
      }
    },
    recordJournalExport: () => {
      if (get().isProUnlocked) {
        return true;
      }
      if (!canExportJournal(false, get().journalExportsUsed)) {
        return false;
      }
      set({ journalExportsUsed: get().journalExportsUsed + 1 });
      return true;
    },
  });
}

export function mergePurchasesState(
  persistedState: unknown,
  currentState: PurchasesStore
): PurchasesStore {
  const sanitized = sanitizePurchasesState(persistedState);
  return {
    ...currentState,
    ...sanitized,
    hasHydrated: true,
    isLoadingPurchases: false,
  };
}

export function createPurchasesStoreApi(
  options: {
    storage?: StateStorage;
    client?: PurchaseClient | null;
  } = {}
): StoreApi<PurchasesStore> {
  const storage = options.storage ?? createMemoryStateStorage();
  const store = createStore<PurchasesStore>()(
    persist(createPurchasesStoreSlice(options.client ?? null), {
      name: PURCHASES_STORE_PERSIST_KEY,
      version: PURCHASES_STORE_PERSIST_VERSION,
      storage: createSafeJsonStorage(() => storage),
      partialize: (state): PurchasesPersistedState => ({
        isProUnlocked: state.isProUnlocked,
        unlockedSpeciesIds: state.unlockedSpeciesIds,
        availablePackages: state.availablePackages,
        journalExportsUsed: state.journalExportsUsed,
      }),
      merge: (persistedState, currentState) => mergePurchasesState(persistedState, currentState),
      migrate: (persistedState) => sanitizePurchasesState(persistedState),
    })
  );

  const markHydrated = (): void => {
    if (!store.getState().hasHydrated) {
      store.setState({ hasHydrated: true });
    }
  };

  store.persist.onFinishHydration(markHydrated);
  if (store.persist.hasHydrated()) {
    markHydrated();
  }

  return store;
}
