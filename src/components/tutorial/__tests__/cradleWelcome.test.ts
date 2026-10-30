import { shouldStartHatcheryWelcome, shouldStartWelcome } from '../cradleWelcome';

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
