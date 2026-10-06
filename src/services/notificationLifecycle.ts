import { getSpeciesConfig } from '@/data/species';
import type { PetInstance } from '@/domain/types';
import { resolveActiveLocale, type LocaleCode, type LocaleOverride } from '@/i18n/locale';

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

async function readLocaleOverride(): Promise<LocaleOverride> {
  try {
    const { usePreferencesStore } = await import('@/store/usePreferencesStore');
    return usePreferencesStore.getState().localeOverride;
  } catch {
    return 'system';
  }
}

async function alertsAllowed(): Promise<boolean> {
  try {
    const { usePreferencesStore } = await import('@/store/usePreferencesStore');
    return usePreferencesStore.getState().notificationsEnabled;
  } catch {
    return true;
  }
}

async function resolveAlertLocale(): Promise<LocaleCode> {
  const override = await readLocaleOverride();
  let deviceLanguage: string | null = null;
  try {
    const Localization = await import('expo-localization');
    const primary = Localization.getLocales()[0];
    deviceLanguage = primary?.languageCode ?? primary?.languageTag ?? null;
  } catch {
    deviceLanguage = null;
  }
  return resolveActiveLocale(override, deviceLanguage);
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
    const locale = await resolveAlertLocale();
    await notifications.scheduleMilestoneNotifications(pet, getSpeciesConfig(pet.speciesId), locale);
  });
}
