import { createPetInstance, resolveSpeciesId, sanitizePetInstance, sanitizePetRecord } from '@/domain/petIntegrity';

describe('Pet integrity', () => {
  const now = 1_700_000_000_000;

  it('creates a well-formed pet and falls back for blank names or unknown species', () => {
    const pet = createPetInstance({
      id: 'p1',
      speciesId: 'not-a-species',
      nickname: '   ',
      nowEpoch: now,
    });

    expect(pet.speciesId).toBe('silkie_chicken');
    expect(pet.nickname).toBe('Hatchling');
    expect(pet.laidAtEpoch).toBe(now);
    expect(pet.lastVerifiedEpoch).toBe(now);
    expect(pet.isHatched).toBe(false);
    expect(pet.currentTemperatureCelsius).toBe(37.5);
    expect(pet.currentHumidityPct).toBe(55);
    expect(pet.vitalityScore).toBeGreaterThanOrEqual(0.3);
    expect(pet.vitalityScore).toBeLessThanOrEqual(1);
    expect(resolveSpeciesId('leopard_gecko')).toBe('leopard_gecko');
  });

  it('sanitizes corrupted pet payloads without throwing', () => {
    expect(sanitizePetInstance(null)).toBeNull();
    expect(sanitizePetInstance('nope')).toBeNull();
    expect(sanitizePetInstance({ nickname: 'Pip' })).toBeNull();

    const recovered = sanitizePetInstance({
      id: 'p2',
      speciesId: 'dragon',
      nickname: 42,
      laidAtEpoch: 'yesterday',
      lastVerifiedEpoch: Number.NaN,
      healthMultiplier: 4,
      isHatched: 'yes',
    }, now);

    expect(recovered).not.toBeNull();
    expect(recovered?.speciesId).toBe('silkie_chicken');
    expect(recovered?.nickname).toBe('Hatchling');
    expect(recovered?.healthMultiplier).toBe(1);
    expect(recovered?.isHatched).toBe(false);
    expect(recovered?.currentTemperatureCelsius).toBe(37.5);
    expect(recovered?.currentHumidityPct).toBe(55);
    expect(recovered?.vitalityScore).toBeGreaterThanOrEqual(0.3);
    expect(recovered?.lastWarmedEpoch).toBe(now);
    expect(recovered?.laidAtEpoch).toBe(now);
  });

  it('drops invalid records from a persisted pet map', () => {
    const pets = sanitizePetRecord({
      good: createPetInstance({ id: 'good', speciesId: 'silkie_chicken', nickname: 'Pip', nowEpoch: now }),
      bad: { nickname: 'no-id' },
    });
    expect(Object.keys(pets)).toEqual(['good']);
  });
});
