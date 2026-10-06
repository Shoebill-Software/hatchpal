import { silkieChickenConfig } from '@/data/species/chicken';
import { LIVE_TICK_MAX_FORWARD_MS } from '@/domain/timeEngine';
import {
  PET_STORE_PERSIST_KEY,
  createMemoryStateStorage,
  createPetStoreApi,
} from '@/store/createPetStore';

describe('Pet store', () => {
  const baseEpoch = 1_700_000_000_000;
  const dayMs = 86_400_000;

  const createStore = (now = baseEpoch, storage = createMemoryStateStorage()) =>
    createPetStoreApi({
      storage,
      now: () => now,
      createId: () => 'pet-1',
    });

  it('adopts a pet immediately and hydrates synchronously from memory storage', () => {
    const store = createStore();
    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().activePetId).toBeNull();

    const pet = store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    expect(pet.id).toBe('pet-1');
    expect(store.getState().activePetId).toBe('pet-1');
    expect(store.getState().pets['pet-1']?.nickname).toBe('Pip');
    expect(store.getState().pets['pet-1']?.laidAtEpoch).toBe(baseEpoch);
  });

  it('falls back to silkie chicken when adopting with an invalid species id', () => {
    const store = createStore();
    const pet = store.getState().adoptPet('unknown_animal', 'Pip');
    expect(pet.speciesId).toBe('silkie_chicken');
  });

  it('does not commit a live ticker forward-jump into lastVerifiedEpoch', () => {
    const store = createStore();
    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().refreshClock('tick', baseEpoch + 14 * dayMs);

    expect(store.getState().pets['pet-1']?.lastVerifiedEpoch).toBe(baseEpoch);
    expect(LIVE_TICK_MAX_FORWARD_MS).toBeLessThan(14 * dayMs);
  });

  it('commits genuine resume catch-up and can freeze later if the clock is rolled back', () => {
    const store = createStore();
    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    const resumed = baseEpoch + 14 * dayMs;
    store.getState().refreshClock('resume', resumed);
    expect(store.getState().pets['pet-1']?.lastVerifiedEpoch).toBe(resumed);

    store.getState().refreshClock('resume', resumed - 3 * dayMs);
    expect(store.getState().pets['pet-1']?.lastVerifiedEpoch).toBe(resumed);
  });

  it('records nest interactions against the active pet only', () => {
    const store = createStore();
    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().recordInteraction('turn_egg', baseEpoch + 1000);
    store.getState().recordInteraction('mist_nest', baseEpoch + 2000);
    const pet = store.getState().pets['pet-1'];
    expect(pet?.lastTurnedEpoch).toBe(baseEpoch + 1000);
    expect(pet?.lastMistedEpoch).toBe(baseEpoch + 2000);
    expect(pet?.lastInteractedEpoch).toBe(baseEpoch + 2000);

    store.getState().recordInteraction('turn_egg', baseEpoch + 18 * dayMs);
    expect(store.getState().pets['pet-1']?.lastTurnedEpoch).toBe(baseEpoch + 1000);

    store.getState().recordInteraction('turn_egg', baseEpoch + 19 * dayMs);
    expect(store.getState().pets['pet-1']?.lastTurnedEpoch).toBe(baseEpoch + 1000);

    store.getState().setActivePet(null);
    store.getState().recordInteraction('turn_egg', baseEpoch + 5000);
    expect(store.getState().pets['pet-1']?.lastTurnedEpoch).toBe(baseEpoch + 1000);
  });

  it('marks hatch at the deterministic incubation boundary once progress is complete', () => {
    const store = createStore();
    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().syncHatchState(baseEpoch + 10 * dayMs);
    expect(store.getState().pets['pet-1']?.isHatched).toBe(false);

    const hatchEpoch = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    store.getState().syncHatchState(hatchEpoch);
    expect(store.getState().pets['pet-1']?.isHatched).toBe(true);
    expect(store.getState().pets['pet-1']?.hatchedAtEpoch).toBe(hatchEpoch);
  });

  it('rehydrates valid state and ignores corrupt persisted JSON', () => {
    const validStorage = createMemoryStateStorage({
      [PET_STORE_PERSIST_KEY]: JSON.stringify({
        state: {
          pets: {
            'pet-1': {
              id: 'pet-1',
              speciesId: 'silkie_chicken',
              nickname: 'Pip',
              laidAtEpoch: baseEpoch,
              lastVerifiedEpoch: baseEpoch,
              lastInteractedEpoch: baseEpoch,
              healthMultiplier: 1,
              lastTurnedEpoch: baseEpoch,
              lastMistedEpoch: baseEpoch,
              isHatched: false,
            },
          },
          activePetId: 'pet-1',
        },
        version: 1,
      }),
    });
    const hydrated = createPetStoreApi({
      storage: validStorage,
      now: () => baseEpoch,
      createId: () => 'unused',
    });
    expect(hydrated.getState().activePetId).toBe('pet-1');
    expect(hydrated.getState().pets['pet-1']?.nickname).toBe('Pip');

    const corruptStorage = createMemoryStateStorage({
      [PET_STORE_PERSIST_KEY]: '{broken',
    });
    const recovered = createPetStoreApi({
      storage: corruptStorage,
      now: () => baseEpoch,
      createId: () => 'pet-1',
    });
    expect(recovered.getState().activePetId).toBeNull();
    expect(recovered.getState().pets).toEqual({});
    expect(recovered.getState().hasHydrated).toBe(true);
  });

  it('abandons the active egg and then adopts a single replacement', () => {
    let nextId = 0;
    const store = createPetStoreApi({
      storage: createMemoryStateStorage(),
      now: () => baseEpoch,
      createId: () => {
        nextId += 1;
        return `pet-${nextId}`;
      },
    });

    const first = store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().recordInteraction('turn_egg', baseEpoch + 1000);
    expect(store.getState().activePetId).toBe(first.id);
    expect(store.getState().pets[first.id]?.lastTurnedEpoch).toBe(baseEpoch + 1000);

    store.getState().abandonActivePet();
    expect(store.getState().activePetId).toBeNull();
    expect(store.getState().pets).toEqual({});

    const second = store.getState().adoptPet('leopard_gecko', 'Nova', baseEpoch + 5000);
    expect(second.id).not.toBe(first.id);
    expect(second.speciesId).toBe('leopard_gecko');
    expect(second.nickname).toBe('Nova');
    expect(second.laidAtEpoch).toBe(baseEpoch + 5000);
    expect(store.getState().activePetId).toBe(second.id);
    expect(Object.keys(store.getState().pets)).toEqual([second.id]);
    expect(store.getState().pets[first.id]).toBeUndefined();
  });

  it('replaces an in-progress incubation instead of keeping two eggs', () => {
    let nextId = 0;
    const store = createPetStoreApi({
      storage: createMemoryStateStorage(),
      now: () => baseEpoch,
      createId: () => {
        nextId += 1;
        return `pet-${nextId}`;
      },
    });

    store.getState().adoptPet('silkie_chicken', 'Pip', baseEpoch);
    store.getState().adoptPet('green_sea_turtle', 'Cove', baseEpoch + dayMs);
    const pets = store.getState().pets;
    const ids = Object.keys(pets);

    expect(ids).toHaveLength(1);
    expect(pets[ids[0] ?? '']?.speciesId).toBe('green_sea_turtle');
    expect(store.getState().activePetId).toBe(ids[0]);
  });

  it('collapses a persisted multi-egg record down to the active incubation', () => {
    const petFields = {
      laidAtEpoch: baseEpoch,
      lastVerifiedEpoch: baseEpoch,
      lastInteractedEpoch: baseEpoch,
      healthMultiplier: 1,
      lastTurnedEpoch: baseEpoch,
      lastMistedEpoch: baseEpoch,
      isHatched: false,
    };
    const storage = createMemoryStateStorage({
      [PET_STORE_PERSIST_KEY]: JSON.stringify({
        state: {
          pets: {
            'pet-a': {
              id: 'pet-a',
              speciesId: 'silkie_chicken',
              nickname: 'Pip',
              ...petFields,
            },
            'pet-b': {
              id: 'pet-b',
              speciesId: 'leopard_gecko',
              nickname: 'Nova',
              ...petFields,
            },
          },
          activePetId: 'pet-b',
        },
        version: 1,
      }),
    });

    const store = createPetStoreApi({
      storage,
      now: () => baseEpoch,
      createId: () => 'unused',
    });

    expect(store.getState().activePetId).toBe('pet-b');
    expect(Object.keys(store.getState().pets)).toEqual(['pet-b']);
    expect(store.getState().pets['pet-b']?.speciesId).toBe('leopard_gecko');
    expect(store.getState().pets['pet-a']).toBeUndefined();
  });
});
