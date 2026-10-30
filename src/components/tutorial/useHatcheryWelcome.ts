import { useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';

import { usePreferencesHydrated } from '@/hooks/useLaunchStoresReady';
import { usePreferencesStore } from '@/store/usePreferencesStore';

import { HATCHERY_WELCOME_DELAY_MS, shouldStartHatcheryWelcome } from './cradleWelcome';

/** True once the hatchery is on screen and Pip's first-run welcome may open. */
export function useHatcheryWelcome(blocked: boolean): boolean {
  const focused = useIsFocused();
  const preferencesReady = usePreferencesHydrated();
  const hasSeenWelcome = usePreferencesStore((state) => state.hasSeenWelcome);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (hasSeenWelcome) {
      setLanded(false);
      return;
    }
    if (!focused || blocked) {
      return;
    }
    const timer = setTimeout(() => setLanded(true), HATCHERY_WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [blocked, focused, hasSeenWelcome]);

  return shouldStartHatcheryWelcome({
    hasSeenWelcome,
    landed,
    blocked: blocked || !preferencesReady || !focused,
  });
}
