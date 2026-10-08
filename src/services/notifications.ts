import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PetInstance, SpeciesConfig } from '@/domain/types';

import {
  MILESTONE_CATEGORY_ID,
  MILESTONE_CHANNEL_ID,
  selectUpcomingMilestoneAlerts,
  type MilestoneAlert,
} from './milestoneSchedule';
import { milestoneChannelCopy } from './notificationCopy';

export {
  INCUBATION_DAY_MS,
  MILESTONE_CATEGORY_ID,
  MILESTONE_CHANNEL_ID,
  milestoneNotificationId,
  milestoneTriggerEpoch,
  selectUpcomingMilestoneAlerts,
} from './milestoneSchedule';

export type { MilestoneAlert } from './milestoneSchedule';

let handlerInstalled = false;

function isGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted === true || status.status === 'granted';
}

function installForegroundHandler(): void {
  if (handlerInstalled || Platform.OS === 'web') {
    return;
  }
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerInstalled = true;
  } catch {
    handlerInstalled = false;
  }
}

async function ensureMilestoneCategory(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Notifications.setNotificationCategoryAsync(MILESTONE_CATEGORY_ID, []);
  } catch {
    // Category registration is unavailable on web and some Expo Go builds.
  }
}

async function ensureMilestoneChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const copy = milestoneChannelCopy();
  try {
    await Notifications.setNotificationChannelAsync(MILESTONE_CHANNEL_ID, {
      name: copy.name,
      description: copy.description,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 160, 90, 160],
      enableVibrate: true,
      showBadge: false,
    });
  } catch {
    // A missing channel must not block incubation.
  }
}

export type OsNotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Reads the OS notification permission without prompting. */
export async function readNotificationPermission(): Promise<OsNotificationPermission> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) {
      return 'granted';
    }
    if (current.status === 'denied') {
      return 'denied';
    }
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Checks notification permission and requests it when the system can still ask.
 * A denial returns false and never throws, so gameplay continues offline.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    installForegroundHandler();
    await ensureMilestoneChannel();
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) {
      return true;
    }
    if (current.status === 'denied' && current.canAskAgain === false) {
      return false;
    }

    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return isGranted(next);
  } catch {
    return false;
  }
}

/**
 * Schedules one local notification per upcoming milestone.
 * Triggers use `laidAtEpoch + day * 86400 * 1000` and skip anything not strictly in the future.
 */
export async function scheduleMilestoneNotifications(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number = Date.now()
): Promise<string[]> {
  installForegroundHandler();
  await ensureMilestoneCategory();

  const allowed = await requestNotificationPermissions();
  if (!allowed) {
    return [];
  }

  await cancelAllPetNotifications();

  const alerts = selectUpcomingMilestoneAlerts(pet, species, nowEpoch);
  const identifiers: string[] = [];

  for (const alert of alerts) {
    const identifier = await scheduleAlert(alert);
    if (identifier) {
      identifiers.push(identifier);
    }
  }

  return identifiers;
}

async function scheduleAlert(alert: MilestoneAlert): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: alert.identifier,
      content: {
        title: alert.title,
        subtitle: alert.subtitle,
        body: alert.body,
        sound: 'default',
        categoryIdentifier: MILESTONE_CATEGORY_ID,
        data: {
          petId: alert.petId,
          speciesId: alert.speciesId,
          milestoneDay: alert.day,
          stage: alert.stage,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alert.triggerEpoch,
        channelId: MILESTONE_CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

/** Clears every pending HatchPal alert. Used when an egg is abandoned, replaced, or hatched. */
export async function cancelAllPetNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Cancellation is best-effort. A missing native module must not trap the player.
  }
}
