import { useEffect, useState } from 'react';

import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAppColorScheme } from '@/theme/colorScheme';

/**
 * Static web rendering does not know the device scheme yet.
 * An explicit Light or Dark choice is stable across that first paint.
 */
export function useColorScheme(): 'light' | 'dark' {
  const preference = usePreferencesStore((state) => state.appearance);
  const scheme = useAppColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready && preference === 'system') {
    return 'light';
  }

  return scheme;
}
