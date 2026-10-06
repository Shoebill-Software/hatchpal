import { leopardGeckoConfig } from '@/data/species/gecko';
import { silkieChickenConfig } from '@/data/species/chicken';
import type { PetInstance } from '@/domain/types';

import {
  cancelAllPetNotifications,
  INCUBATION_DAY_MS,
  milestoneTriggerEpoch,
  requestNotificationPermissions,
  scheduleMilestoneNotifications,
  selectUpcomingMilestoneAlerts,
} from '../notifications';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6, DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const notifications = Notifications as unknown as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelAllScheduledNotificationsAsync: jest.Mock;
  setNotificationHandler: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
  setNotificationCategoryAsync: jest.Mock;
};

function pet(partial: Partial<PetInstance> & Pick<PetInstance, 'laidAtEpoch'>): PetInstance {
  return {
    id: 'pet-1',
    speciesId: 'silkie_chicken',
    nickname: 'Pip',
    lastVerifiedEpoch: partial.laidAtEpoch,
    lastInteractedEpoch: partial.laidAtEpoch,
    healthMultiplier: 1,
    lastTurnedEpoch: partial.laidAtEpoch,
    lastMistedEpoch: partial.laidAtEpoch,
    isHatched: false,
    ...partial,
  };
}

function grantPermission(): void {
  const granted = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
  };
  notifications.getPermissionsAsync.mockResolvedValue(granted);
  notifications.requestPermissionsAsync.mockResolvedValue(granted);
}

describe('milestone notification scheduling', () => {
  const laidAt = 1_700_000_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
    notifications.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    notifications.setNotificationCategoryAsync.mockResolvedValue({ identifier: 'hatchpal.milestone' });
    notifications.setNotificationChannelAsync.mockResolvedValue(null);
    notifications.scheduleNotificationAsync.mockImplementation(
      async (request: { identifier?: string }) => request.identifier ?? 'generated'
    );
    grantPermission();
  });

  it('skips milestones that are in the past or exactly now', () => {
    const now = laidAt + 20 * INCUBATION_DAY_MS;
    const alerts = selectUpcomingMilestoneAlerts(
      pet({ laidAtEpoch: laidAt }),
      silkieChickenConfig,
      'en',
      now
    );

    expect(alerts.map((alert) => alert.day)).toEqual([21]);
    expect(milestoneTriggerEpoch(laidAt, 20)).toBe(now);
    expect(alerts[0]?.triggerEpoch).toBe(laidAt + 21 * 86400 * 1000);
  });

  it('schedules future milestones at the exact incubation-day timestamps', async () => {
    const order: string[] = [];
    notifications.cancelAllScheduledNotificationsAsync.mockImplementation(async () => {
      order.push('cancel');
    });
    notifications.scheduleNotificationAsync.mockImplementation(async (request: { identifier?: string }) => {
      order.push(request.identifier ?? 'generated');
      return request.identifier ?? 'generated';
    });

    const ids = await scheduleMilestoneNotifications(
      pet({ laidAtEpoch: laidAt }),
      silkieChickenConfig,
      'en',
      laidAt
    );

    expect(ids).toEqual([
      'hatchpal.milestone.pet-1.3',
      'hatchpal.milestone.pet-1.8',
      'hatchpal.milestone.pet-1.14',
      'hatchpal.milestone.pet-1.19',
      'hatchpal.milestone.pet-1.20',
      'hatchpal.milestone.pet-1.21',
    ]);
    expect(order[0]).toBe('cancel');
    expect(order.slice(1)).toEqual(ids);

    const calls = notifications.scheduleNotificationAsync.mock.calls.map(
      (call) => call[0] as {
        identifier: string;
        content: { title: string; subtitle: string; body: string; categoryIdentifier: string; data: { milestoneDay: number } };
        trigger: { type: string; date: number; channelId: string };
      }
    );

    const byDay = new Map(calls.map((call) => [call.content.data.milestoneDay, call]));
    expect(byDay.get(3)?.trigger).toEqual({
      type: 'date',
      date: laidAt + 3 * 86400 * 1000,
      channelId: 'hatchpal.milestones',
    });
    expect(byDay.get(19)?.trigger.date).toBe(laidAt + 19 * 86400 * 1000);
    expect(byDay.get(20)?.trigger.date).toBe(laidAt + 20 * 86400 * 1000);
    expect(byDay.get(21)?.trigger.date).toBe(laidAt + 21 * 86400 * 1000);
    expect(byDay.get(3)?.content).toMatchObject({
      title: 'Blood vessels have formed',
      subtitle: 'Pip',
      body: 'Vital blood vessels have formed and can now be seen under light.',
      categoryIdentifier: 'hatchpal.milestone',
    });
    expect(byDay.get(19)?.content.body).toBe(
      'The beak has entered the air cell. Faint tapping or peeping can be heard.'
    );
    expect(byDay.get(20)?.content.body).toBe(
      'The egg tooth has cracked the outer shell. Turning must cease.'
    );
    expect(byDay.get(21)?.content.body).toBe('The chick is emerging from the shell.');
    expect(byDay.has(0)).toBe(false);
  });

  it('uses German biological copy and species-specific gecko timestamps', async () => {
    const geckoLaid = 1_800_000_000_000;
    const ids = await scheduleMilestoneNotifications(
      pet({
        id: 'gecko-1',
        speciesId: 'leopard_gecko',
        nickname: 'Nova',
        laidAtEpoch: geckoLaid,
      }),
      leopardGeckoConfig,
      'de',
      geckoLaid + 10 * INCUBATION_DAY_MS
    );

    const calls = notifications.scheduleNotificationAsync.mock.calls.map(
      (call) => call[0] as {
        content: { title: string; subtitle: string; body: string };
        trigger: { date: number };
      }
    );

    expect(ids[0]).toBe('hatchpal.milestone.gecko-1.19');
    expect(calls.map((call) => call.trigger.date)).toEqual(
      [19, 33, 47, 49, 50].map((day) => geckoLaid + day * 86400 * 1000)
    );
    const internalPip = calls.find((call) => call.content.title === 'Innerer Pick');
    expect(internalPip?.content.subtitle).toBe('Nova');
    expect(internalPip?.content.body).toBe(
      'Die Schnauze hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.'
    );
    expect(calls.some((call) => call.content.body.includes('Blutgefäße'))).toBe(false);
    expect(calls.some((call) => call.content.body.includes('schlüpft'))).toBe(true);
  });

  it('does not schedule when permission is denied and still resolves', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'denied',
      canAskAgain: false,
      expires: 'never',
    });

    const ids = await scheduleMilestoneNotifications(
      pet({ laidAtEpoch: laidAt }),
      silkieChickenConfig,
      'en',
      laidAt
    );

    expect(ids).toEqual([]);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when it has not been decided and continues if the prompt throws', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined',
      canAskAgain: true,
      expires: 'never',
    });
    notifications.requestPermissionsAsync.mockRejectedValue(new Error('native unavailable'));

    await expect(requestNotificationPermissions()).resolves.toBe(false);
    expect(notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('cancels every pending alert', async () => {
    await cancelAllPetNotifications();
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing and does not throw when every milestone is already past', async () => {
    const now = laidAt + 40 * INCUBATION_DAY_MS;
    const ids = await scheduleMilestoneNotifications(
      pet({ laidAtEpoch: laidAt }),
      silkieChickenConfig,
      'de',
      now
    );

    expect(ids).toEqual([]);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('creates the Android channel before scheduling', async () => {
    (Platform as { OS: string }).OS = 'android';

    await scheduleMilestoneNotifications(pet({ laidAtEpoch: laidAt }), silkieChickenConfig, 'de', laidAt);

    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'hatchpal.milestones',
      expect.objectContaining({
        name: 'Brutmeilensteine',
        importance: 6,
      })
    );
  });
});
