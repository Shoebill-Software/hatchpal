import * as Haptics from 'expo-haptics';

import { usePreferencesStore } from '@/store/usePreferencesStore';

import type { CareReleaseFeel } from './careFeedback';

export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;

function hapticsAllowed(): boolean {
  return usePreferencesStore.getState().hapticsEnabled;
}

/** Light, medium, or heavy impact. No-ops immediately when haptics are disabled. */
export function triggerImpact(style: Haptics.ImpactFeedbackStyle): Promise<void> {
  if (!hapticsAllowed()) {
    return Promise.resolve();
  }
  return Haptics.impactAsync(style).then(
    () => undefined,
    () => undefined
  );
}

/** The lightest detent tick, for dials and gauges. No-ops when haptics are disabled. */
export function triggerSelection(): Promise<void> {
  if (!hapticsAllowed()) {
    return Promise.resolve();
  }
  return Haptics.selectionAsync().then(
    () => undefined,
    () => undefined
  );
}

/** Success, warning, or error notification haptic. No-ops when haptics are disabled. */
export function triggerNotification(type: Haptics.NotificationFeedbackType): Promise<void> {
  if (!hapticsAllowed()) {
    return Promise.resolve();
  }
  return Haptics.notificationAsync(type).then(
    () => undefined,
    () => undefined
  );
}

/** Confirms a brood or mist landing. Wish grants call success on their own. */
export function triggerCareRelease(feel: CareReleaseFeel): Promise<void> {
  if (feel === 'success') {
    return triggerNotification(NotificationFeedbackType.Success);
  }
  if (feel === 'warning') {
    return triggerNotification(NotificationFeedbackType.Warning);
  }
  return triggerImpact(ImpactFeedbackStyle.Light);
}
