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
    expect(store.getState().appearance).toBe('system');
    expect(store.getState().soundEnabled).toBe(true);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState().hasCompletedNestTutorial).toBe(false);
    expect(store.getState().isTutorialActive).toBe(false);
    expect(store.getState().currentTutorialStep).toBe(0);
    expect(store.getState()).toMatchObject(DEFAULT_PREFERENCES);
    expect(store.getState()).not.toHaveProperty('localeOverride');
  });

  it('updates and persists sensory toggles', () => {
    const storage = createMemoryStateStorage();
    const first = createPreferencesStoreApi({ storage });
    first.getState().setAppearance('light');
    first.getState().setSoundEnabled(false);
    first.getState().setHapticsEnabled(false);
    void first.getState().setNotificationsEnabled(false);

    expect(first.getState().appearance).toBe('light');
    expect(first.getState().soundEnabled).toBe(false);
    expect(first.getState().hapticsEnabled).toBe(false);
    expect(first.getState().notificationsEnabled).toBe(false);

    const second = createPreferencesStoreApi({ storage });
    expect(second.getState().appearance).toBe('light');
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
          appearance: 'sepia',
        },
        version: 1,
      })
    );

    const store = createPreferencesStoreApi({ storage });
    expect(store.getState().appearance).toBe('system');
    expect(store.getState().soundEnabled).toBe(false);
    expect(store.getState().hapticsEnabled).toBe(true);
    expect(store.getState().notificationsEnabled).toBe(true);
    expect(store.getState().hasCompletedNestTutorial).toBe(false);
    expect(store.getState()).not.toHaveProperty('localeOverride');
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ hasCompletedNestTutorial: 'yes' }).hasCompletedNestTutorial).toBe(false);
  });

  it('runs the nest tour once, then remembers completion in storage', () => {
    const storage = createMemoryStateStorage();
    const first = createPreferencesStoreApi({ storage });

    expect(first.getState().isTutorialActive).toBe(false);
    first.getState().nextTutorialStep();
    first.getState().previousTutorialStep();
    expect(first.getState().currentTutorialStep).toBe(0);
    expect(first.getState().isTutorialActive).toBe(false);

    first.getState().startNestTutorial();
    expect(first.getState().isTutorialActive).toBe(true);
    expect(first.getState().currentTutorialStep).toBe(0);

    first.getState().nextTutorialStep();
    expect(first.getState().currentTutorialStep).toBe(1);
    first.getState().previousTutorialStep();
    expect(first.getState().currentTutorialStep).toBe(0);
    first.getState().previousTutorialStep();
    expect(first.getState().currentTutorialStep).toBe(0);

    first.getState().nextTutorialStep();
    first.getState().nextTutorialStep();
    first.getState().nextTutorialStep();
    first.getState().nextTutorialStep();
    expect(first.getState().currentTutorialStep).toBe(4);
    expect(first.getState().isTutorialActive).toBe(true);
    first.getState().nextTutorialStep();
    expect(first.getState().isTutorialActive).toBe(false);
    expect(first.getState().hasCompletedNestTutorial).toBe(true);

    const raw = storage.getItem(PREFERENCES_STORE_PERSIST_KEY);
    expect(typeof raw).toBe('string');
    const persisted = JSON.parse(String(raw)) as { state: Record<string, unknown> };
    expect(persisted.state.hasCompletedNestTutorial).toBe(true);
    expect(persisted.state.isTutorialActive).toBeUndefined();
    expect(persisted.state.currentTutorialStep).toBeUndefined();

    const restored = createPreferencesStoreApi({ storage });
    expect(restored.getState().hasCompletedNestTutorial).toBe(true);
    expect(restored.getState().isTutorialActive).toBe(false);
    expect(restored.getState().currentTutorialStep).toBe(0);

    restored.getState().resetTutorial();
    expect(restored.getState().hasCompletedNestTutorial).toBe(false);
    expect(restored.getState().soundEnabled).toBe(true);

    const afterReset = createPreferencesStoreApi({ storage });
    expect(afterReset.getState().hasCompletedNestTutorial).toBe(false);
  });

  it('skip and complete both persist the tour, and suspend does not', () => {
    const storage = createMemoryStateStorage();
    const skipped = createPreferencesStoreApi({ storage });
    skipped.getState().startNestTutorial();
    skipped.getState().nextTutorialStep();
    skipped.getState().skipTutorial();
    expect(skipped.getState().isTutorialActive).toBe(false);
    expect(skipped.getState().hasCompletedNestTutorial).toBe(true);

    skipped.getState().resetTutorial();
    skipped.getState().startNestTutorial();
    skipped.getState().nextTutorialStep();
    skipped.getState().suspendNestTutorial();
    expect(skipped.getState().isTutorialActive).toBe(false);
    expect(skipped.getState().currentTutorialStep).toBe(0);
    expect(skipped.getState().hasCompletedNestTutorial).toBe(false);

    skipped.getState().startNestTutorial();
    skipped.getState().completeTutorial();
    expect(createPreferencesStoreApi({ storage }).getState().hasCompletedNestTutorial).toBe(true);
  });
});
