import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import {
  persist,
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
  type StorageValue,
} from 'zustand/middleware';
import { getSpeciesConfig } from '@/data/species';
import { createPetInstance, sanitizePetRecord } from '@/domain/petIntegrity';
import {
  LIVE_TICK_MAX_FORWARD_MS,
  nextVerifiedEpoch,
  resolveHatchedAtEpoch,
  resolvePetSnapshot,
} from '@/domain/timeEngine';
import { PetInstance, PetInteractionKind, SpeciesId } from '@/domain/types';
import {
  cancelScheduledPetNotifications,
  scheduleNotificationsForAdoptedPet,
} from '@/services/notificationLifecycle';
import { mistSubstrate, warmNest } from '@/domain/climateEngine';

export const PET_STORE_PERSIST_KEY = 'hatchpal.pet-store';
export const PET_STORE_PERSIST_VERSION = 2;

export type ClockRefreshMode = 'resume' | 'tick';

export type PetPersistedState = {
  pets: Record<string, PetInstance>;
  activePetId: string | null;
};

export type PetStoreState = PetPersistedState & {
  hasHydrated: boolean;
};

export type PetStoreActions = {
  adoptPet: (speciesId: SpeciesId | string, nickname: string, nowEpoch?: number) => PetInstance;
  abandonActivePet: () => void;
  recordInteraction: (kind: PetInteractionKind, nowEpoch?: number) => void;
  refreshClock: (mode: ClockRefreshMode, nowEpoch?: number) => void;
  /** Commits the hatching ceremony. Stamps the biological hatch epoch once incubation is complete. */
  markHatched: (nowEpoch?: number) => void;
  syncHatchState: (nowEpoch?: number) => void;
  setActivePet: (id: string | null) => void;
};

export type PetStore = PetStoreState & PetStoreActions;

export type PetStoreClockMode = ClockRefreshMode;

export type PetStoreDeps = {
  now: () => number;
  createId: () => string;
};

const defaultDeps: PetStoreDeps = {
  now: () => Date.now(),
  createId: createDefaultId,
};

export function createMemoryStateStorage(
  initial: Record<string, string> = {}
): StateStorage & { snapshot: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (name: string): string | null => map.get(name) ?? null,
    setItem: (name: string, value: string): void => {
      map.set(name, value);
    },
    removeItem: (name: string): void => {
      map.delete(name);
    },
    snapshot: () => Object.fromEntries(map.entries()),
  };
}

export function createSafeJsonStorage<S>(getStorage: () => StateStorage): PersistStorage<S> {
  const inner = createJSONStorage<S>(getStorage);

  const empty: PersistStorage<S> = {
    getItem: (): StorageValue<S> | null => null,
    setItem: (): void => undefined,
    removeItem: (): void => undefined,
  };

  const storage = inner ?? empty;

  return {
    getItem: (name: string): StorageValue<S> | null | Promise<StorageValue<S> | null> => {
      try {
        const result = storage.getItem(name);
        if (result instanceof Promise) {
          return result.catch(() => null);
        }
        return result;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<S>): void => {
      try {
        storage.setItem(name, value);
      } catch {
        // Persistence must never crash gameplay.
      }
    },
    removeItem: (name: string): void => {
      try {
        storage.removeItem(name);
      } catch {
        // Persistence must never crash gameplay.
      }
    },
  };
}

export function sanitizePersistedState(
  persisted: unknown,
  nowEpoch = Date.now()
): PetPersistedState {
  if (persisted === null || typeof persisted !== 'object') {
    return { pets: {}, activePetId: null };
  }

  const raw = persisted as Record<string, unknown>;
  const nestedState =
    raw.state !== undefined && typeof raw.state === 'object' && raw.state !== null
      ? (raw.state as Record<string, unknown>)
      : raw;

  const pets = sanitizePetRecord(nestedState.pets, nowEpoch);
  const requestedId =
    typeof nestedState.activePetId === 'string' ? nestedState.activePetId : null;
  const activePetId = requestedId && pets[requestedId] ? requestedId : null;

  return enforceSingleIncubation({ pets, activePetId });
}

/** HatchPal incubates exactly one egg. Orphaned or extra records are dropped. */
export function enforceSingleIncubation(state: PetPersistedState): PetPersistedState {
  if (state.activePetId && state.pets[state.activePetId]) {
    const active = state.pets[state.activePetId];
    return {
      pets: { [active.id]: active },
      activePetId: active.id,
    };
  }

  return { pets: {}, activePetId: null };
}

export function mergePetPersistedState(
  persistedState: unknown,
  currentState: PetStore
): PetStore {
  const sanitized = sanitizePersistedState(persistedState);
  return {
    ...currentState,
    pets: sanitized.pets,
    activePetId: sanitized.activePetId,
    hasHydrated: true,
  };
}

export function createPetStoreSlice(deps: PetStoreDeps = defaultDeps): StateCreator<PetStore> {
  const resolveNow = (nowEpoch?: number): number =>
    typeof nowEpoch === 'number' && Number.isFinite(nowEpoch) ? nowEpoch : deps.now();

  const getActivePet = (state: PetStore): PetInstance | null => {
    if (!state.activePetId) {
      return null;
    }
    return state.pets[state.activePetId] ?? null;
  };

  const replaceActivePet = (
    set: (partial: Partial<PetStore> | ((state: PetStore) => Partial<PetStore>)) => void,
    get: () => PetStore,
    updater: (pet: PetInstance, nowEpoch: number) => PetInstance | null,
    nowEpoch?: number
  ): void => {
    const now = resolveNow(nowEpoch);
    const current = getActivePet(get());
    if (!current) {
      return;
    }
    const next = updater(current, now);
    if (!next || next === current) {
      return;
    }
    set({
      pets: {
        ...get().pets,
        [next.id]: next,
      },
    });
  };

  return (set, get) => ({
    pets: {},
    activePetId: null,
    hasHydrated: false,
    adoptPet: (speciesId, nickname, nowEpoch) => {
      const now = resolveNow(nowEpoch);
      const pet = createPetInstance({
        id: deps.createId(),
        speciesId,
        nickname,
        nowEpoch: now,
      });
      set({
        pets: { [pet.id]: pet },
        activePetId: pet.id,
      });
      scheduleNotificationsForAdoptedPet(pet);
      return pet;
    },
    abandonActivePet: () => {
      set({ pets: {}, activePetId: null });
      cancelScheduledPetNotifications();
    },
    recordInteraction: (kind, nowEpoch) => {
      replaceActivePet(set, get, (pet, now) => {
        if (kind === 'warm_nest' || kind === 'mist_nest') {
          if (pet.isHatched) {
            return pet;
          }
          const species = getSpeciesConfig(pet.speciesId);
          return kind === 'warm_nest' ? warmNest(pet, species, now) : mistSubstrate(pet, species, now);
        }
        if (!pet.isHatched) {
          return pet;
        }
        if (kind === 'feed') {
          return {
            ...pet,
            lastFedEpoch: now,
            lastInteractedEpoch: now,
          };
        }
        if (kind === 'weigh') {
          return {
            ...pet,
            lastWeighedEpoch: now,
            lastInteractedEpoch: now,
          };
        }
        return {
          ...pet,
          lastInteractedEpoch: now,
        };
      }, nowEpoch);
    },
    refreshClock: (mode, nowEpoch) => {
      replaceActivePet(set, get, (pet, now) => {
        const nextVerified = nextVerifiedEpoch(now, pet.lastVerifiedEpoch, {
          maxForwardAdvanceMs: mode === 'tick' ? LIVE_TICK_MAX_FORWARD_MS : undefined,
        });
        if (nextVerified === pet.lastVerifiedEpoch) {
          return pet;
        }
        return {
          ...pet,
          lastVerifiedEpoch: nextVerified,
        };
      }, nowEpoch);
    },
    markHatched: (nowEpoch) => {
      let didHatch = false;
      replaceActivePet(set, get, (pet, now) => {
        if (pet.isHatched) {
          return pet;
        }
        const species = getSpeciesConfig(pet.speciesId);
        const snapshot = resolvePetSnapshot(pet, species, now);
        if (!snapshot.isReadyToHatch) {
          return pet;
        }
        didHatch = true;
        return {
          ...pet,
          isHatched: true,
          hatchedAtEpoch: resolveHatchedAtEpoch(pet, species),
          lastInteractedEpoch: now,
        };
      }, nowEpoch);
      if (didHatch) {
        cancelScheduledPetNotifications();
      }
    },
    syncHatchState: (nowEpoch) => {
      get().markHatched(nowEpoch);
    },
    setActivePet: (id) => {
      const state = get();
      if (id === null) {
        set({ activePetId: null });
        return;
      }
      const pet = state.pets[id];
      if (!pet) {
        set({ activePetId: null });
        return;
      }
      set({
        pets: { [pet.id]: pet },
        activePetId: pet.id,
      });
    },
  });
}

export function createPetStoreApi(
  options: {
    storage?: StateStorage;
    now?: () => number;
    createId?: () => string;
  } = {}
): StoreApi<PetStore> {
  const deps: PetStoreDeps = {
    now: options.now ?? defaultDeps.now,
    createId: options.createId ?? defaultDeps.createId,
  };
  const storage = options.storage ?? createMemoryStateStorage();

  const store = createStore<PetStore>()(
    persist(createPetStoreSlice(deps), {
      name: PET_STORE_PERSIST_KEY,
      version: PET_STORE_PERSIST_VERSION,
      storage: createSafeJsonStorage(() => storage),
      partialize: (state): PetPersistedState => ({
        pets: state.pets,
        activePetId: state.activePetId,
      }),
      merge: (persistedState, currentState) =>
        mergePetPersistedState(persistedState, currentState),
      migrate: (persistedState) => sanitizePersistedState(persistedState, deps.now()),
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

function createDefaultId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
