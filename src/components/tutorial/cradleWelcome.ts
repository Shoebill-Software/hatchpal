/** Covers the hatchery fade, then leaves the room on screen before Pip appears. */
export const HATCHERY_WELCOME_DELAY_MS = 1100;

/**
 * First run, in order:
 * 1. Welcome. The empty nest stays quiet. Pip meets a keeper on the hatchery,
 *    or on the nest when an egg is already home.
 * 2. Adopt (hatchery tip, then pick an egg) or stay on the nest.
 * 3. Coach marks, once that egg is incubating.
 * 4. Done or skip. Those flags persist, so the next launch stays quiet.
 * Replay clears the flags and this same order runs again.
 * Quitting mid-tour does not replay the welcome; coach marks start over at the egg.
 */
export type FirstRunBeat = 'quiet' | 'welcome' | 'adoption-tip' | 'coach-marks';

export type FirstRunInput = {
  hasSeenWelcome: boolean;
  hasCompletedNestTutorial: boolean;
  hasSeenAdoptionTip: boolean;
  /** Active cradle holds an egg or a companion. */
  hasPet: boolean;
  /** Egg is still in the shell, so the tour has something to point at. */
  incubating: boolean;
  surface: 'nest' | 'hatchery';
  /** Settings, ceremony, a cover sheet, or a screen that is not focused. */
  blocked: boolean;
  /** Entrance delay has elapsed. Callers that delay outside this pass true. */
  landed: boolean;
};

export function resolveFirstRun(input: FirstRunInput): FirstRunBeat {
  if (input.blocked || !input.landed) {
    return 'quiet';
  }
  if (!input.hasSeenWelcome) {
    if (input.surface === 'hatchery') {
      return 'welcome';
    }
    return input.hasPet ? 'welcome' : 'quiet';
  }
  if (input.surface === 'hatchery' && !input.hasSeenAdoptionTip) {
    return 'adoption-tip';
  }
  if (input.surface === 'nest' && input.incubating && !input.hasCompletedNestTutorial) {
    return 'coach-marks';
  }
  return 'quiet';
}

/** Pip's nest greeting. The empty cradle never opens it; an egg already at home does. */
export function shouldStartWelcome(input: {
  hasSeenWelcome: boolean;
  hasPet: boolean;
  blocked: boolean;
}): boolean {
  return (
    resolveFirstRun({
      hasSeenWelcome: input.hasSeenWelcome,
      hasCompletedNestTutorial: false,
      hasSeenAdoptionTip: true,
      hasPet: input.hasPet,
      incubating: false,
      surface: 'nest',
      blocked: input.blocked,
      landed: true,
    }) === 'welcome'
  );
}

/** First-run welcome. It waits until the hatchery screen has landed. */
export function shouldStartHatcheryWelcome(input: {
  hasSeenWelcome: boolean;
  landed: boolean;
  blocked: boolean;
}): boolean {
  return (
    resolveFirstRun({
      hasSeenWelcome: input.hasSeenWelcome,
      hasCompletedNestTutorial: false,
      hasSeenAdoptionTip: true,
      hasPet: false,
      incubating: false,
      surface: 'hatchery',
      blocked: input.blocked,
      landed: input.landed,
    }) === 'welcome'
  );
}

/** Pip's one-time hatchery tip, after the welcome and before the nest tour. */
export function shouldShowAdoptionTip(input: {
  hasSeenWelcome: boolean;
  hasSeenAdoptionTip: boolean;
  blocked: boolean;
}): boolean {
  return (
    resolveFirstRun({
      hasSeenWelcome: input.hasSeenWelcome,
      hasCompletedNestTutorial: false,
      hasSeenAdoptionTip: input.hasSeenAdoptionTip,
      hasPet: false,
      incubating: false,
      surface: 'hatchery',
      blocked: input.blocked,
      landed: true,
    }) === 'adoption-tip'
  );
}

/** Nest coach marks. They wait until the welcome is finished and an egg is incubating. */
export function shouldStartNestCoachMarks(input: {
  hasSeenWelcome: boolean;
  hasCompletedNestTutorial: boolean;
  incubating: boolean;
  blocked: boolean;
}): boolean {
  return (
    resolveFirstRun({
      hasSeenWelcome: input.hasSeenWelcome,
      hasCompletedNestTutorial: input.hasCompletedNestTutorial,
      hasSeenAdoptionTip: true,
      hasPet: true,
      incubating: input.incubating,
      surface: 'nest',
      blocked: input.blocked,
      landed: true,
    }) === 'coach-marks'
  );
}
