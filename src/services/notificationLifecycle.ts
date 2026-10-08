import { getSpeciesConfig } from '@/data/species';
import type { PetInstance } from '@/domain/types';

let tail: Promise<void> = Promise.resolve();

function nativeAlertsEnabled(): boolean {
  return process.env.JEST_WORKER_ID === undefined;
}

function enqueue(task: () => Promise<void>): Promise<void> {
  if (!nativeAlertsEnabled()) {
    return Promise.resolve();
  }
  const run = tail.then(task).catch(() => undefined);
  tail = run;
  return run;
}

async function alertsAllowed(): Promise<boolean> {
  try {
    const { usePreferencesStore } = await import('@/store/usePreferencesStore');
    return usePreferencesStore.getState().notificationsEnabled;
  } catch {
    return true;
  }
}

/** Schedules the biological timeline for a newly adopted egg. Replaces any previous alerts first. */
export function scheduleNotificationsForAdoptedPet(pet: PetInstance): Promise<void> {
  return syncNotificationsForStoredPet(pet);
}

/** Drops every pending milestone alert. */
export function cancelScheduledPetNotifications(): Promise<void> {
  return enqueue(async () => {
    const notifications = await import('./notifications');
    await notifications.cancelAllPetNotifications();
  });
}

/**
 * Restores alerts for a stored egg, or clears them when alerts are off, the nest is empty, or the egg has hatched.
 */
export function syncNotificationsForStoredPet(pet: PetInstance | null): Promise<void> {
  return enqueue(async () => {
    const notifications = await import('./notifications');
    const allowed = await alertsAllowed();
    if (!pet || pet.isHatched || !allowed) {
      await notifications.cancelAllPetNotifications();
      return;
    }
    await notifications.scheduleMilestoneNotifications(pet, getSpeciesConfig(pet.speciesId));
  });
}
