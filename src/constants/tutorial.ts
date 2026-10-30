import type { TranslationKey } from '@/i18n/en';

/**
 * Controls the nest still mounts after the care HUD.
 * Coach marks may only name these. `egg` and `telemetryHeart` sit on the nest
 * stage; warmth and mist sit on the climate dials; weather and hearts sit on
 * `NestAlmanac`.
 */
export const NEST_ANCHOR = {
  egg: 'egg',
  telemetryHeart: 'telemetry_heart',
  warmControl: 'warm_control',
  mistControl: 'mist_control',
  almanacWeather: 'almanac_weather',
  almanacHearts: 'almanac_hearts',
} as const;

export const TUTORIAL_TARGET_IDS = [
  NEST_ANCHOR.egg,
  NEST_ANCHOR.telemetryHeart,
  NEST_ANCHOR.warmControl,
  NEST_ANCHOR.mistControl,
  NEST_ANCHOR.almanacWeather,
  NEST_ANCHOR.almanacHearts,
] as const;

export type TutorialTargetId = (typeof TUTORIAL_TARGET_IDS)[number];

/** Pip's face for a line of dialogue. */
export type PipMood = 'talk' | 'happy' | 'wow' | 'wink';

/** Interactive steps wait for the player to actually do the thing. */
export type TutorialAction = 'egg_taps' | 'brood' | 'mist';

export type NestTutorialStepId =
  | 'hello'
  | 'heart'
  | 'warmth'
  | 'moisture'
  | 'weather'
  | 'hearts'
  | 'stakes'
  | 'candling'
  | 'finale';

export type NestTutorialStep = {
  id: NestTutorialStepId;
  /** Null centers the card with no spotlight. */
  target: TutorialTargetId | null;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  rim: string;
  mood: PipMood;
  waitFor?: TutorialAction;
};

/** The hands-on nest tour that follows Pip's welcome. */
export const NEST_TUTORIAL_STEPS: readonly NestTutorialStep[] = [
  {
    id: 'hello',
    target: 'egg',
    titleKey: 'tutorial.hello.title',
    bodyKey: 'tutorial.hello.body',
    rim: '#E4C07A',
    mood: 'happy',
    waitFor: 'egg_taps',
  },
  {
    id: 'heart',
    target: 'telemetry_heart',
    titleKey: 'tutorial.heart.title',
    bodyKey: 'tutorial.heart.body',
    rim: '#C45B5B',
    mood: 'talk',
  },
  {
    id: 'warmth',
    target: 'warm_control',
    titleKey: 'tutorial.warm.title',
    bodyKey: 'tutorial.warm.body',
    rim: '#E2B15C',
    mood: 'wow',
    waitFor: 'brood',
  },
  {
    id: 'moisture',
    target: 'mist_control',
    titleKey: 'tutorial.mist.title',
    bodyKey: 'tutorial.mist.body',
    rim: '#7EB6C9',
    mood: 'talk',
    waitFor: 'mist',
  },
  {
    id: 'weather',
    target: 'almanac_weather',
    titleKey: 'tutorial.weather.title',
    bodyKey: 'tutorial.weather.body',
    rim: '#9DB8D6',
    mood: 'wink',
  },
  {
    id: 'hearts',
    target: 'almanac_hearts',
    titleKey: 'tutorial.hearts.title',
    bodyKey: 'tutorial.hearts.body',
    rim: '#E58A9A',
    mood: 'happy',
  },
  {
    id: 'stakes',
    target: 'telemetry_heart',
    titleKey: 'tutorial.stakes.title',
    bodyKey: 'tutorial.stakes.body',
    rim: '#C45B5B',
    mood: 'talk',
  },
  {
    id: 'candling',
    target: 'egg',
    titleKey: 'tutorial.candle.title',
    bodyKey: 'tutorial.candle.body',
    rim: '#F6E2B8',
    mood: 'wow',
  },
  {
    id: 'finale',
    target: null,
    titleKey: 'tutorial.finale.title',
    bodyKey: 'tutorial.finale.body',
    rim: '#E4C07A',
    mood: 'happy',
  },
];

export const NEST_TUTORIAL_STEP_COUNT = NEST_TUTORIAL_STEPS.length;

/** Taps on the shell that complete the hello step. */
export const TUTORIAL_HELLO_TAPS = 3;

/** Waits out the nest landing motion before the first spotlight appears. */
export const TUTORIAL_ENTRANCE_DELAY_MS = 1100;

/** Lets the settings sheet finish dismissing before a replay begins. */
export const TUTORIAL_REPLAY_DELAY_MS = 720;

export const TUTORIAL_REDUCED_DELAY_MS = 280;

/**
 * How long a coach mark waits for `measureInWindow` before it stops covering the nest.
 * Longer than the overlay's late remeasure, so a slow layout can still land a hole.
 */
export const TUTORIAL_MEASURE_GRACE_MS = 480;

/** A dry nest cannot mist, so that step must not wait on a control that does nothing. */
export function tutorialActionAvailable(action: TutorialAction, nest: { canMist: boolean }): boolean {
  return action !== 'mist' || nest.canMist;
}

/** Glide between spotlight holes. */
export const SPOTLIGHT_MOVE_MS = 520;

export const SPOTLIGHT_VEIL = 'rgba(14, 14, 16, 0.74)';

export const SPOTLIGHT_PADDING: Record<TutorialTargetId, number> = {
  egg: 18,
  telemetry_heart: 12,
  warm_control: 12,
  mist_control: 12,
  almanac_weather: 8,
  almanac_hearts: 8,
};

export const TUTORIAL_CARD_MAX_WIDTH = 420;
export const TUTORIAL_CARD_GAP = 16;
export const TUTORIAL_CARD_MARGIN = 20;

/** Characters per second for Pip's typewriter. */
export const PIP_TYPE_RATE = 42;

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
