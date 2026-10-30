import {
  resolveFirstRun,
  shouldShowAdoptionTip,
  shouldStartHatcheryWelcome,
  shouldStartNestCoachMarks,
  shouldStartWelcome,
  type FirstRunInput,
} from '../cradleWelcome';

describe('cradle welcome', () => {
  const idle = { hasSeenWelcome: false, hasPet: false, blocked: false };

  it('stays off the empty cradle', () => {
    expect(shouldStartWelcome(idle)).toBe(false);
  });

  it('still greets a keeper who already has an egg', () => {
    expect(shouldStartWelcome({ ...idle, hasPet: true })).toBe(true);
  });

  it('stays down once the welcome is done or the nest is covered', () => {
    expect(shouldStartWelcome({ ...idle, hasPet: true, hasSeenWelcome: true })).toBe(false);
    expect(shouldStartWelcome({ ...idle, hasPet: true, blocked: true })).toBe(false);
  });
});

describe('hatchery welcome', () => {
  const waiting = { hasSeenWelcome: false, landed: false, blocked: false };

  it('starts only after the hatchery has landed', () => {
    expect(shouldStartHatcheryWelcome(waiting)).toBe(false);
    expect(shouldStartHatcheryWelcome({ ...waiting, landed: true })).toBe(true);
  });

  it('stays down once the welcome is done or the hatchery is covered', () => {
    expect(shouldStartHatcheryWelcome({ ...waiting, landed: true, hasSeenWelcome: true })).toBe(false);
    expect(shouldStartHatcheryWelcome({ ...waiting, landed: true, blocked: true })).toBe(false);
  });
});

describe('first-run sequence', () => {
  const fresh: FirstRunInput = {
    hasSeenWelcome: false,
    hasCompletedNestTutorial: false,
    hasSeenAdoptionTip: false,
    hasPet: false,
    incubating: false,
    surface: 'nest',
    blocked: false,
    landed: true,
  };

  it('walks welcome, then adopt or nest, then coach marks, then stays quiet', () => {
    expect(resolveFirstRun(fresh)).toBe('quiet');
    expect(resolveFirstRun({ ...fresh, surface: 'hatchery' })).toBe('welcome');
    expect(resolveFirstRun({ ...fresh, surface: 'hatchery', landed: false })).toBe('quiet');

    const welcomed = { ...fresh, hasSeenWelcome: true };
    expect(resolveFirstRun({ ...welcomed, surface: 'hatchery' })).toBe('adoption-tip');
    expect(shouldShowAdoptionTip({ hasSeenWelcome: true, hasSeenAdoptionTip: false, blocked: false })).toBe(true);
    expect(resolveFirstRun({ ...welcomed, surface: 'hatchery', hasSeenAdoptionTip: true })).toBe('quiet');

    const incubating = { ...welcomed, hasPet: true, incubating: true, hasSeenAdoptionTip: true, surface: 'nest' as const };
    expect(resolveFirstRun(incubating)).toBe('coach-marks');
    expect(shouldStartNestCoachMarks({ ...incubating, hasCompletedNestTutorial: false })).toBe(true);

    const done = { ...incubating, hasCompletedNestTutorial: true };
    expect(resolveFirstRun(done)).toBe('quiet');
    expect(resolveFirstRun({ ...done, surface: 'hatchery' })).toBe('quiet');
  });

  it('greets an egg already at home on the nest, and does not open coach marks first', () => {
    const home = { ...fresh, hasPet: true, incubating: true, surface: 'nest' as const };
    expect(resolveFirstRun(home)).toBe('welcome');
    expect(shouldStartNestCoachMarks(home)).toBe(false);
    expect(resolveFirstRun({ ...home, hasSeenWelcome: true })).toBe('coach-marks');
  });

  it('stays quiet for a keeper who already finished, including while a sheet is open', () => {
    const finished: FirstRunInput = {
      ...fresh,
      hasSeenWelcome: true,
      hasCompletedNestTutorial: true,
      hasSeenAdoptionTip: true,
      hasPet: true,
      incubating: true,
    };
    expect(resolveFirstRun(finished)).toBe('quiet');
    expect(resolveFirstRun({ ...finished, hasSeenWelcome: false, blocked: true })).toBe('quiet');
    expect(shouldStartNestCoachMarks({ ...finished, blocked: true })).toBe(false);
  });

  it('restarts at the welcome after replay, and a mid-tour relaunch skips the welcome', () => {
    const replay = { ...fresh, hasPet: true, incubating: true, surface: 'nest' as const };
    expect(resolveFirstRun(replay)).toBe('welcome');
    expect(resolveFirstRun({ ...replay, surface: 'hatchery' })).toBe('welcome');

    const interrupted = { ...replay, hasSeenWelcome: true };
    expect(resolveFirstRun(interrupted)).toBe('coach-marks');
    expect(resolveFirstRun({ ...interrupted, surface: 'hatchery' })).toBe('adoption-tip');
  });
});
