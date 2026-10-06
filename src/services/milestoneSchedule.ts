import { getSortedMilestones } from '@/domain/milestones';
import type { BiologicalMilestone, DevelopmentStage, PetInstance, SpeciesConfig, SpeciesId } from '@/domain/types';
import type { LocaleCode } from '@/i18n/locale';

import { milestoneAlertCopy } from './notificationCopy';

/** One incubation day, in milliseconds. Matches `day * 86400 * 1000`. */
export const INCUBATION_DAY_MS = 86400 * 1000;

export const MILESTONE_CATEGORY_ID = 'hatchpal.milestone';
export const MILESTONE_CHANNEL_ID = 'hatchpal.milestones';

export type MilestoneAlert = {
  petId: string;
  speciesId: SpeciesId;
  day: number;
  stage: DevelopmentStage;
  triggerEpoch: number;
  identifier: string;
  title: string;
  subtitle: string;
  body: string;
};

export function milestoneTriggerEpoch(laidAtEpoch: number, day: number): number {
  return laidAtEpoch + day * INCUBATION_DAY_MS;
}

export function milestoneNotificationId(petId: string, day: number): string {
  return `hatchpal.milestone.${petId}.${day}`;
}

/**
 * Upcoming biological alerts whose trigger is strictly after `nowEpoch`.
 * Day 0 (cleavage / the moment of laying) is the adoption itself and is never alerted.
 */
export function selectUpcomingMilestoneAlerts(
  pet: PetInstance,
  species: SpeciesConfig,
  locale: LocaleCode,
  nowEpoch: number
): MilestoneAlert[] {
  if (!Number.isFinite(pet.laidAtEpoch) || !Number.isFinite(nowEpoch)) {
    return [];
  }

  const safeLocale: LocaleCode = locale === 'de' ? 'de' : 'en';
  const nickname = pet.nickname.trim().length > 0 ? pet.nickname.trim() : species.commonName[safeLocale];
  const alerts: MilestoneAlert[] = [];

  for (const milestone of getSortedMilestones(species.milestones)) {
    if (!isNotifiableMilestone(milestone)) {
      continue;
    }

    const triggerEpoch = milestoneTriggerEpoch(pet.laidAtEpoch, milestone.day);
    if (!Number.isFinite(triggerEpoch) || triggerEpoch <= nowEpoch) {
      continue;
    }

    const copy = milestoneAlertCopy(milestone, species, safeLocale);
    if (!copy) {
      continue;
    }

    alerts.push({
      petId: pet.id,
      speciesId: pet.speciesId,
      day: milestone.day,
      stage: milestone.stage,
      triggerEpoch,
      identifier: milestoneNotificationId(pet.id, milestone.day),
      title: copy.title,
      subtitle: nickname,
      body: copy.body,
    });
  }

  return alerts;
}

function isNotifiableMilestone(milestone: BiologicalMilestone): boolean {
  return Number.isFinite(milestone.day) && milestone.day > 0 && milestone.stage !== 'cleavage';
}
