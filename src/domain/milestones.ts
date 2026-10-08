import {
  AudioMilestoneTrigger,
  BiologicalMilestone,
  CandlingFeatures,
  DevelopmentStage,
  SpeciesConfig,
} from './types';

const FALLBACK_MILESTONE: BiologicalMilestone = {
  day: 0,
  stage: 'cleavage',
  title: 'Unknown developmental stage',
  scientificSummary: 'Milestone data is unavailable. Displaying the earliest safe incubation stage.',
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

/** One biological day, in milliseconds. Matches the time engine. */
export const MS_PER_DAY = 86_400_000;

/**
 * Fraction of post-hatch maturation spent as a hatchling.
 * Identical to `HATCHLING_MATURATION_THRESHOLD` in the time engine.
 */
export const POST_HATCH_JUVENILE_FRACTION = 1 / 6;

const DEFAULT_WEIGHT_SAMPLES = 9;

export type JournalMilestoneStatus = 'completed' | 'active' | 'upcoming';

export type PostHatchMilestoneId = 'emergence' | 'juvenile' | 'adult';

export interface PostHatchMilestone {
  id: PostHatchMilestoneId;
  stage: 'hatchling' | 'juvenile' | 'adult';
  /** Days since laying on the nominal incubation clock. */
  day: number;
  /** Days since emergence. */
  postHatchDay: number;
  title: string;
  scientificSummary: string;
  audioTrigger: AudioMilestoneTrigger;
}

export interface JournalMilestone {
  id: string;
  day: number;
  /** Set for post-hatch growth stages. Incubation entries, including emergence, leave this null. */
  postHatchDay: number | null;
  stage: DevelopmentStage;
  title: string;
  scientificSummary: string;
  candling: CandlingFeatures | null;
  audioTrigger: AudioMilestoneTrigger;
  /** Candling notes apply only while the animal is still inside the shell. */
  duringIncubation: boolean;
  status: JournalMilestoneStatus;
  unlockEpoch: number;
}

export interface JournalTimelineInput {
  species: SpeciesConfig;
  laidAtEpoch: number;
  /** Incubation progress in [0, 1]. Hatched pets should pass 1. */
  progress: number;
  isHatched: boolean;
  postHatchAgeDays: number;
  /**
   * Epoch when emergence was logged, or the scheduled hatch for an egg still incubating.
   * Juvenile and adult dates are measured from this instant.
   */
  hatchEpoch: number;
}

export interface WeightSample {
  epoch: number;
  postHatchDay: number;
  grams: number;
}

export interface WeightMark extends WeightSample {
  id: PostHatchMilestoneId | 'current';
  title: string;
}

type WeightEngine = {
  calculateCurrentWeightGrams: (
    hatchWeightGrams: number,
    adultWeightGrams: number,
    maturationProgress: number
  ) => number;
  calculateMaturationProgress: (hatchEpoch: number, currentEpoch: number, adultMaturationDays: number) => number;
};

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

export function getMilestoneTimestamp(laidAtEpoch: number, milestoneDay: number): number {
  if (!Number.isFinite(laidAtEpoch)) {
    return 0;
  }
  const day = Number.isFinite(milestoneDay) ? milestoneDay : 0;
  return laidAtEpoch + day * MS_PER_DAY;
}

export function getUnlockedMilestones(species: SpeciesConfig, progress: number): BiologicalMilestone[] {
  const safeProgress = clampProgress(progress);
  const incubationDays = incubationLength(species);
  return incubationMilestones(species).filter((milestone) =>
    milestoneReached(milestone.day, safeProgress, incubationDays)
  );
}

export function getNextUpcomingMilestone(
  species: SpeciesConfig,
  progress: number
): BiologicalMilestone | null {
  if (Number.isFinite(progress) && progress >= 1) {
    return null;
  }
  const safeProgress = clampProgress(progress);
  const incubationDays = incubationLength(species);
  for (const milestone of incubationMilestones(species)) {
    if (!milestoneReached(milestone.day, safeProgress, incubationDays)) {
      return milestone;
    }
  }
  return null;
}

export function getPostHatchMilestones(species: SpeciesConfig): PostHatchMilestone[] {
  const incubationDays = incubationLength(species);
  const adultDays = finiteDay(species.adultMaturationDays);
  const juvenileDay = adultDays / 6;
  const emergence = findHatchling(species);
  const emergenceDay = emergence?.day ?? incubationDays;

  return [
    {
      id: 'emergence',
      stage: 'hatchling',
      day: emergenceDay,
      postHatchDay: 0,
      title: emergence?.title ?? 'Emergence',
      scientificSummary:
        emergence?.scientificSummary ??
        'The neonate leaves the shell and the post-hatch growth clock starts.',
      audioTrigger: emergence?.audioTrigger ?? 'hatch_call',
    },
    {
      id: 'juvenile',
      stage: 'juvenile',
      day: incubationDays + juvenileDay,
      postHatchDay: juvenileDay,
      title: species.juvenile.title,
      scientificSummary: species.juvenile.scientificSummary,
      audioTrigger: 'hatch_call',
    },
    {
      id: 'adult',
      stage: 'adult',
      day: incubationDays + adultDays,
      postHatchDay: adultDays,
      title: species.adult.title,
      scientificSummary: species.adult.scientificSummary,
      audioTrigger: 'hatch_call',
    },
  ];
}

export function getAchievedPostHatchMilestones(
  species: SpeciesConfig,
  postHatchAgeDays: number
): PostHatchMilestone[] {
  if (!Number.isFinite(postHatchAgeDays) || postHatchAgeDays < 0) {
    return [];
  }
  return getPostHatchMilestones(species).filter(
    (milestone) => postHatchAgeDays + 1e-6 >= milestone.postHatchDay
  );
}

export function buildJournalTimeline(input: JournalTimelineInput): JournalMilestone[] {
  const incubation = incubationMilestones(input.species);
  const incubationDays = incubationLength(input.species);
  const progress = input.isHatched ? 1 : clampProgress(input.progress);
  const age = input.isHatched && Number.isFinite(input.postHatchAgeDays) ? Math.max(0, input.postHatchAgeDays) : -1;
  const unlocked = incubation.filter((milestone) => milestoneReached(milestone.day, progress, incubationDays));
  const activeIncubation = !input.isHatched && unlocked.length > 0 ? unlocked[unlocked.length - 1] : undefined;
  const growth = getPostHatchMilestones(input.species).filter((milestone) => milestone.id !== 'emergence');
  const achievedGrowth =
    age >= 0 ? growth.filter((milestone) => age + 1e-6 >= milestone.postHatchDay) : [];
  const activeGrowth = achievedGrowth.length > 0 ? achievedGrowth[achievedGrowth.length - 1] : undefined;
  const hatchEpoch = finiteEpoch(input.hatchEpoch, getMilestoneTimestamp(input.laidAtEpoch, incubationDays));

  const rows: JournalMilestone[] = incubation.map((milestone) => {
    let status: JournalMilestoneStatus;
    if (!input.isHatched) {
      if (milestone === activeIncubation) {
        status = 'active';
      } else if (unlocked.includes(milestone)) {
        status = 'completed';
      } else {
        status = 'upcoming';
      }
    } else if (milestone.stage === 'hatchling') {
      status = activeGrowth ? 'completed' : 'active';
    } else {
      status = 'completed';
    }

    return {
      id: `${input.species.id}-incubation-${milestone.day}-${milestone.stage}`,
      day: milestone.day,
      postHatchDay: null,
      stage: milestone.stage,
      title: milestone.title,
      scientificSummary: milestone.scientificSummary,
      candling: milestone.candling,
      audioTrigger: milestone.audioTrigger,
      duringIncubation: true,
      status,
      unlockEpoch: getMilestoneTimestamp(input.laidAtEpoch, milestone.day),
    };
  });

  for (const milestone of growth) {
    let status: JournalMilestoneStatus = 'upcoming';
    if (input.isHatched) {
      if (milestone === activeGrowth) {
        status = 'active';
      } else if (age + 1e-6 >= milestone.postHatchDay) {
        status = 'completed';
      }
    }

    rows.push({
      id: `${input.species.id}-${milestone.id}`,
      day: milestone.day,
      postHatchDay: milestone.postHatchDay,
      stage: milestone.stage,
      title: milestone.title,
      scientificSummary: milestone.scientificSummary,
      candling: null,
      audioTrigger: milestone.audioTrigger,
      duringIncubation: false,
      status,
      unlockEpoch: hatchEpoch + milestone.postHatchDay * MS_PER_DAY,
    });
  }

  return rows;
}

export function generateWeightHistory(
  species: SpeciesConfig,
  hatchEpoch: number,
  currentEpoch: number,
  sampleCount = DEFAULT_WEIGHT_SAMPLES
): WeightSample[] {
  if (!Number.isFinite(hatchEpoch) || !Number.isFinite(currentEpoch) || currentEpoch < hatchEpoch) {
    return [];
  }

  const span = currentEpoch - hatchEpoch;
  const requested = Number.isFinite(sampleCount) ? Math.floor(sampleCount) : DEFAULT_WEIGHT_SAMPLES;
  const count = Math.min(24, Math.max(2, requested));
  const steps = span === 0 ? 1 : count;
  const samples: WeightSample[] = [];

  for (let index = 0; index < steps; index += 1) {
    const fraction = steps === 1 ? 0 : index / (steps - 1);
    const epoch = hatchEpoch + span * fraction;
    samples.push({
      epoch,
      postHatchDay: (epoch - hatchEpoch) / MS_PER_DAY,
      grams: weightGramsAt(species, hatchEpoch, epoch),
    });
  }

  return samples;
}

export function getWeightMarks(
  species: SpeciesConfig,
  hatchEpoch: number,
  currentEpoch: number
): WeightMark[] {
  if (!Number.isFinite(hatchEpoch) || !Number.isFinite(currentEpoch) || currentEpoch < hatchEpoch) {
    return [];
  }

  const marks: WeightMark[] = [];
  for (const milestone of getPostHatchMilestones(species)) {
    const epoch = hatchEpoch + milestone.postHatchDay * MS_PER_DAY;
    if (epoch <= currentEpoch + 1) {
      marks.push({
        id: milestone.id,
        epoch,
        postHatchDay: milestone.postHatchDay,
        grams: weightGramsAt(species, hatchEpoch, epoch),
        title: milestone.title,
      });
    }
  }

  const last = marks[marks.length - 1];
  if (!last || currentEpoch - last.epoch > 60_000) {
    marks.push({
      id: 'current',
      epoch: currentEpoch,
      postHatchDay: (currentEpoch - hatchEpoch) / MS_PER_DAY,
      grams: weightGramsAt(species, hatchEpoch, currentEpoch),
      title: 'Today',
    });
  }

  return marks;
}

function incubationMilestones(species: SpeciesConfig): BiologicalMilestone[] {
  if (!species.milestones || species.milestones.length === 0) {
    return [];
  }
  return getSortedMilestones(species.milestones).filter((milestone) => milestone !== FALLBACK_MILESTONE);
}

function findHatchling(species: SpeciesConfig): BiologicalMilestone | undefined {
  const milestones = incubationMilestones(species);
  for (let index = milestones.length - 1; index >= 0; index -= 1) {
    const milestone = milestones[index];
    if (milestone && milestone.stage === 'hatchling') {
      return milestone;
    }
  }
  return undefined;
}

function milestoneReached(day: number, progress: number, incubationDays: number): boolean {
  if (!Number.isFinite(day)) {
    return false;
  }
  if (!Number.isFinite(incubationDays) || incubationDays <= 0) {
    return progress >= 1 && day <= 0;
  }
  return day / incubationDays <= progress + 1e-8;
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(1, Math.max(0, progress));
}

function incubationLength(species: SpeciesConfig): number {
  return finiteDay(species.incubationDays);
}

function finiteDay(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finiteEpoch(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function weightGramsAt(species: SpeciesConfig, hatchEpoch: number, epoch: number): number {
  const engine = weightEngine();
  const progress = engine.calculateMaturationProgress(hatchEpoch, epoch, species.adultMaturationDays);
  return engine.calculateCurrentWeightGrams(species.hatchWeightGrams, species.adultWeightGrams, progress);
}

// Loaded on use so this module does not form an import cycle with the time engine.
function weightEngine(): WeightEngine {
  return require('./timeEngine') as WeightEngine;
}
