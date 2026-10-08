import { create } from 'zustand';
import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import { persist, type StateStorage } from 'zustand/middleware';

import { NEST_TUTORIAL_STEP_COUNT } from '@/constants/tutorial';
import { createMemoryStateStorage, createSafeJsonStorage } from '@/store/createPetStore';
import { preferencesMmkvStateStorage } from '@/store/storage';

export const PREFERENCES_STORE_PERSIST_KEY = 'hatchpal.preferences';
export const PREFERENCES_STORE_PERSIST_VERSION = 4;

export type AppearancePreference = 'system' | 'light' | 'dark';

export type PreferencesState = {
  appearance: AppearancePreference;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  /** Persisted. False until the nest coach mark is finished or skipped. */
  hasCompletedNestTutorial: boolean;
};

/** Session-only. A relaunch with an unfinished tour starts again at the egg. */
export type TutorialSessionState = {
  isTutorialActive: boolean;
  currentTutorialStep: number;
};

export type PreferencesStore = PreferencesState &
  TutorialSessionState & {
    setAppearance: (appearance: AppearancePreference) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setHapticsEnabled: (enabled: boolean) => void;
    setNotificationsEnabled: (enabled: boolean) => Promise<void>;
    startNestTutorial: () => void;
    nextTutorialStep: () => void;
    previousTutorialStep: () => void;
    skipTutorial: () => void;
    completeTutorial: () => void;
    resetTutorial: () => void;
    /** Hides the tour without recording completion, so a later egg can still open it. */
    suspendNestTutorial: () => void;
  };

export const DEFAULT_PREFERENCES: PreferencesState = {
  appearance: 'system',
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
  hasCompletedNestTutorial: false,
};

const DEFAULT_TUTORIAL_SESSION: TutorialSessionState = {
  isTutorialActive: false,
  currentTutorialStep: 0,
};

type AppearanceApplier = (appearance: AppearancePreference) => void;

let appearanceApplier: AppearanceApplier = () => undefined;

/** Called once from the color-scheme module so the store stays free of React Native. */
export function registerAppearanceApplier(applier: AppearanceApplier): void {
  appearanceApplier = applier;
  applier(usePreferencesStore.getState().appearance);
}

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Drops unknown or corrupt fields, including a retired language override. */
export function sanitizePreferences(value: unknown): PreferencesState {
  const record =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    appearance: isAppearancePreference(record.appearance) ? record.appearance : 'system',
    soundEnabled: typeof record.soundEnabled === 'boolean' ? record.soundEnabled : true,
    hapticsEnabled: typeof record.hapticsEnabled === 'boolean' ? record.hapticsEnabled : true,
    notificationsEnabled:
      typeof record.notificationsEnabled === 'boolean' ? record.notificationsEnabled : true,
    hasCompletedNestTutorial:
      typeof record.hasCompletedNestTutorial === 'boolean' ? record.hasCompletedNestTutorial : false,
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

function readStoredPreferences(storage: StateStorage): PreferencesState {
  try {
    const raw = storage.getItem(PREFERENCES_STORE_PERSIST_KEY);
    if (typeof raw !== 'string') {
      return DEFAULT_PREFERENCES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object' || !('state' in parsed)) {
      return DEFAULT_PREFERENCES;
    }
    return sanitizePreferences((parsed as { state: unknown }).state);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function finishNestTutorial(): Pick<PreferencesStore, 'isTutorialActive' | 'hasCompletedNestTutorial'> {
  return { isTutorialActive: false, hasCompletedNestTutorial: true };
}

function createPreferencesSlice(initial: PreferencesState = DEFAULT_PREFERENCES): StateCreator<PreferencesStore> {
  return (set) => ({
    ...initial,
    ...DEFAULT_TUTORIAL_SESSION,
    setAppearance: (appearance) => {
      set({ appearance });
      appearanceApplier(appearance);
    },
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
    startNestTutorial: () => {
      set({ isTutorialActive: true, currentTutorialStep: 0 });
    },
    nextTutorialStep: () => {
      set((state) => {
        if (!state.isTutorialActive) {
          return state;
        }
        if (state.currentTutorialStep >= NEST_TUTORIAL_STEP_COUNT - 1) {
          return {
            ...finishNestTutorial(),
            currentTutorialStep: NEST_TUTORIAL_STEP_COUNT - 1,
          };
        }
        return { currentTutorialStep: state.currentTutorialStep + 1 };
      });
    },
    previousTutorialStep: () => {
      set((state) => {
        if (!state.isTutorialActive || state.currentTutorialStep <= 0) {
          return state;
        }
        return { currentTutorialStep: state.currentTutorialStep - 1 };
      });
    },
    skipTutorial: () => {
      set(finishNestTutorial());
    },
    completeTutorial: () => {
      set(finishNestTutorial());
    },
    resetTutorial: () => {
      set({ hasCompletedNestTutorial: false });
    },
    suspendNestTutorial: () => {
      set({ isTutorialActive: false, currentTutorialStep: 0 });
    },
  });
}

function persistPreferences(storage: StateStorage, initial: PreferencesState = DEFAULT_PREFERENCES) {
  return persist(createPreferencesSlice(initial), {
    name: PREFERENCES_STORE_PERSIST_KEY,
    version: PREFERENCES_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<PreferencesState>(() => storage),
    partialize: (state): PreferencesState => ({
      appearance: state.appearance,
      soundEnabled: state.soundEnabled,
      hapticsEnabled: state.hapticsEnabled,
      notificationsEnabled: state.notificationsEnabled,
      hasCompletedNestTutorial: state.hasCompletedNestTutorial,
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
  persistPreferences(preferencesMmkvStateStorage, readStoredPreferences(preferencesMmkvStateStorage))
);
