jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map<string, string>();
    return {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string | number | boolean) => {
        values.set(key, String(value));
      },
      remove: (key: string) => {
        values.delete(key);
        return true;
      },
    };
  },
}));

import { createMemoryStateStorage } from '@/store/createPetStore';
import {
  COLLECTION_STORE_PERSIST_KEY,
  countArchivedSpecies,
  createCollectionStoreApi,
  sanitizeCollectionState,
} from '@/store/useCollectionStore';

describe('Sanctuary collection archive', () => {
  const specimen = {
    speciesId: 'silkie_chicken' as const,
    nickname: 'Pip',
    commonName: 'Silkie Chicken',
    scientificName: 'Gallus gallus domesticus',
    hatchDateEpoch: 1_700_000_000_000,
    incubationDurationDays: 21,
    adultSilhouette: 'silkie_chicken' as const,
  };

  it('archives a hatched specimen at the front of the hall', () => {
    const store = createCollectionStoreApi({
      storage: createMemoryStateStorage(),
      createId: () => 'specimen-1',
    });

    const archived = store.getState().archiveSpecimen(specimen);
    expect(archived.id).toBe('specimen-1');
    expect(archived.nickname).toBe('Pip');
    expect(store.getState().hatchedArchive).toHaveLength(1);
    expect(countArchivedSpecies(store.getState().hatchedArchive)).toBe(1);
  });

  it('keeps distinct species counts when two of the same bird hatch', () => {
    let next = 0;
    const store = createCollectionStoreApi({
      storage: createMemoryStateStorage(),
      createId: () => {
        next += 1;
        return `specimen-${next}`;
      },
    });
    store.getState().archiveSpecimen(specimen);
    store.getState().archiveSpecimen({ ...specimen, nickname: 'Pipa' });
    expect(store.getState().hatchedArchive).toHaveLength(2);
    expect(countArchivedSpecies(store.getState().hatchedArchive)).toBe(1);

    store.getState().archiveSpecimen({
      ...specimen,
      speciesId: 'leopard_gecko',
      adultSilhouette: 'leopard_gecko',
      scientificName: 'Eublepharis macularius',
      nickname: 'Nova',
    });
    expect(countArchivedSpecies(store.getState().hatchedArchive)).toBe(2);
  });

  it('persists the archive and recovers from corrupt payloads', () => {
    const storage = createMemoryStateStorage();
    const first = createCollectionStoreApi({
      storage,
      createId: () => 'specimen-1',
    });
    first.getState().archiveSpecimen(specimen);

    const rehydrated = createCollectionStoreApi({
      storage,
      createId: () => 'unused',
    });
    expect(rehydrated.getState().hatchedArchive[0]?.nickname).toBe('Pip');

    storage.setItem(COLLECTION_STORE_PERSIST_KEY, '{broken');
    const recovered = createCollectionStoreApi({
      storage,
      createId: () => 'unused',
    });
    expect(recovered.getState().hatchedArchive).toEqual([]);
    expect(sanitizeCollectionState({ hatchedArchive: [{ id: '' }] }).hatchedArchive).toEqual([]);
  });

  it('keeps temperament and hearts across archive sanitize and reload', () => {
    const storage = createMemoryStateStorage();
    const store = createCollectionStoreApi({
      storage,
      createId: () => 'specimen-1',
    });
    store.getState().archiveSpecimen({
      ...specimen,
      temperament: 'songful',
      hearts: 4,
    });
    expect(store.getState().hatchedArchive[0]?.temperament).toBe('songful');
    expect(store.getState().hatchedArchive[0]?.hearts).toBe(4);

    const reloaded = createCollectionStoreApi({
      storage,
      createId: () => 'unused',
    });
    expect(reloaded.getState().hatchedArchive[0]?.temperament).toBe('songful');
    expect(reloaded.getState().hatchedArchive[0]?.hearts).toBe(4);

    const cleaned = sanitizeCollectionState({
      hatchedArchive: [
        { ...specimen, id: 'ok', temperament: 'curious', hearts: 0 },
        { ...specimen, id: 'bad-temp', temperament: 'fiery', hearts: -2 },
        { ...specimen, id: 'legacy' },
      ],
    });
    expect(cleaned.hatchedArchive[0]).toMatchObject({ id: 'ok', temperament: 'curious', hearts: 0 });
    expect(cleaned.hatchedArchive[1]).toMatchObject({ id: 'bad-temp', hearts: 0 });
    expect(cleaned.hatchedArchive[1]).not.toHaveProperty('temperament');
    expect(cleaned.hatchedArchive[2]).toMatchObject({ id: 'legacy' });
    expect(cleaned.hatchedArchive[2]).not.toHaveProperty('temperament');
    expect(cleaned.hatchedArchive[2]).not.toHaveProperty('hearts');
  });
});
