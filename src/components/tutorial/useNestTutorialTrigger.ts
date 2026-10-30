import { useEffect, useRef } from 'react';

import { tutorialStartDelay } from '@/constants/tutorial';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { usePreferencesHydrated } from '@/hooks/useLaunchStoresReady';
import { usePreferencesStore } from '@/store/usePreferencesStore';

import { shouldStartNestCoachMarks } from './cradleWelcome';

/**
 * Opens the nest tour once Pip's welcome is done and an egg is incubating, and again after Replay.
 * An already-settled nest waits only long enough for the settings sheet to dismiss.
 */
export function useNestTutorialTrigger(input: {
  incubating: boolean;
  blocked: boolean;
  shouldSuspend: boolean;
}): void {
  const { incubating, blocked, shouldSuspend } = input;
  const preferencesReady = usePreferencesHydrated();
  const reduceMotion = useReduceMotion();
  const hasSeenWelcome = usePreferencesStore((state) => state.hasSeenWelcome);
  const hasCompleted = usePreferencesStore((state) => state.hasCompletedNestTutorial);
  const isActive = usePreferencesStore((state) => state.isTutorialActive);
  const suspendNestTutorial = usePreferencesStore((state) => state.suspendNestTutorial);
  const settled = useRef(false);

  useEffect(() => {
    if (!incubating) {
      settled.current = false;
      return;
    }
    const timer = setTimeout(() => {
      settled.current = true;
    }, tutorialStartDelay(false, reduceMotion));
    return () => {
      clearTimeout(timer);
    };
  }, [incubating, reduceMotion]);

  useEffect(() => {
    if (!isActive || !shouldSuspend) {
      return;
    }
    suspendNestTutorial();
  }, [isActive, shouldSuspend, suspendNestTutorial]);

  useEffect(() => {
    const eligible = shouldStartNestCoachMarks({
      hasSeenWelcome,
      hasCompletedNestTutorial: hasCompleted,
      incubating,
      blocked,
    });
    if (!preferencesReady || !eligible || isActive) {
      return;
    }
    const delay = tutorialStartDelay(settled.current, reduceMotion);
    const timer = setTimeout(() => {
      const state = usePreferencesStore.getState();
      if (!state.hasSeenWelcome || state.hasCompletedNestTutorial || state.isTutorialActive) {
        return;
      }
      state.startNestTutorial();
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [blocked, hasCompleted, hasSeenWelcome, incubating, isActive, preferencesReady, reduceMotion]);
}
