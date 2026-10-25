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
import { publishWidgetForPet } from '@/services/widgetBridge';
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
  adoptEggInNewCradle: (
    speciesId: SpeciesId | string,
    nickname: string,
    nowEpoch?: number
  ) => PetInstance | null;
  cradles: PetInstance[];
  activePetIndex: number;
  switchCradle: (index: number) => void;
  abandonActivePet: () => void;
  recordInteraction: (kind: PetInteractionKind, nowEpoch?: number) => void;
  markHatched: (nowEpoch?: number) => void;
};

export function useActivePet(): ActivePetView {
  const hasHydrated = usePetStore((state) => state.hasHydrated);
  const activePetId = usePetStore((state) => state.activePetId);
  const pet = usePetStore((state) => state.activePet);
  const cradleOrder = usePetStore((state) => state.cradleOrder);
  const petMap = usePetStore((state) => state.pets);
  const activePetIndex = usePetStore((state) => state.activePetIndex);
  const refreshClock = usePetStore((state) => state.refreshClock);
  const adoptPet = usePetStore((state) => state.adoptPet);
  const adoptEggInNewCradle = usePetStore((state) => state.adoptEggInNewCradle);
  const switchCradle = usePetStore((state) => state.switchCradle);
  const abandonActivePet = usePetStore((state) => state.abandonActivePet);
  const cradles = useMemo(
    () =>
      cradleOrder.flatMap((id) => {
        const cradle = petMap[id];
        return cradle ? [cradle] : [];
      }),
    [cradleOrder, petMap]
  );
  const recordInteraction = usePetStore((state) => state.recordInteraction);
  const markHatched = usePetStore((state) => state.markHatched);

  const [nowEpoch, setNowEpoch] = useState(() => Date.now());

  const pushDisplayClock = useCallback(
    (mode: 'resume' | 'tick'): void => {
      refreshClock(mode);
      setNowEpoch(Date.now());
    },
    [refreshClock]
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

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      const leftForeground = previous === 'active' || previous === 'inactive';
      previous = status;
      if (!leftForeground || status !== 'background') {
        return;
      }
      const state = usePetStore.getState();
      if (!state.hasHydrated) {
        return;
      }
      publishWidgetForPet(getActivePetFromStore(), Date.now(), { reload: true });
    });
    return () => {
      subscription.remove();
    };
  }, []);

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
    adoptEggInNewCradle,
    cradles,
    activePetIndex,
    switchCradle,
    abandonActivePet,
    recordInteraction,
    markHatched,
  };
}
