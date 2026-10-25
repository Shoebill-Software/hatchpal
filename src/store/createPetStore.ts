import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import {
  persist,
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
  type StorageValue,
} from 'zustand/middleware';
import { getSpeciesConfig } from '@/data/species';
import { readMaxCradleCount, SANCTUARY_CRADLE_LIMIT } from '@/domain/cradleCapacity';
import { createPetInstance, sanitizePetRecord } from '@/domain/petIntegrity';
import {
  LIVE_TICK_MAX_FORWARD_MS,
  nextVerifiedEpoch,
  resolveHatchedAtEpoch,
  resolvePetSnapshot,
} from '@/domain/timeEngine';
import { PetInstance, PetInteractionKind, SpeciesId } from '@/domain/types';
import { syncNotificationsForStoredPets } from '@/services/notificationLifecycle';
import { mistSubstrate, warmNest } from '@/domain/climateEngine';

export const PET_STORE_PERSIST_KEY = 'hatchpal.pet-store';
export const PET_STORE_PERSIST_VERSION = 3;

export type ClockRefreshMode = 'resume' | 'tick';

export type PetPersistedState = {
  pets: Record<string, PetInstance>;
  /** Ordered cradle slots. Absent on legacy saves, which still collapse to one egg. */
  cradleOrder: string[];
  activePetIndex: number;
  activePetId: string | null;
};

export type PetStoreState = PetPersistedState & {
  hasHydrated: boolean;
  /** Focused cradle. Derived from `cradleOrder[activePetIndex]` and not persisted. */
  activePet: PetInstance | null;
};

export type PetStoreActions = {
  adoptPet: (speciesId: SpeciesId | string, nickname: string, nowEpoch?: number) => PetInstance;
  /** Adds a cradle when the entitlement still has room. Returns null at the limit. */
  adoptEggInNewCradle: (
    speciesId: SpeciesId | string,
    nickname: string,
    nowEpoch?: number
  ) => PetInstance | null;
  switchCradle: (index: number) => void;
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

export function emptyPetState(): PetPersistedState {
  return { pets: {}, cradleOrder: [], activePetIndex: 0, activePetId: null };
}

export function orderedCradleIds(
  pets: Record<string, PetInstance>,
  cradleOrder: readonly string[]
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of cradleOrder) {
    if (!pets[id] || seen.has(id)) {
      continue;
    }
    seen.add(id);
    order.push(id);
    if (order.length >= SANCTUARY_CRADLE_LIMIT) {
      break;
    }
  }
  return order;
}

export function selectCradlePets(state: {
  pets: Record<string, PetInstance>;
  cradleOrder: readonly string[];
}): PetInstance[] {
  return orderedCradleIds(state.pets, state.cradleOrder).flatMap((id) => {
    const pet = state.pets[id];
    return pet ? [pet] : [];
  });
}

export function selectActivePet(state: PetPersistedState): PetInstance | null {
  if (state.activePetIndex < 0 || state.activePetId == null) {
    return null;
  }
  const cradles = selectCradlePets(state);
  return cradles[state.activePetIndex] ?? null;
}

function present(
  draft: PetPersistedState,
  focus: number | 'cleared'
): PetPersistedState & { activePet: PetInstance | null } {
  const cradleOrder = orderedCradleIds(draft.pets, draft.cradleOrder);
  if (focus === 'cleared') {
    return {
      pets: draft.pets,
      cradleOrder,
      activePetIndex: -1,
      activePetId: null,
      activePet: null,
    };
  }
  const pets: Record<string, PetInstance> = {};
  for (const id of cradleOrder) {
    const pet = draft.pets[id];
    if (pet) {
      pets[id] = pet;
    }
  }
  if (cradleOrder.length === 0) {
    return { pets: {}, cradleOrder: [], activePetIndex: 0, activePetId: null, activePet: null };
  }
  const index = Math.min(Math.max(focus, 0), cradleOrder.length - 1);
  const active = pets[cradleOrder[index] ?? ''] ?? null;
  return {
    pets,
    cradleOrder,
    activePetIndex: index,
    activePetId: active?.id ?? null,
    activePet: active,
  };
}

export function sanitizePersistedState(
  persisted: unknown,
  nowEpoch = Date.now()
): PetPersistedState {
  if (persisted === null || typeof persisted !== 'object') {
    return emptyPetState();
  }

  const raw = persisted as Record<string, unknown>;
  const nestedState =
    raw.state !== undefined && typeof raw.state === 'object' && raw.state !== null
      ? (raw.state as Record<string, unknown>)
      : raw;

  const pets = sanitizePetRecord(nestedState.pets, nowEpoch);
  const requestedId =
    typeof nestedState.activePetId === 'string' ? nestedState.activePetId : null;

  if (!Array.isArray(nestedState.cradleOrder)) {
    return enforceSingleIncubation({ pets, cradleOrder: [], activePetIndex: 0, activePetId: requestedId });
  }

  const cradleOrder = orderedCradleIds(
    pets,
    nestedState.cradleOrder.filter((id): id is string => typeof id === 'string')
  );
  const kept: Record<string, PetInstance> = {};
  for (const id of cradleOrder) {
    const pet = pets[id];
    if (pet) {
      kept[id] = pet;
    }
  }
  if (cradleOrder.length === 0) {
    return emptyPetState();
  }
  const requestedIndex =
    typeof nestedState.activePetIndex === 'number' && Number.isFinite(nestedState.activePetIndex)
      ? Math.floor(nestedState.activePetIndex)
      : cradleOrder.indexOf(requestedId ?? '');
  const fromId = requestedId ? cradleOrder.indexOf(requestedId) : -1;
  const index =
    requestedIndex >= 0 && requestedIndex < cradleOrder.length
      ? requestedIndex
      : fromId >= 0
        ? fromId
        : 0;
  return {
    pets: kept,
    cradleOrder,
    activePetIndex: index,
    activePetId: cradleOrder[index] ?? null,
  };
}

/**
 * Legacy saves predate cradle order and still hold a single incubation.
 * Explicit cradle orders are kept, up to the sanctuary maximum.
 */
export function enforceSingleIncubation(state: PetPersistedState): PetPersistedState {
  if (state.activePetId && state.pets[state.activePetId]) {
    const active = state.pets[state.activePetId];
    return {
      pets: { [active.id]: active },
      cradleOrder: [active.id],
      activePetIndex: 0,
      activePetId: active.id,
    };
  }

  return emptyPetState();
}

export function mergePetPersistedState(
  persistedState: unknown,
  currentState: PetStore
): PetStore {
  const sanitized = sanitizePersistedState(persistedState);
  return {
    ...currentState,
    ...sanitized,
    activePet: selectActivePet(sanitized),
    hasHydrated: true,
  };
}

export function createPetStoreSlice(deps: PetStoreDeps = defaultDeps): StateCreator<PetStore> {
  const resolveNow = (nowEpoch?: number): number =>
    typeof nowEpoch === 'number' && Number.isFinite(nowEpoch) ? nowEpoch : deps.now();

  const getActivePet = (state: PetStore): PetInstance | null => state.activePet;

  const syncCradleAlerts = (state: PetStore): void => {
    syncNotificationsForStoredPets(selectCradlePets(state));
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
      activePet: next,
    });
  };

  return (set, get) => ({
    pets: {},
    cradleOrder: [],
    activePetIndex: 0,
    activePetId: null,
    activePet: null,
    hasHydrated: false,
    adoptPet: (speciesId, nickname, nowEpoch) => {
      const now = resolveNow(nowEpoch);
      const pet = createPetInstance({
        id: deps.createId(),
        speciesId,
        nickname,
        nowEpoch: now,
      });
      const state = get();
      const order = orderedCradleIds(state.pets, state.cradleOrder);
      if (order.length === 0) {
        set(
          present(
            { pets: { [pet.id]: pet }, cradleOrder: [pet.id], activePetIndex: 0, activePetId: pet.id },
            0
          )
        );
      } else {
        const index =
          state.activePetIndex >= 0 && state.activePetIndex < order.length ? state.activePetIndex : 0;
        const previousId = order[index];
        const pets = { ...state.pets };
        if (previousId && previousId !== pet.id) {
          delete pets[previousId];
        }
        pets[pet.id] = pet;
        const cradleOrder = order.slice();
        cradleOrder[index] = pet.id;
        set(present({ pets, cradleOrder, activePetIndex: index, activePetId: pet.id }, index));
      }
      syncCradleAlerts(get());
      return pet;
    },
    adoptEggInNewCradle: (speciesId, nickname, nowEpoch) => {
      const state = get();
      const order = orderedCradleIds(state.pets, state.cradleOrder);
      if (order.length >= readMaxCradleCount()) {
        return null;
      }
      const now = resolveNow(nowEpoch);
      const pet = createPetInstance({
        id: deps.createId(),
        speciesId,
        nickname,
        nowEpoch: now,
      });
      const pets = { ...state.pets, [pet.id]: pet };
      const cradleOrder = [...order, pet.id];
      const index = cradleOrder.length - 1;
      set(present({ pets, cradleOrder, activePetIndex: index, activePetId: pet.id }, index));
      syncCradleAlerts(get());
      return pet;
    },
    switchCradle: (index) => {
      const state = get();
      const order = orderedCradleIds(state.pets, state.cradleOrder);
      if (index < 0 || index >= order.length || index === state.activePetIndex) {
        return;
      }
      set(
        present(
          {
            pets: state.pets,
            cradleOrder: order,
            activePetIndex: index,
            activePetId: order[index] ?? null,
          },
          index
        )
      );
    },
    abandonActivePet: () => {
      const state = get();
      const order = orderedCradleIds(state.pets, state.cradleOrder);
      if (order.length === 0) {
        set(present(emptyPetState(), 0));
        syncCradleAlerts(get());
        return;
      }
      const index =
        state.activePetIndex >= 0 && state.activePetIndex < order.length ? state.activePetIndex : 0;
      const removed = order[index];
      const pets = { ...state.pets };
      if (removed) {
        delete pets[removed];
      }
      const cradleOrder = order.filter((id) => id !== removed);
      if (cradleOrder.length === 0) {
        set(present(emptyPetState(), 0));
      } else {
        const next = Math.min(index, cradleOrder.length - 1);
        set(
          present(
            {
              pets,
              cradleOrder,
              activePetIndex: next,
              activePetId: cradleOrder[next] ?? null,
            },
            next
          )
        );
      }
      syncCradleAlerts(get());
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
      const now = resolveNow(nowEpoch);
      const state = get();
      const pets = { ...state.pets };
      let changed = false;
      for (const [id, pet] of Object.entries(pets)) {
        const nextVerified = nextVerifiedEpoch(now, pet.lastVerifiedEpoch, {
          maxForwardAdvanceMs: mode === 'tick' ? LIVE_TICK_MAX_FORWARD_MS : undefined,
        });
        if (nextVerified === pet.lastVerifiedEpoch) {
          continue;
        }
        pets[id] = { ...pet, lastVerifiedEpoch: nextVerified };
        changed = true;
      }
      if (!changed) {
        return;
      }
      const active =
        state.activePetId && pets[state.activePetId] ? pets[state.activePetId] : null;
      set({ pets, activePet: active });
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
        syncCradleAlerts(get());
      }
    },
    syncHatchState: (nowEpoch) => {
      get().markHatched(nowEpoch);
    },
    setActivePet: (id) => {
      const state = get();
      const order = orderedCradleIds(state.pets, state.cradleOrder);
      if (id === null) {
        set(
          present(
            { pets: state.pets, cradleOrder: order, activePetIndex: -1, activePetId: null },
            'cleared'
          )
        );
        return;
      }
      const index = order.indexOf(id);
      if (index < 0 || !state.pets[id]) {
        set(
          present(
            { pets: state.pets, cradleOrder: order, activePetIndex: -1, activePetId: null },
            'cleared'
          )
        );
        return;
      }
      set(
        present(
          { pets: state.pets, cradleOrder: order, activePetIndex: index, activePetId: id },
          index
        )
      );
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
        cradleOrder: state.cradleOrder,
        activePetIndex: state.activePetIndex,
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
