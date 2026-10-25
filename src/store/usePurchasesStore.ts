import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerProReader } from '@/domain/cradleCapacity';
import { createSafeJsonStorage } from '@/store/createPetStore';
import {
  createPurchasesStoreSlice,
  mergePurchasesState,
  PURCHASES_STORE_PERSIST_KEY,
  PURCHASES_STORE_PERSIST_VERSION,
  sanitizePurchasesState,
  type PurchasesPersistedState,
  type PurchasesStore,
} from '@/store/createPurchasesStore';
import { purchasesMmkvStateStorage } from '@/store/storage';

export type { PurchasesStore, PurchasesPersistedState, PurchaseClient } from '@/store/createPurchasesStore';
export { createPurchasesStoreApi } from '@/store/createPurchasesStore';

export const usePurchasesStore = create<PurchasesStore>()(
  persist(createPurchasesStoreSlice(), {
    name: PURCHASES_STORE_PERSIST_KEY,
    version: PURCHASES_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<PurchasesPersistedState>(() => purchasesMmkvStateStorage),
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

registerProReader(() => usePurchasesStore.getState().isProUnlocked);

let purchasesHydrationMarked = false;

function markPurchasesHydrated(): void {
  if (purchasesHydrationMarked) {
    return;
  }
  purchasesHydrationMarked = true;
  if (!usePurchasesStore.getState().hasHydrated) {
    usePurchasesStore.setState({ hasHydrated: true });
  }
}

usePurchasesStore.persist.onFinishHydration(markPurchasesHydrated);
if (usePurchasesStore.persist.hasHydrated()) {
  markPurchasesHydrated();
}
