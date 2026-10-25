import { getSpeciesConfig } from '@/data/species';
import type { PetInstance } from '@/domain/types';
import { selectUpcomingMilestoneAlerts } from '@/services/milestoneSchedule';

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

/** Schedules the biological timeline for a newly adopted egg, keeping the rest of the clutch. */
export function scheduleNotificationsForAdoptedPet(pet: PetInstance): Promise<void> {
  return syncNotificationsForStoredPets([pet]);
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
  return syncNotificationsForStoredPets(pet ? [pet] : []);
}

/** Restores milestone alerts for every incubating cradle and drops alerts for hatched or removed eggs. */
export function syncNotificationsForStoredPets(pets: readonly PetInstance[]): Promise<void> {
  return enqueue(async () => {
    const notifications = await import('./notifications');
    const allowed = await alertsAllowed();
    const incubating = allowed ? pets.filter((pet) => !pet.isHatched) : [];
    if (incubating.length === 0) {
      await notifications.cancelAllPetNotifications();
      return;
    }
    const now = Date.now();
    const alerts = incubating.flatMap((pet) =>
      selectUpcomingMilestoneAlerts(pet, getSpeciesConfig(pet.speciesId), now)
    );
    await notifications.replaceScheduledAlerts(alerts);
  });
}
