import { projectedClimateLossEpoch, readClimate } from '@/domain/climateEngine';
import { getSortedMilestones } from '@/domain/milestones';
import { resolveEffectiveEpoch, resolvePetSnapshot } from '@/domain/timeEngine';
import type { BiologicalMilestone, DevelopmentStage, PetInstance, SpeciesConfig, SpeciesId } from '@/domain/types';

import { milestoneAlertCopy, milestoneAlertSubtitle } from './notificationCopy';

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
 * True while this egg is still incubating. Hatched nests and embryos already
 * lost to the cold — including a collapse the status flag has not saved yet —
 * have nothing left to announce.
 */
export function incubationAlertsOpen(pet: PetInstance, species: SpeciesConfig, nowEpoch: number): boolean {
  if (!Number.isFinite(pet.laidAtEpoch) || !Number.isFinite(nowEpoch)) {
    return false;
  }
  if (pet.isHatched || pet.status === 'unviable') {
    return false;
  }
  return !resolvePetSnapshot(pet, species, nowEpoch).isUnviable;
}

/**
 * Upcoming biological alerts whose trigger is strictly after `nowEpoch`.
 * Day 0 (cleavage / the moment of laying) is the adoption itself and is never alerted.
 * A hatched creature or an embryo already lost to the cold has nothing left to announce.
 * A nest already on strike skips milestones it will not live to reach. A chilly or
 * fussy egg still gets the full timeline, so coming back to tend it can keep them.
 */
export function selectUpcomingMilestoneAlerts(
  pet: PetInstance,
  species: SpeciesConfig,
  nowEpoch: number
): MilestoneAlert[] {
  if (!incubationAlertsOpen(pet, species, nowEpoch)) {
    return [];
  }

  const clock = resolveEffectiveEpoch(nowEpoch, pet.lastVerifiedEpoch);
  const climate = readClimate(pet, species, clock.effectiveEpoch);
  const lostAt =
    climate.temper === 'on_strike' ? projectedClimateLossEpoch(pet, species, clock.effectiveEpoch) : null;

  const alerts: MilestoneAlert[] = [];

  for (const milestone of getSortedMilestones(species.milestones)) {
    if (!isNotifiableMilestone(milestone)) {
      continue;
    }

    const triggerEpoch = milestoneTriggerEpoch(pet.laidAtEpoch, milestone.day);
    if (!Number.isFinite(triggerEpoch) || triggerEpoch <= nowEpoch) {
      continue;
    }
    if (lostAt != null && triggerEpoch >= lostAt) {
      continue;
    }

    const copy = milestoneAlertCopy(milestone, species);
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
      subtitle: milestoneAlertSubtitle(pet.nickname, milestone.day, species.commonName),
      body: copy.body,
    });
  }

  return alerts;
}

function isNotifiableMilestone(milestone: BiologicalMilestone): boolean {
  return Number.isFinite(milestone.day) && milestone.day > 0 && milestone.stage !== 'cleavage';
}
