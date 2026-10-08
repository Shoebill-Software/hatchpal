import { Appearance } from 'react-native';
import { useSyncExternalStore } from 'react';

import {
  registerAppearanceApplier,
  usePreferencesStore,
  type AppearancePreference,
} from '@/store/usePreferencesStore';

export type ResolvedScheme = 'light' | 'dark';

let systemScheme: ResolvedScheme = 'light';
let overriding: AppearancePreference = 'system';
let revision = 0;
let bound = false;
const listeners = new Set<() => void>();

function emit(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

function readDeviceScheme(): ResolvedScheme | null {
  try {
    const scheme = Appearance.getColorScheme();
    if (scheme === 'light' || scheme === 'dark') {
      return scheme;
    }
  } catch {
    return null;
  }
  return null;
}

const detected = readDeviceScheme();
if (detected) {
  systemScheme = detected;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getRevision(): number {
  return revision;
}

export function applyAppearancePreference(preference: AppearancePreference): void {
  overriding = preference;
  try {
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
  } catch {
    // react-native-web has no setter. The React tree still follows the preference.
  }

  if (preference === 'system') {
    const scheme = readDeviceScheme();
    if (scheme) {
      systemScheme = scheme;
    }
  }

  const root = (
    globalThis as { document?: { documentElement: { style: { colorScheme: string } } } }
  ).document;
  if (root) {
    const resolved = preference === 'system' ? systemScheme : preference;
    root.documentElement.style.colorScheme = resolved;
  }

  emit();
}

function bindAppearance(): void {
  if (bound) {
    return;
  }
  bound = true;

  try {
    Appearance.addChangeListener(({ colorScheme }) => {
      if (overriding !== 'system') {
        return;
      }
      if (colorScheme !== 'light' && colorScheme !== 'dark') {
        return;
      }
      if (colorScheme === systemScheme) {
        return;
      }
      systemScheme = colorScheme;
      emit();
    });
  } catch {
    // Appearance events are unavailable outside a device runtime.
  }

  registerAppearanceApplier(applyAppearancePreference);
  usePreferencesStore.persist.onFinishHydration(() => {
    applyAppearancePreference(usePreferencesStore.getState().appearance);
  });
}

bindAppearance();

export function useAppColorScheme(): ResolvedScheme {
  const preference = usePreferencesStore((state) => state.appearance);
  const currentRevision = useSyncExternalStore(subscribe, getRevision, getRevision);
  void currentRevision;
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme;
}
