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

import { resolveFirstRun, type FirstRunInput } from '@/components/tutorial/cradleWelcome';
import { NEST_TUTORIAL_STEP_COUNT } from '@/constants/tutorial';
import { createMemoryStateStorage } from '@/store/createPetStore';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORE_PERSIST_KEY,
  PREFERENCES_STORE_PERSIST_VERSION,
  createPreferencesStoreApi,
  migratePreferences,
  sanitizePreferences,
} from '@/store/usePreferencesStore';

const openNest: FirstRunInput = {
  hasSeenWelcome: false,
  hasCompletedNestTutorial: false,
  hasSeenAdoptionTip: false,
  hasPet: true,
  incubating: true,
  surface: 'nest',
  blocked: false,
  landed: true,
};

function beat(
  flags: Pick<FirstRunInput, 'hasSeenWelcome' | 'hasCompletedNestTutorial' | 'hasSeenAdoptionTip'>,
  scene: FirstRunInput
) {
  return resolveFirstRun({
    ...scene,
    hasSeenWelcome: flags.hasSeenWelcome,
    hasCompletedNestTutorial: flags.hasCompletedNestTutorial,
    hasSeenAdoptionTip: flags.hasSeenAdoptionTip,
  });
}

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

    for (let step = 1; step < NEST_TUTORIAL_STEP_COUNT; step += 1) {
      first.getState().nextTutorialStep();
    }
    expect(first.getState().currentTutorialStep).toBe(NEST_TUTORIAL_STEP_COUNT - 1);
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

  it("persists Pip's welcome and hatchery tip, and Replay brings everything back", () => {
    const storage = createMemoryStateStorage();
    const first = createPreferencesStoreApi({ storage });
    expect(first.getState().hasSeenWelcome).toBe(false);
    expect(first.getState().hasSeenAdoptionTip).toBe(false);

    first.getState().completeWelcome();
    first.getState().markAdoptionTipSeen();
    first.getState().startNestTutorial();
    first.getState().completeTutorial();

    const second = createPreferencesStoreApi({ storage });
    expect(second.getState().hasSeenWelcome).toBe(true);
    expect(second.getState().hasSeenAdoptionTip).toBe(true);
    expect(second.getState().hasCompletedNestTutorial).toBe(true);

    second.getState().replayTutorial();
    const third = createPreferencesStoreApi({ storage });
    expect(third.getState().hasSeenWelcome).toBe(false);
    expect(third.getState().hasSeenAdoptionTip).toBe(false);
    expect(third.getState().hasCompletedNestTutorial).toBe(false);
  });

  it('skipping the welcome skips every tutorial at once', () => {
    const store = createPreferencesStoreApi();
    store.getState().startNestTutorial();
    store.getState().skipAllTutorials();
    expect(store.getState()).toMatchObject({
      hasSeenWelcome: true,
      hasCompletedNestTutorial: true,
      hasSeenAdoptionTip: true,
      isTutorialActive: false,
    });
  });

  it('shows the new tutorial once to keepers who finished the old one', () => {
    const storage = createMemoryStateStorage();
    storage.setItem(
      PREFERENCES_STORE_PERSIST_KEY,
      JSON.stringify({ state: { soundEnabled: false, hasCompletedNestTutorial: true }, version: 4 })
    );
    const store = createPreferencesStoreApi({ storage });
    expect(store.getState().soundEnabled).toBe(false);
    expect(store.getState().hasCompletedNestTutorial).toBe(false);
    expect(store.getState().hasSeenWelcome).toBe(false);
    expect(store.getState().hasSeenAdoptionTip).toBe(false);
    expect(
      resolveFirstRun({
        ...openNest,
        hasSeenWelcome: store.getState().hasSeenWelcome,
        hasCompletedNestTutorial: store.getState().hasCompletedNestTutorial,
        hasSeenAdoptionTip: store.getState().hasSeenAdoptionTip,
      })
    ).toBe('welcome');

    const current = migratePreferences(
      { hasSeenWelcome: true, hasCompletedNestTutorial: true, hasSeenAdoptionTip: true },
      PREFERENCES_STORE_PERSIST_VERSION
    );
    expect(current.hasSeenWelcome).toBe(true);
    expect(current.hasCompletedNestTutorial).toBe(true);
    expect(current.hasSeenAdoptionTip).toBe(true);
  });

  it('keeps skip, finish, and replay across a relaunch', () => {
    const storage = createMemoryStateStorage();
    const cold = createPreferencesStoreApi({ storage });
    expect(beat(cold.getState(), { ...openNest, hasPet: false, incubating: false })).toBe('quiet');
    expect(beat(cold.getState(), { ...openNest, surface: 'hatchery', hasPet: false, incubating: false })).toBe('welcome');

    cold.getState().completeWelcome();
    const welcomed = createPreferencesStoreApi({ storage });
    expect(welcomed.getState().hasSeenWelcome).toBe(true);
    expect(welcomed.getState().hasCompletedNestTutorial).toBe(false);
    expect(beat(welcomed.getState(), { ...openNest, surface: 'hatchery' })).toBe('adoption-tip');
    expect(beat(welcomed.getState(), openNest)).toBe('coach-marks');

    welcomed.getState().markAdoptionTipSeen();
    welcomed.getState().startNestTutorial();
    welcomed.getState().skipTutorial();
    const skipped = createPreferencesStoreApi({ storage });
    expect(skipped.getState().isTutorialActive).toBe(false);
    expect(skipped.getState().hasSeenWelcome).toBe(true);
    expect(skipped.getState().hasCompletedNestTutorial).toBe(true);
    expect(beat(skipped.getState(), openNest)).toBe('quiet');

    skipped.getState().replayTutorial();
    const replayed = createPreferencesStoreApi({ storage });
    expect(replayed.getState().hasSeenWelcome).toBe(false);
    expect(replayed.getState().hasSeenAdoptionTip).toBe(false);
    expect(replayed.getState().hasCompletedNestTutorial).toBe(false);
    expect(replayed.getState().isTutorialActive).toBe(false);
    expect(beat(replayed.getState(), openNest)).toBe('welcome');

    replayed.getState().skipAllTutorials();
    const dismissed = createPreferencesStoreApi({ storage });
    expect(beat(dismissed.getState(), openNest)).toBe('quiet');
    expect(beat(dismissed.getState(), { ...openNest, surface: 'hatchery' })).toBe('quiet');
  });

  it('only records tutorial signals while the tour is running, and clears them between steps', () => {
    const store = createPreferencesStoreApi();
    store.getState().signalTutorial('egg_taps');
    expect(store.getState().tutorialSignal).toBeNull();

    store.getState().startNestTutorial();
    store.getState().signalTutorial('brood', 'perfect');
    const first = store.getState().tutorialSignal;
    expect(first).toMatchObject({ action: 'brood', detail: 'perfect' });
    store.getState().signalTutorial('brood', 'perfect');
    expect(store.getState().tutorialSignal?.nonce).not.toBe(first?.nonce);

    store.getState().nextTutorialStep();
    expect(store.getState().tutorialSignal).toBeNull();
  });
});
