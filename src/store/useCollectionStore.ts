import { create } from 'zustand';
import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';
import { persist, type StateStorage } from 'zustand/middleware';

import { getSpeciesConfig } from '@/data/species';
import { registerHatchReader } from '@/domain/cradleCapacity';
import { toHatchCredits } from '@/domain/keeperRewards';
import type { SpeciesId, Temperament } from '@/domain/types';
import { resolveSpeciesId } from '@/domain/petIntegrity';
import {
  createMemoryStateStorage,
  createSafeJsonStorage,
} from '@/store/createPetStore';
import { collectionMmkvStateStorage } from '@/store/storage';

export const COLLECTION_STORE_PERSIST_KEY = 'hatchpal.collection-store';
export const COLLECTION_STORE_PERSIST_VERSION = 1;

/**
 * A creature that completed incubation and now lives permanently in the Sanctuary
 * Gallery. Entries carry a self-contained scientific dossier so the archive renders
 * correctly even if the live species catalog changes.
 */
export interface HatchedSpecimen {
  id: string;
  speciesId: SpeciesId;
  nickname: string;
  commonName: string;
  scientificName: string;
  hatchDateEpoch: number;
  incubationDurationDays: number;
  adultSilhouette: SpeciesId;
  /** Shaped by care habits during incubation. Absent on specimens archived before temperaments. */
  temperament?: Temperament;
  /** Wishes granted while it was still an egg. */
  hearts?: number;
}

const TEMPERAMENTS: readonly Temperament[] = ['sunny', 'dewy', 'songful', 'curious', 'easygoing'];

function resolveTemperamentField(value: unknown): Temperament | undefined {
  return TEMPERAMENTS.find((entry) => entry === value);
}

function optionalCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined;
}

function withCareFields(
  specimen: HatchedSpecimen,
  source: { temperament?: unknown; hearts?: unknown }
): HatchedSpecimen {
  const temperament = resolveTemperamentField(source.temperament);
  const hearts = optionalCount(source.hearts);
  return {
    ...specimen,
    ...(temperament ? { temperament } : {}),
    ...(hearts !== undefined ? { hearts } : {}),
  };
}

export type NewSpecimenInput = Omit<HatchedSpecimen, 'id'> & { id?: string };

export type CollectionPersistedState = {
  hatchedArchive: HatchedSpecimen[];
};

export type CollectionStore = CollectionPersistedState & {
  archiveSpecimen: (specimen: NewSpecimenInput) => HatchedSpecimen;
  removeSpecimen: (id: string) => void;
  clearCollection: () => void;
};

export type CollectionStoreDeps = {
  createId: () => string;
};

const defaultDeps: CollectionStoreDeps = {
  createId: createDefaultId,
};

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function sanitizeSpecimen(value: unknown): HatchedSpecimen | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    return null;
  }
  const speciesId = resolveSpeciesId(raw.speciesId);
  const commonName =
    typeof raw.commonName === 'string' && raw.commonName.trim().length > 0
      ? raw.commonName.trim()
      : 'Hatchling';
  const nickname =
    typeof raw.nickname === 'string' && raw.nickname.trim().length > 0
      ? raw.nickname.trim()
      : commonName;
  const adultSilhouette = resolveSpeciesId(raw.adultSilhouette ?? speciesId);

  return withCareFields({
    id: raw.id,
    speciesId,
    nickname,
    commonName,
    scientificName:
      typeof raw.scientificName === 'string' && raw.scientificName.trim().length > 0
        ? raw.scientificName
        : '—',
    hatchDateEpoch: finiteNumber(raw.hatchDateEpoch, 0),
    incubationDurationDays: Math.max(0, finiteNumber(raw.incubationDurationDays, 0)),
    adultSilhouette,
  }, raw);
}

export function sanitizeCollectionState(value: unknown): CollectionPersistedState {
  const raw =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const nested =
    raw.state !== undefined && typeof raw.state === 'object' && raw.state !== null
      ? (raw.state as Record<string, unknown>)
      : raw;
  const list = Array.isArray(nested.hatchedArchive) ? nested.hatchedArchive : [];
  const hatchedArchive = list
    .map((entry) => sanitizeSpecimen(entry))
    .filter((entry): entry is HatchedSpecimen => entry !== null);
  return { hatchedArchive };
}

export function mergeCollectionState(
  persistedState: unknown,
  currentState: CollectionStore
): CollectionStore {
  return {
    ...currentState,
    ...sanitizeCollectionState(persistedState),
  };
}

export function createCollectionSlice(
  deps: CollectionStoreDeps = defaultDeps
): StateCreator<CollectionStore> {
  return (set, get) => ({
    hatchedArchive: [],
    archiveSpecimen: (input) => {
      const commonName =
        typeof input.commonName === 'string' && input.commonName.trim().length > 0
          ? input.commonName.trim()
          : 'Hatchling';
      const speciesId = resolveSpeciesId(input.speciesId);
      const specimen: HatchedSpecimen = withCareFields({
        id: input.id && input.id.length > 0 ? input.id : deps.createId(),
        speciesId,
        nickname:
          typeof input.nickname === 'string' && input.nickname.trim().length > 0
            ? input.nickname.trim()
            : commonName,
        commonName,
        scientificName: input.scientificName,
        hatchDateEpoch: finiteNumber(input.hatchDateEpoch, 0),
        incubationDurationDays: Math.max(0, finiteNumber(input.incubationDurationDays, 0)),
        adultSilhouette: resolveSpeciesId(input.adultSilhouette ?? speciesId),
      }, input);
      set({ hatchedArchive: [specimen, ...get().hatchedArchive] });
      return specimen;
    },
    removeSpecimen: (id) => {
      set({ hatchedArchive: get().hatchedArchive.filter((entry) => entry.id !== id) });
    },
    clearCollection: () => {
      set({ hatchedArchive: [] });
    },
  });
}

function persistCollection(storage: StateStorage, deps: CollectionStoreDeps) {
  return persist(createCollectionSlice(deps), {
    name: COLLECTION_STORE_PERSIST_KEY,
    version: COLLECTION_STORE_PERSIST_VERSION,
    storage: createSafeJsonStorage<CollectionPersistedState>(() => storage),
    partialize: (state): CollectionPersistedState => ({
      hatchedArchive: state.hatchedArchive,
    }),
    merge: (persistedState, currentState) => mergeCollectionState(persistedState, currentState),
    migrate: (persistedState) => sanitizeCollectionState(persistedState),
  });
}

export function createCollectionStoreApi(
  options: { storage?: StateStorage; createId?: () => string } = {}
): StoreApi<CollectionStore> {
  const storage = options.storage ?? createMemoryStateStorage();
  const deps: CollectionStoreDeps = {
    createId: options.createId ?? defaultDeps.createId,
  };
  return createStore<CollectionStore>()(persistCollection(storage, deps));
}

export const useCollectionStore = create<CollectionStore>()(
  persistCollection(collectionMmkvStateStorage, defaultDeps)
);

registerHatchReader(() =>
  toHatchCredits(useCollectionStore.getState().hatchedArchive, (speciesId) => getSpeciesConfig(speciesId).taxon)
);

export function countArchivedSpecies(archive: readonly HatchedSpecimen[]): number {
  return new Set(archive.map((entry) => entry.speciesId)).size;
}

function createDefaultId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `specimen-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
