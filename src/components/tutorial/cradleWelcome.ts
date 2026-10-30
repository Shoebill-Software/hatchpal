/** Covers the hatchery fade, then leaves the room on screen before Pip appears. */
export const HATCHERY_WELCOME_DELAY_MS = 1100;

/** Pip's nest greeting. The empty cradle never opens it; an egg already at home does. */
export function shouldStartWelcome(input: {
  hasSeenWelcome: boolean;
  hasPet: boolean;
  blocked: boolean;
}): boolean {
  if (input.hasSeenWelcome || input.blocked) {
    return false;
  }
  return input.hasPet;
}

/** First-run welcome. It waits until the hatchery screen has landed. */
export function shouldStartHatcheryWelcome(input: {
  hasSeenWelcome: boolean;
  landed: boolean;
  blocked: boolean;
}): boolean {
  if (input.hasSeenWelcome || input.blocked || !input.landed) {
    return false;
  }
  return true;
}
