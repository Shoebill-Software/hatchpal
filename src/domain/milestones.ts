import {
  AudioMilestoneTrigger,
  BiologicalMilestone,
  CandlingFeatures,
  DevelopmentStage,
  LocalizedCopy,
  SpeciesConfig,
  SpeciesId,
  localized,
} from './types';

const FALLBACK_MILESTONE: BiologicalMilestone = {
  day: 0,
  stage: 'cleavage',
  title: localized('Unknown developmental stage', 'Unbekanntes Entwicklungsstadium'),
  scientificSummary: localized(
    'Milestone data is unavailable. Displaying the earliest safe incubation stage.',
    'Meilensteindaten fehlen. Angezeigt wird das früheste sichere Brutstadium.'
  ),
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

export type SizeReferenceId =
  | 'silkie_golf_ball'
  | 'silkie_grapefruit'
  | 'silkie_teapot'
  | 'gecko_raspberry'
  | 'gecko_mouse'
  | 'gecko_kiwi'
  | 'turtle_lime'
  | 'turtle_melon'
  | 'turtle_adults';

export interface PostHatchMilestone {
  id: PostHatchMilestoneId;
  stage: 'hatchling' | 'juvenile' | 'adult';
  /** Days since laying on the nominal incubation clock. */
  day: number;
  /** Days since emergence. */
  postHatchDay: number;
  title: LocalizedCopy;
  scientificSummary: LocalizedCopy;
  audioTrigger: AudioMilestoneTrigger;
}

export interface JournalMilestone {
  id: string;
  day: number;
  /** Set for post-hatch growth stages. Incubation entries, including emergence, leave this null. */
  postHatchDay: number | null;
  stage: DevelopmentStage;
  title: LocalizedCopy;
  scientificSummary: LocalizedCopy;
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
  title: LocalizedCopy;
}

export interface SizeReference {
  id: SizeReferenceId;
  /** Mass of the comparison object, in grams. This is not a sample from the growth curve. */
  weightGrams: number;
  /** Typical post-hatch day when this object is the field comparison. */
  postHatchDay: number;
}

const GROWTH_COPY: Record<
  SpeciesId,
  Record<'juvenile' | 'adult', Pick<PostHatchMilestone, 'title' | 'scientificSummary'>>
> = {
  silkie_chicken: {
    juvenile: {
      title: localized('Juvenile plumage', 'Jugendgefieder'),
      scientificSummary: localized(
        'Natal down is replaced by contour feathers. The crest and feathered shanks start to read as silkie traits, and daily mass gain is steepest in this window.',
        'Die Nestdaunen werden durch Konturfedern ersetzt. Haube und befiederte Läufe werden als Seidenhuhn-Merkmale lesbar, und die tägliche Massenzunahme ist in diesem Fenster am steilsten.'
      ),
    },
    adult: {
      title: localized('Adult plumage', 'Adultgefieder'),
      scientificSummary: localized(
        'Crest, mulberry comb, and feathered feet are fully expressed. Body mass settles on the adult plateau near 1,300 g and linear growth stops.',
        'Haube, Maulbeerkamm und befiederte Füße sind vollständig ausgeprägt. Die Körpermasse liegt auf dem adulten Plateau um 1.300 g, das Längenwachstum endet.'
      ),
    },
  },
  leopard_gecko: {
    juvenile: {
      title: localized('Juvenile pattern', 'Jugendzeichnung'),
      scientificSummary: localized(
        'Hatchling bands break into separate spots. The tail thickens as a fat store, and nocturnal hunting on the substrate becomes regular.',
        'Die Bänder des Schlüpflings lösen sich in einzelne Flecken auf. Der Schwanz verdickt sich als Fettspeicher, und die nächtliche Jagd auf dem Substrat wird regelmäßig.'
      ),
    },
    adult: {
      title: localized('Adult pattern', 'Adultzeichnung'),
      scientificSummary: localized(
        'Spotting is stable and body mass has reached the adult plateau near 70 g. Further growth is negligible.',
        'Die Fleckung ist stabil, und die Körpermasse hat das adulte Plateau um 70 g erreicht. Weiteres Wachstum ist vernachlässigbar.'
      ),
    },
  },
  green_sea_turtle: {
    juvenile: {
      title: localized('Juvenile carapace', 'Juveniler Carapax'),
      scientificSummary: localized(
        'Scutes keratinize and the flipper stroke lengthens. On this compressed clock the turtle leaves the surface drift and begins sustained swimming.',
        'Die Schilde verhornen, und der Flossenschlag wird länger. Auf dieser verdichteten Uhr verlässt die Schildkröte die oberflächennahe Drift und beginnt ausdauernd zu schwimmen.'
      ),
    },
    adult: {
      title: localized('Adult ocean mass', 'Adulte Meeresmasse'),
      scientificSummary: localized(
        'The carapace is fully ossified and mass has reached the compressed adult plateau near 150 kg, enough for sustained oceanic travel.',
        'Der Carapax ist vollständig verknöchert, und die Masse hat das verdichtete adulte Plateau um 150 kg erreicht, ausreichend für anhaltende ozeanische Wanderung.'
      ),
    },
  },
};

const SIZE_REFERENCES: Record<SpeciesId, readonly [SizeReference, SizeReference, SizeReference]> = {
  silkie_chicken: [
    { id: 'silkie_golf_ball', weightGrams: 32, postHatchDay: 0 },
    { id: 'silkie_grapefruit', weightGrams: 600, postHatchDay: 56 },
    { id: 'silkie_teapot', weightGrams: 1300, postHatchDay: 126 },
  ],
  leopard_gecko: [
    { id: 'gecko_raspberry', weightGrams: 3, postHatchDay: 0 },
    { id: 'gecko_mouse', weightGrams: 20, postHatchDay: 55 },
    { id: 'gecko_kiwi', weightGrams: 70, postHatchDay: 330 },
  ],
  green_sea_turtle: [
    { id: 'turtle_lime', weightGrams: 25, postHatchDay: 0 },
    { id: 'turtle_melon', weightGrams: 8_000, postHatchDay: 122 },
    { id: 'turtle_adults', weightGrams: 150_000, postHatchDay: 730 },
  ],
};

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
      title: emergence?.title ?? localized('Emergence', 'Schlupf'),
      scientificSummary:
        emergence?.scientificSummary ??
        localized(
          'The neonate leaves the shell and the post-hatch growth clock starts.',
          'Das Jungtier verlässt die Schale, und die Wachstumsuhr nach dem Schlupf beginnt.'
        ),
      audioTrigger: emergence?.audioTrigger ?? 'hatch_call',
    },
    {
      id: 'juvenile',
      stage: 'juvenile',
      day: incubationDays + juvenileDay,
      postHatchDay: juvenileDay,
      title: GROWTH_COPY[species.id].juvenile.title,
      scientificSummary: GROWTH_COPY[species.id].juvenile.scientificSummary,
      audioTrigger: 'hatch_call',
    },
    {
      id: 'adult',
      stage: 'adult',
      day: incubationDays + adultDays,
      postHatchDay: adultDays,
      title: GROWTH_COPY[species.id].adult.title,
      scientificSummary: GROWTH_COPY[species.id].adult.scientificSummary,
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
      title: localized('Today', 'Heute'),
    });
  }

  return marks;
}

export function getSizeReferences(
  species: SpeciesConfig
): readonly [SizeReference, SizeReference, SizeReference] {
  return SIZE_REFERENCES[species.id];
}

export function closestSizeReference(species: SpeciesConfig, grams: number): SizeReference {
  const references = getSizeReferences(species);
  const mass = Number.isFinite(grams) ? Math.max(0, grams) : 0;
  let best: SizeReference = references[0];
  let bestDistance = Math.abs(best.weightGrams - mass);
  for (const reference of references) {
    const distance = Math.abs(reference.weightGrams - mass);
    if (distance < bestDistance) {
      best = reference;
      bestDistance = distance;
    }
  }
  return best;
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
