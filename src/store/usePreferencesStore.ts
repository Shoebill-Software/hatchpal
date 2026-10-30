import { create } from 'zustand';
import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import { persist, type StateStorage } from 'zustand/middleware';

import { NEST_TUTORIAL_STEP_COUNT, type TutorialAction } from '@/constants/tutorial';
import { createMemoryStateStorage, createSafeJsonStorage } from '@/store/createPetStore';
import { preferencesMmkvStateStorage } from '@/store/storage';

export const PREFERENCES_STORE_PERSIST_KEY = 'hatchpal.preferences';
export const PREFERENCES_STORE_PERSIST_VERSION = 5;
/** Saves older than this predate Pip's tutorial, so it plays once for them too. */
const GUIDED_TUTORIAL_VERSION = 5;

export type AppearancePreference = 'system' | 'light' | 'dark';

export type PreferencesState = {
  appearance: AppearancePreference;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  /** Persisted. False until Pip's welcome is finished or skipped. */
  hasSeenWelcome: boolean;
  /** Persisted. False until the nest coach mark is finished or skipped. */
  hasCompletedNestTutorial: boolean;
  /** Persisted. False until Pip's hatchery tip is dismissed. */
  hasSeenAdoptionTip: boolean;
};

/** Something the player did that an interactive tutorial step may be waiting for. */
export type TutorialSignal = {
  action: TutorialAction;
  /** Outcome such as `perfect` or `toasty`. Absent for plain taps. */
  detail?: string;
  nonce: number;
};

/** Session-only. A relaunch with an unfinished tour starts again at the egg. */
export type TutorialSessionState = {
  isTutorialActive: boolean;
  currentTutorialStep: number;
  tutorialSignal: TutorialSignal | null;
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
    completeWelcome: () => void;
    /** Marks the welcome, nest tour, and hatchery tip as done. */
    skipAllTutorials: () => void;
    /** Clears every tutorial flag so Pip starts over from the welcome. */
    replayTutorial: () => void;
    markAdoptionTipSeen: () => void;
    signalTutorial: (action: TutorialAction, detail?: string) => void;
  };

export const DEFAULT_PREFERENCES: PreferencesState = {
  appearance: 'system',
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
  hasSeenWelcome: false,
  hasCompletedNestTutorial: false,
  hasSeenAdoptionTip: false,
};

const DEFAULT_TUTORIAL_SESSION: TutorialSessionState = {
  isTutorialActive: false,
  currentTutorialStep: 0,
  tutorialSignal: null,
};

type AppearanceApplier = (appearance: AppearancePreference) => void;

let appearanceApplier: AppearanceApplier = () => undefined;
let signalNonce = 0;

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
  const flag = (input: unknown, fallback: boolean): boolean => (typeof input === 'boolean' ? input : fallback);

  return {
    appearance: isAppearancePreference(record.appearance) ? record.appearance : 'system',
    soundEnabled: flag(record.soundEnabled, true),
    hapticsEnabled: flag(record.hapticsEnabled, true),
    notificationsEnabled: flag(record.notificationsEnabled, true),
    hasSeenWelcome: flag(record.hasSeenWelcome, false),
    hasCompletedNestTutorial: flag(record.hasCompletedNestTutorial, false),
    hasSeenAdoptionTip: flag(record.hasSeenAdoptionTip, false),
  };
}

/** Upgrades a stored state written by `version`. Older saves meet Pip once. */
export function migratePreferences(value: unknown, version: number): PreferencesState {
  const sanitized = sanitizePreferences(value);
  if (version >= GUIDED_TUTORIAL_VERSION) {
    return sanitized;
  }
  return {
    ...sanitized,
    hasSeenWelcome: false,
    hasCompletedNestTutorial: false,
    hasSeenAdoptionTip: false,
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
    const [{ selectCradlePets }, { usePetStore }] = await Promise.all([
      import('@/store/createPetStore'),
      import('@/store/usePetStore'),
    ]);
    await lifecycle.syncNotificationsForStoredPets(selectCradlePets(usePetStore.getState()));
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
    const envelope = parsed as { state: unknown; version?: unknown };
    const version = typeof envelope.version === 'number' ? envelope.version : 0;
    return migratePreferences(envelope.state, version);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function finishNestTutorial(): Pick<PreferencesStore, 'isTutorialActive' | 'hasCompletedNestTutorial' | 'tutorialSignal'> {
  return { isTutorialActive: false, hasCompletedNestTutorial: true, tutorialSignal: null };
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
      set({ isTutorialActive: true, currentTutorialStep: 0, tutorialSignal: null });
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
        return { currentTutorialStep: state.currentTutorialStep + 1, tutorialSignal: null };
      });
    },
    previousTutorialStep: () => {
      set((state) => {
        if (!state.isTutorialActive || state.currentTutorialStep <= 0) {
          return state;
        }
        return { currentTutorialStep: state.currentTutorialStep - 1, tutorialSignal: null };
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
      set({ isTutorialActive: false, currentTutorialStep: 0, tutorialSignal: null });
    },
    completeWelcome: () => {
      set({ hasSeenWelcome: true });
    },
    skipAllTutorials: () => {
      set({
        ...finishNestTutorial(),
        hasSeenWelcome: true,
        hasSeenAdoptionTip: true,
        currentTutorialStep: 0,
      });
    },
    replayTutorial: () => {
      set({
        hasSeenWelcome: false,
        hasCompletedNestTutorial: false,
        hasSeenAdoptionTip: false,
        ...DEFAULT_TUTORIAL_SESSION,
      });
    },
    markAdoptionTipSeen: () => {
      set({ hasSeenAdoptionTip: true });
    },
    signalTutorial: (action, detail) => {
      set((state) => {
        if (!state.isTutorialActive) {
          return state;
        }
        signalNonce += 1;
        return { tutorialSignal: { action, detail, nonce: signalNonce } };
      });
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
      hasSeenWelcome: state.hasSeenWelcome,
      hasCompletedNestTutorial: state.hasCompletedNestTutorial,
      hasSeenAdoptionTip: state.hasSeenAdoptionTip,
    }),
    merge: (persistedState, currentState) => mergePreferencesState(persistedState, currentState),
    migrate: (persistedState, version) => migratePreferences(persistedState, version),
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
