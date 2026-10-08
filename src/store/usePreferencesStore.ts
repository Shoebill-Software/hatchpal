import { create } from 'zustand';
import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import { persist, type StateStorage } from 'zustand/middleware';

import { createMemoryStateStorage, createSafeJsonStorage } from '@/store/createPetStore';
import { preferencesMmkvStateStorage } from '@/store/storage';

export const PREFERENCES_STORE_PERSIST_KEY = 'hatchpal.preferences';
export const PREFERENCES_STORE_PERSIST_VERSION = 2;

export type PreferencesState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
};

export type PreferencesStore = PreferencesState & {
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

export const DEFAULT_PREFERENCES: PreferencesState = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
};

/** Drops unknown or corrupt fields, including a retired language override. */
export function sanitizePreferences(value: unknown): PreferencesState {
  const record =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    soundEnabled: typeof record.soundEnabled === 'boolean' ? record.soundEnabled : true,
    hapticsEnabled: typeof record.hapticsEnabled === 'boolean' ? record.hapticsEnabled : true,
    notificationsEnabled:
      typeof record.notificationsEnabled === 'boolean' ? record.notificationsEnabled : true,
  };
}

export function mergePreferencesState(
  persistedState: unknown,
  currentState: PreferencesStore
): PreferencesStore {
  if (persistedState == null) {
    return currentState;
  }
  return {
    ...currentState,
    ...sanitizePreferences(persistedState),
  };
}

function refreshAlerts(): Promise<void> {
  if (process.env.JEST_WORKER_ID !== undefined) {
    return Promise.resolve();
  }
  return import('@/services/notificationLifecycle').then(async (lifecycle) => {
    const pets = await import('@/store/usePetStore');
    await lifecycle.syncNotificationsForStoredPet(pets.getActivePetFromStore());
  });
}

function createPreferencesSlice(): StateCreator<PreferencesStore> {
  return (set) => ({
    ...DEFAULT_PREFERENCES,
    setSoundEnabled: (soundEnabled) => {
      set({ soundEnabled });
    },
    setHapticsEnabled: (hapticsEnabled) => {
      set({ hapticsEnabled });
    },
    setNotificationsEnabled: (notificationsEnabled) => {
      set({ notificationsEnabled });
      return refreshAlerts();
    },
  });
}

function persistPreferences(storage: StateStorage) {
  return persist(createPreferencesSlice(), {
    name: PREFERENCES_STORE_PERSIST_KEY,
    version: PREFERENCES_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<PreferencesState>(() => storage),
    partialize: (state): PreferencesState => ({
      soundEnabled: state.soundEnabled,
      hapticsEnabled: state.hapticsEnabled,
      notificationsEnabled: state.notificationsEnabled,
    }),
    merge: (persistedState, currentState) => mergePreferencesState(persistedState, currentState),
    migrate: (persistedState) => sanitizePreferences(persistedState),
  });
}

export function createPreferencesStoreApi(
  options: { storage?: StateStorage } = {}
): StoreApi<PreferencesStore> {
  const storage = options.storage ?? createMemoryStateStorage();
  return createStore<PreferencesStore>()(persistPreferences(storage));
}

export const usePreferencesStore = create<PreferencesStore>()(
  persistPreferences(preferencesMmkvStateStorage)
);
