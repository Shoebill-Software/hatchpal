import { persist } from 'zustand/middleware';
import { create } from 'zustand';
import { mmkvStateStorage } from './storage';
import {
  PET_STORE_PERSIST_KEY,
  PET_STORE_PERSIST_VERSION,
  createPetStoreSlice,
  createSafeJsonStorage,
  mergePetPersistedState,
  sanitizePersistedState,
  selectCradlePets,
  type PetPersistedState,
  type PetStore,
} from './createPetStore';
import { PetInstance } from '@/domain/types';
import { syncNotificationsForStoredPets } from '@/services/notificationLifecycle';
import { publishWidgetSnapshot, widgetSyncReason } from '@/services/widgetBridge';

export type { PetStore, PetPersistedState, ClockRefreshMode } from './createPetStore';
export { createPetStoreApi, createMemoryStateStorage } from './createPetStore';

export const usePetStore = create<PetStore>()(
  persist(createPetStoreSlice(), {
    name: PET_STORE_PERSIST_KEY,
    version: PET_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<PetPersistedState>(() => mmkvStateStorage),
    partialize: (state): PetPersistedState => ({
      pets: state.pets,
      cradleOrder: state.cradleOrder,
      activePetIndex: state.activePetIndex,
      activePetId: state.activePetId,
    }),
    merge: (persistedState, currentState) =>
      mergePetPersistedState(persistedState, currentState),
    migrate: (persistedState) => sanitizePersistedState(persistedState),
  })
);

let storedNotificationsSynced = false;

export function getActivePetFromStore(): PetInstance | null {
  const state = usePetStore.getState();
  if (state.activePet) {
    return state.activePet;
  }
  if (!state.activePetId) {
    return null;
  }
  return state.pets[state.activePetId] ?? null;
}

function markStoreHydrated(): void {
  if (!usePetStore.getState().hasHydrated) {
    usePetStore.setState({ hasHydrated: true });
  }
  if (storedNotificationsSynced) {
    return;
  }
  storedNotificationsSynced = true;
  syncNotificationsForStoredPets(selectCradlePets(usePetStore.getState()));
}

usePetStore.persist.onFinishHydration(markStoreHydrated);
if (usePetStore.persist.hasHydrated()) {
  markStoreHydrated();
}

usePetStore.subscribe((state, previous) => {
  if (!widgetSyncReason(previous, state)) {
    return;
  }
  publishWidgetSnapshot(state, Date.now(), { reload: true });
});

if (usePetStore.getState().hasHydrated) {
  publishWidgetSnapshot(usePetStore.getState(), Date.now(), { reload: true });
}
