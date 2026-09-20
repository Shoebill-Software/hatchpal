import { BiologicalMilestone, DevelopmentStage } from './types';

const FALLBACK_MILESTONE: BiologicalMilestone = {
  day: 0,
  stage: 'cleavage',
  title: 'Unknown developmental stage',
  scientificSummary:
    'Milestone data is unavailable. Displaying the earliest safe incubation stage.',
  candling: {
    bloodVesselsVisible: false,
    eyeSpotVisible: false,
    embryoSilhouettePct: 0,
    airCellPct: 0.05,
    movementDetectable: false,
  },
  audioTrigger: 'silent',
};

const sortedMilestonesCache = new WeakMap<BiologicalMilestone[], BiologicalMilestone[]>();

export function getFallbackMilestone(): BiologicalMilestone {
  return FALLBACK_MILESTONE;
}

export function getSortedMilestones(milestones: BiologicalMilestone[]): BiologicalMilestone[] {
  if (!milestones.length) {
    return [FALLBACK_MILESTONE];
  }

  const cached = sortedMilestonesCache.get(milestones);
  if (cached) {
    return cached;
  }

  const sorted = milestones.slice().sort((a, b) => a.day - b.day);
  sortedMilestonesCache.set(milestones, sorted);
  return sorted;
}

export function getMilestoneAtDay(
  dayFloat: number,
  milestones: BiologicalMilestone[]
): BiologicalMilestone {
  const sorted = getSortedMilestones(milestones);
  const safeDay = Number.isFinite(dayFloat) ? Math.max(0, dayFloat) : 0;

  let activeMilestone = sorted[0] ?? FALLBACK_MILESTONE;
  for (const milestone of sorted) {
    if (safeDay >= milestone.day) {
      activeMilestone = milestone;
    } else {
      break;
    }
  }
  return activeMilestone;
}

export function getCurrentMilestone(
  progress: number,
  totalIncubationDays: number,
  milestones: BiologicalMilestone[]
): BiologicalMilestone {
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const safeDays = Number.isFinite(totalIncubationDays) ? totalIncubationDays : 0;
  return getMilestoneAtDay(safeProgress * safeDays, milestones);
}

export function isPipStage(stage: DevelopmentStage): boolean {
  return stage === 'internal_pip' || stage === 'external_pip';
}

export function getUpcomingMilestones(
  dayFloat: number,
  milestones: BiologicalMilestone[]
): BiologicalMilestone[] {
  const sorted = getSortedMilestones(milestones);
  const safeDay = Number.isFinite(dayFloat) ? dayFloat : 0;
  return sorted.filter((milestone) => milestone.day > safeDay && milestone !== FALLBACK_MILESTONE);
}
