import { Redirect, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useState } from 'react';

import { usePetStore } from '@/store/usePetStore';

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return null;
}

/** Opens the nest on the cradle named by `hatchpal://cradle/<petId>`. */
export default function CradleLinkScreen() {
  const params = useLocalSearchParams<{ petId?: string | string[] }>();
  const hasHydrated = usePetStore((state) => state.hasHydrated);
  const [focused, setFocused] = useState(false);
  const petId = firstParam(params.petId);

  useLayoutEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (petId && usePetStore.getState().pets[petId]) {
      usePetStore.getState().setActivePet(petId);
    }
    setFocused(true);
  }, [hasHydrated, petId]);

  if (!hasHydrated || !focused) {
    return null;
  }

  return <Redirect href="/(tabs)" />;
}
