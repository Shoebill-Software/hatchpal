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
  type PetPersistedState,
  type PetStore,
} from './createPetStore';
import { PetInstance } from '@/domain/types';
import { syncNotificationsForStoredPet } from '@/services/notificationLifecycle';

export type { PetStore, PetPersistedState, ClockRefreshMode } from './createPetStore';
export { createPetStoreApi, createMemoryStateStorage } from './createPetStore';

export const usePetStore = create<PetStore>()(
  persist(createPetStoreSlice(), {
    name: PET_STORE_PERSIST_KEY,
    version: PET_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<PetPersistedState>(() => mmkvStateStorage),
    partialize: (state): PetPersistedState => ({
      pets: state.pets,
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
  syncNotificationsForStoredPet(getActivePetFromStore());
}

usePetStore.persist.onFinishHydration(markStoreHydrated);
if (usePetStore.persist.hasHydrated()) {
  markStoreHydrated();
}
