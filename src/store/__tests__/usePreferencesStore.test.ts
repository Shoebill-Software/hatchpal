jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map<string, string>();
    return {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string | number | boolean) => {
        values.set(key, String(value));
      },
      remove: (key: string) => {
        values.delete(key);
        return true;
      },
    };
  },
}));

import { createMemoryStateStorage } from '@/store/createPetStore';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORE_PERSIST_KEY,
  createPreferencesStoreApi,
  sanitizePreferences,
} from '@/store/usePreferencesStore';

describe('Preferences store', () => {
  it('starts from the sensory and notification defaults', () => {
    const store = createPreferencesStoreApi();
    expect(store.getState().soundEnabled).toBe(true);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState()).toMatchObject(DEFAULT_PREFERENCES);
    expect(store.getState()).not.toHaveProperty('localeOverride');
  });

  it('updates and persists sensory toggles', () => {
    const storage = createMemoryStateStorage();
    const first = createPreferencesStoreApi({ storage });
    first.getState().setSoundEnabled(false);
    first.getState().setHapticsEnabled(false);
    void first.getState().setNotificationsEnabled(false);

    expect(first.getState().soundEnabled).toBe(false);
    expect(first.getState().hapticsEnabled).toBe(false);
    expect(first.getState().notificationsEnabled).toBe(false);

    const second = createPreferencesStoreApi({ storage });
    expect(second.getState().soundEnabled).toBe(false);
    expect(second.getState().hapticsEnabled).toBe(false);
    expect(second.getState().notificationsEnabled).toBe(false);
    expect(second.getState()).not.toHaveProperty('localeOverride');
  });

  it('drops a previously persisted language override', () => {
    const storage = createMemoryStateStorage();
    storage.setItem(
      PREFERENCES_STORE_PERSIST_KEY,
      JSON.stringify({
        state: {
          localeOverride: 'de',
          soundEnabled: false,
          hapticsEnabled: true,
          notificationsEnabled: true,
        },
        version: 1,
      })
    );

    const store = createPreferencesStoreApi({ storage });
    expect(store.getState().soundEnabled).toBe(false);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState()).not.toHaveProperty('localeOverride');
  });

  it('drops corrupt persisted fields back to safe defaults', () => {
    const storage = createMemoryStateStorage();
    storage.setItem(
      PREFERENCES_STORE_PERSIST_KEY,
      JSON.stringify({
        state: {
          localeOverride: 'fr',
          soundEnabled: false,
          hapticsEnabled: 'loud',
          notificationsEnabled: 1,
        },
        version: 1,
      })
    );

    const store = createPreferencesStoreApi({ storage });
    expect(store.getState().soundEnabled).toBe(false);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState()).not.toHaveProperty('localeOverride');
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });
});
