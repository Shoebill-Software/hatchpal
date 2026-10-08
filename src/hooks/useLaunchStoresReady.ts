import { useEffect, useState } from 'react';

import { usePetStore } from '@/store/usePetStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export function usePreferencesHydrated(): boolean {
  const [preferencesReady, setPreferencesReady] = useState(() => usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = usePreferencesStore.persist.onFinishHydration(() => {
      setPreferencesReady(true);
    });
    if (usePreferencesStore.persist.hasHydrated()) {
      setPreferencesReady(true);
    }
    return unsubscribe;
  }, []);

  return preferencesReady;
}

/**
 * True once both MMKV-backed stores have finished rehydration.
 * The native splash stays up until this flips, so a stored pet cannot flash as an empty nest.
 */
export function useLaunchStoresReady(): boolean {
  const petReady = usePetStore((state) => state.hasHydrated);
  const preferencesReady = usePreferencesHydrated();
  return petReady && preferencesReady;
}
