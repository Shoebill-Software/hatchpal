import type { TranslationKey } from '@/i18n/en';

export const TUTORIAL_TARGET_IDS = ['egg', 'telemetry_heart', 'warm_control', 'mist_control'] as const;

export type TutorialTargetId = (typeof TUTORIAL_TARGET_IDS)[number];

export type NestTutorialStepId = 'egg' | 'heart' | 'warmth' | 'moisture' | 'candling';

export type NestTutorialStep = {
  id: NestTutorialStepId;
  target: TutorialTargetId;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  rim: string;
};

/** Ordered coach marks for the first incubation. Step index is 0 through 4. */
export const NEST_TUTORIAL_STEPS: readonly NestTutorialStep[] = [
  {
    id: 'egg',
    target: 'egg',
    titleKey: 'tutorial.egg.title',
    bodyKey: 'tutorial.egg.body',
    rim: '#E4C07A',
  },
  {
    id: 'heart',
    target: 'telemetry_heart',
    titleKey: 'tutorial.heart.title',
    bodyKey: 'tutorial.heart.body',
    rim: '#C45B5B',
  },
  {
    id: 'warmth',
    target: 'warm_control',
    titleKey: 'tutorial.warm.title',
    bodyKey: 'tutorial.warm.body',
    rim: '#E2B15C',
  },
  {
    id: 'moisture',
    target: 'mist_control',
    titleKey: 'tutorial.mist.title',
    bodyKey: 'tutorial.mist.body',
    rim: '#7EB6C9',
  },
  {
    id: 'candling',
    target: 'egg',
    titleKey: 'tutorial.candle.title',
    bodyKey: 'tutorial.candle.body',
    rim: '#F6E2B8',
  },
];

export const NEST_TUTORIAL_STEP_COUNT = NEST_TUTORIAL_STEPS.length;

/** Waits out the nest landing motion before the first spotlight appears. */
export const TUTORIAL_ENTRANCE_DELAY_MS = 1100;

/** Lets the settings sheet finish dismissing before a replay begins. */
export const TUTORIAL_REPLAY_DELAY_MS = 720;

export const TUTORIAL_REDUCED_DELAY_MS = 280;

/** Glide between spotlight holes. */
export const SPOTLIGHT_MOVE_MS = 520;

export const SPOTLIGHT_VEIL = 'rgba(14, 14, 16, 0.78)';

export const SPOTLIGHT_PADDING: Record<TutorialTargetId, number> = {
  egg: 18,
  telemetry_heart: 12,
  warm_control: 12,
  mist_control: 12,
};

export const TUTORIAL_CARD_MAX_WIDTH = 420;
export const TUTORIAL_CARD_GAP = 16;
export const TUTORIAL_CARD_MARGIN = 20;

export function clampTutorialStep(step: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }
  const index = Math.floor(step);
  if (index <= 0) {
    return 0;
  }
  if (index >= NEST_TUTORIAL_STEP_COUNT) {
    return NEST_TUTORIAL_STEP_COUNT - 1;
  }
  return index;
}

export function tutorialStartDelay(settled: boolean, reduceMotion: boolean): number {
  if (reduceMotion) {
    return TUTORIAL_REDUCED_DELAY_MS;
  }
  return settled ? TUTORIAL_REPLAY_DELAY_MS : TUTORIAL_ENTRANCE_DELAY_MS;
}
