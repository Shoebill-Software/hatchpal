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
  it('starts from the sensory, language, and notification defaults', () => {
    const store = createPreferencesStoreApi();
    expect(store.getState().localeOverride).toBe(DEFAULT_PREFERENCES.localeOverride);
    expect(store.getState().soundEnabled).toBe(true);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState().localeOverride).toBe('system');
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
    expect(second.getState().localeOverride).toBe('system');
  });

  it('updates and persists the language override', () => {
    const storage = createMemoryStateStorage();
    const first = createPreferencesStoreApi({ storage });
    first.getState().setLocaleOverride('de');
    expect(first.getState().localeOverride).toBe('de');

    const second = createPreferencesStoreApi({ storage });
    expect(second.getState().localeOverride).toBe('de');
    expect(second.getState().soundEnabled).toBe(true);

    second.getState().setLocaleOverride('en');
    const third = createPreferencesStoreApi({ storage });
    expect(third.getState().localeOverride).toBe('en');
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
    expect(store.getState().localeOverride).toBe('system');
    expect(store.getState().soundEnabled).toBe(false);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });
});
