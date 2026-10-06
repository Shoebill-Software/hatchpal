import { SPECIES_IDS, PetInstance, SpeciesId } from './types';

const FALLBACK_SPECIES_ID: SpeciesId = 'silkie_chicken';

export function isSpeciesId(value: unknown): value is SpeciesId {
  return typeof value === 'string' && (SPECIES_IDS as readonly string[]).includes(value);
}

export function resolveSpeciesId(value: unknown): SpeciesId {
  return isSpeciesId(value) ? value : FALLBACK_SPECIES_ID;
}

export function clampUnitInterval(value: unknown, fallback = 1): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export function toFiniteEpoch(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

export function createPetInstance(input: {
  id: string;
  speciesId: unknown;
  nickname: unknown;
  nowEpoch: number;
}): PetInstance {
  const nowEpoch = toFiniteEpoch(input.nowEpoch, 0);
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : '';

  return {
    id: input.id,
    speciesId: resolveSpeciesId(input.speciesId),
    nickname: nickname.length > 0 ? nickname : 'Hatchling',
    laidAtEpoch: nowEpoch,
    lastVerifiedEpoch: nowEpoch,
    lastInteractedEpoch: nowEpoch,
    healthMultiplier: 1,
    lastTurnedEpoch: nowEpoch,
    lastMistedEpoch: nowEpoch,
    isHatched: false,
  };
}

export function sanitizePetInstance(value: unknown, nowEpoch = 0): PetInstance | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    return null;
  }

  const laidAtEpoch = toFiniteEpoch(raw.laidAtEpoch, toFiniteEpoch(nowEpoch, 0));
  const lastVerifiedEpoch = toFiniteEpoch(raw.lastVerifiedEpoch, laidAtEpoch);
  const lastInteractedEpoch = toFiniteEpoch(raw.lastInteractedEpoch, laidAtEpoch);

  const pet: PetInstance = {
    id: raw.id,
    speciesId: resolveSpeciesId(raw.speciesId),
    nickname:
      typeof raw.nickname === 'string' && raw.nickname.trim().length > 0
        ? raw.nickname.trim()
        : 'Hatchling',
    laidAtEpoch,
    lastVerifiedEpoch,
    lastInteractedEpoch,
    healthMultiplier: clampUnitInterval(raw.healthMultiplier, 1),
    lastTurnedEpoch: toFiniteEpoch(raw.lastTurnedEpoch, laidAtEpoch),
    lastMistedEpoch: toFiniteEpoch(raw.lastMistedEpoch, laidAtEpoch),
    isHatched: raw.isHatched === true,
  };

  if (raw.hatchedAtEpoch !== undefined) {
    pet.hatchedAtEpoch = toFiniteEpoch(raw.hatchedAtEpoch, laidAtEpoch);
  }
  if (typeof raw.lastFedEpoch === 'number') {
    pet.lastFedEpoch = toFiniteEpoch(raw.lastFedEpoch, laidAtEpoch);
  }
  if (typeof raw.lastWeighedEpoch === 'number') {
    pet.lastWeighedEpoch = toFiniteEpoch(raw.lastWeighedEpoch, laidAtEpoch);
  }

  return pet;
}

export function sanitizePetRecord(
  value: unknown,
  nowEpoch = 0
): Record<string, PetInstance> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const pets: Record<string, PetInstance> = {};
  for (const [key, entry] of Object.entries(raw)) {
    const pet = sanitizePetInstance(entry, nowEpoch);
    if (pet) {
      pets[key] = pet.id === key ? pet : { ...pet, id: key };
    }
  }
  return pets;
}
