import { registerProReader } from '@/domain/cradleCapacity';
import {
  SANCTUARY_PASS_PRODUCT_ID,
  snapshotFromProductIds,
  type CustomerSnapshot,
  type PurchasesPackage,
} from '@/domain/entitlements';
import { SPECIES_IDS } from '@/domain/types';
import { createMemoryStateStorage, createPetStoreApi } from '@/store/createPetStore';
import {
  createPurchasesStoreApi,
  type PurchaseClient,
} from '@/store/createPurchasesStore';

function memoryClient(owned = new Set<string>()): PurchaseClient {
  return {
    initialize: async () => undefined,
    fetchOfferings: async (): Promise<PurchasesPackage[]> => [],
    purchaseProduct: async (productId: string): Promise<CustomerSnapshot> => {
      owned.add(productId);
      return snapshotFromProductIds([...owned]);
    },
    restorePurchases: async (): Promise<CustomerSnapshot> => snapshotFromProductIds([...owned]),
  };
}

describe('Purchases and entitlements', () => {
  const baseEpoch = 1_700_000_000_000;

  afterEach(() => {
    registerProReader(() => false);
  });

  it('unlocks the free starters and keeps every other species locked', async () => {
    const store = createPurchasesStoreApi({
      storage: createMemoryStateStorage(),
      client: memoryClient(),
    });

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().isProUnlocked).toBe(false);
    expect(store.getState().getMaxCradleCount()).toBe(1);
    expect(store.getState().isSpeciesAvailable('silkie_chicken')).toBe(true);
    expect(store.getState().isSpeciesAvailable('leopard_gecko')).toBe(true);
    expect(store.getState().isSpeciesAvailable('american_robin')).toBe(true);
    expect(store.getState().isSpeciesAvailable('emu')).toBe(true);
    expect(store.getState().isSpeciesAvailable('ball_python')).toBe(true);
    expect(store.getState().isSpeciesAvailable('green_sea_turtle')).toBe(true);
    expect(store.getState().isSpeciesAvailable('emperor_penguin')).toBe(false);
    expect(store.getState().isSpeciesAvailable('platypus')).toBe(false);
    expect(store.getState().unlockedSpeciesIds).toEqual([
      'silkie_chicken',
      'american_robin',
      'emu',
      'leopard_gecko',
      'ball_python',
      'green_sea_turtle',
    ]);
  });

  it('unlocks only the species that was purchased', async () => {
    const store = createPurchasesStoreApi({
      storage: createMemoryStateStorage(),
      client: memoryClient(),
    });

    await store.getState().purchaseProduct('species_emperor_penguin');

    expect(store.getState().isProUnlocked).toBe(false);
    expect(store.getState().getMaxCradleCount()).toBe(1);
    expect(store.getState().isSpeciesAvailable('emperor_penguin')).toBe(true);
    expect(store.getState().isSpeciesAvailable('platypus')).toBe(false);
    expect(store.getState().isSpeciesAvailable('barn_owl')).toBe(false);
    expect(store.getState().isSpeciesAvailable('silkie_chicken')).toBe(true);
  });

  it('unlocks every species and three cradles with the Sanctuary Pass', async () => {
    const purchases = createPurchasesStoreApi({
      storage: createMemoryStateStorage(),
      client: memoryClient(),
    });
    registerProReader(() => purchases.getState().isProUnlocked);

    await purchases.getState().purchaseProduct(SANCTUARY_PASS_PRODUCT_ID);

    expect(purchases.getState().isProUnlocked).toBe(true);
    expect(purchases.getState().getMaxCradleCount()).toBe(3);
    for (const speciesId of SPECIES_IDS) {
      expect(purchases.getState().isSpeciesAvailable(speciesId)).toBe(true);
    }

    let nextId = 0;
    const pets = createPetStoreApi({
      storage: createMemoryStateStorage(),
      now: () => baseEpoch,
      createId: () => {
        nextId += 1;
        return `egg-${nextId}`;
      },
    });

    expect(pets.getState().adoptEggInNewCradle('silkie_chicken', 'A', baseEpoch)?.id).toBe('egg-1');
    expect(pets.getState().adoptEggInNewCradle('leopard_gecko', 'B', baseEpoch)?.id).toBe('egg-2');
    expect(pets.getState().adoptEggInNewCradle('american_robin', 'C', baseEpoch)?.id).toBe('egg-3');
    expect(pets.getState().adoptEggInNewCradle('platypus', 'D', baseEpoch)).toBeNull();
    expect(pets.getState().cradleOrder).toEqual(['egg-1', 'egg-2', 'egg-3']);

    pets.getState().switchCradle(1);
    expect(pets.getState().activePetIndex).toBe(1);
    expect(pets.getState().activePet?.nickname).toBe('B');
    expect(pets.getState().activePet?.speciesId).toBe('leopard_gecko');
  });

  it('keeps a purchased species after the store is reloaded offline', async () => {
    const storage = createMemoryStateStorage();
    const first = createPurchasesStoreApi({
      storage,
      client: memoryClient(),
    });
    await first.getState().purchaseProduct('species_platypus');

    const reloaded = createPurchasesStoreApi({
      storage,
      client: memoryClient(),
    });

    expect(reloaded.getState().isProUnlocked).toBe(false);
    expect(reloaded.getState().isSpeciesAvailable('platypus')).toBe(true);
    expect(reloaded.getState().isSpeciesAvailable('mandarin_duck')).toBe(false);
    expect(reloaded.getState().isSpeciesAvailable('silkie_chicken')).toBe(true);
    expect(reloaded.getState().getMaxCradleCount()).toBe(1);
  });

  it('keeps the Sanctuary Pass after an offline reload', async () => {
    const storage = createMemoryStateStorage();
    const first = createPurchasesStoreApi({
      storage,
      client: memoryClient(),
    });
    await first.getState().purchaseProduct(SANCTUARY_PASS_PRODUCT_ID);

    const reloaded = createPurchasesStoreApi({
      storage,
      client: memoryClient(),
    });

    expect(reloaded.getState().isProUnlocked).toBe(true);
    expect(reloaded.getState().getMaxCradleCount()).toBe(3);
    expect(reloaded.getState().isSpeciesAvailable('green_sea_turtle')).toBe(true);
    expect(reloaded.getState().isSpeciesAvailable('emu')).toBe(true);
  });
});
