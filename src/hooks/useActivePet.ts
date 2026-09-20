import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getSpeciesConfig } from '@/data/species';
import { resolvePetSnapshot } from '@/domain/timeEngine';
import type {
  PetInstance,
  PetInteractionKind,
  PetSnapshot,
  SpeciesConfig,
  SpeciesId,
} from '@/domain/types';
import { getActivePetFromStore, usePetStore } from '@/store/usePetStore';
import { PET_CLOCK_TICK_INTERVAL_MS, subscribePetClockLifecycle } from './petClockLifecycle';

export type ActivePetView = {
  pet: PetInstance | null;
  species: SpeciesConfig | null;
  snapshot: PetSnapshot | null;
  hasHydrated: boolean;
  nowEpoch: number;
  isClockTampered: boolean;
  adoptPet: (speciesId: SpeciesId | string, nickname: string, nowEpoch?: number) => PetInstance;
  recordInteraction: (kind: PetInteractionKind, nowEpoch?: number) => void;
};

export function useActivePet(): ActivePetView {
  const hasHydrated = usePetStore((state) => state.hasHydrated);
  const activePetId = usePetStore((state) => state.activePetId);
  const pet = usePetStore((state) => {
    if (!state.activePetId) {
      return null;
    }
    return state.pets[state.activePetId] ?? null;
  });
  const refreshClock = usePetStore((state) => state.refreshClock);
  const syncHatchState = usePetStore((state) => state.syncHatchState);
  const adoptPet = usePetStore((state) => state.adoptPet);
  const recordInteraction = usePetStore((state) => state.recordInteraction);

  const [nowEpoch, setNowEpoch] = useState(() => Date.now());

  const pushDisplayClock = useCallback(
    (mode: 'resume' | 'tick'): void => {
      refreshClock(mode);
      syncHatchState();
      setNowEpoch(Date.now());
    },
    [refreshClock, syncHatchState]
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasHydrated || !activePetId) {
        return;
      }
      pushDisplayClock('resume');
    }, [activePetId, hasHydrated, pushDisplayClock])
  );

  useEffect(() => {
    if (!hasHydrated || !activePetId) {
      return;
    }

    return subscribePetClockLifecycle({
      intervalMs: PET_CLOCK_TICK_INTERVAL_MS,
      shouldTick: () => getActivePetFromStore() != null,
      onForeground: () => pushDisplayClock('resume'),
      onTick: () => pushDisplayClock('tick'),
      addAppStateListener: (listener) => {
        const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
          listener(status);
        });
        return () => {
          subscription.remove();
        };
      },
    });
  }, [hasHydrated, activePetId, pushDisplayClock]);

  const species = useMemo(() => {
    if (!pet) {
      return null;
    }
    return getSpeciesConfig(pet.speciesId);
  }, [pet]);

  const snapshot = useMemo(() => {
    if (!pet || !species) {
      return null;
    }
    return resolvePetSnapshot(pet, species, nowEpoch);
  }, [pet, species, nowEpoch]);

  return {
    pet,
    species,
    snapshot,
    hasHydrated,
    nowEpoch,
    isClockTampered: snapshot?.isClockTampered ?? false,
    adoptPet,
    recordInteraction,
  };
}
