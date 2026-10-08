export const SPECIES_IDS = [
  'silkie_chicken',
  'peregrine_falcon',
  'barn_owl',
  'mandarin_duck',
  'american_robin',
  'emperor_penguin',
  'common_ostrich',
  'emu',
  'leopard_gecko',
  'veiled_chameleon',
  'ball_python',
  'green_sea_turtle',
  'saltwater_crocodile',
  'platypus',
] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

/** Class used by the adoption roster filter. */
export type TaxonomicClass = 'aves' | 'reptilia' | 'monotremata';

/** Finer label shown on the hatchery plate. */
export type RosterTag =
  | 'galliform'
  | 'raptor'
  | 'strigiform'
  | 'waterfowl'
  | 'passerine'
  | 'sphenisciform'
  | 'ratite'
  | 'squamate'
  | 'testudine'
  | 'crocodilian'
  | 'monotreme';

export type EggShape = 'oval' | 'elliptical' | 'pear' | 'sphere' | 'elongated' | 'pitted';

export type SpeckleStyle = 'none' | 'fine' | 'mottled' | 'pitted';

export type AdultMetricKind = 'wingspan' | 'length';

export type ReferenceScale = 'coin' | 'hand' | 'person';

export const DIFFICULTY_TAGS = ['gentle', 'intermediate', 'patience_master'] as const;

export type DifficultyTag = (typeof DIFFICULTY_TAGS)[number];

export type PortraitStage = 'baby' | 'adult';

export interface SpeciesShowcase {
  /** Two or three field-guide facts shown before adoption. */
  funFacts: readonly [string, string] | readonly [string, string, string];
  /** Natural biome or region. */
  habitat: string;
  /** Short personality line for the dossier. */
  temperament: string;
  difficultyTag: DifficultyTag;
  /** Portrait catalog key for the hatchling plate, such as `silkie_chicken.baby`. */
  babyIllustration: string;
  /** Portrait catalog key for the adult plate, such as `silkie_chicken.adult`. */
  adultIllustration: string;
}

export interface ShellPaint {
  body: string;
  stroke: string;
  highlight: string;
  speckle: string;
  crack: string;
  castShadow: string;
}

export interface CandlePaint {
  body: string;
  stroke: string;
  highlight: string;
  speckle: string;
  interior: string;
  yolk: string;
}

export interface EggProfile {
  description: string;
  /** Shell length along the long axis, millimeters. */
  lengthMm: number;
  /** Shell width at the widest point, millimeters. */
  widthMm: number;
  /** Typical fresh egg mass, grams. */
  massGrams: number;
  shape: EggShape;
  speckle: SpeckleStyle;
  /** Opaque nest lighting. */
  nest: ShellPaint;
  /** Transilluminated candling palette. */
  candle: CandlePaint;
}

export interface GrowthStageCopy {
  title: string;
  scientificSummary: string;
}

export interface GrowthProfile {
  /** Radial backlight behind the adoption silhouettes. */
  glow: string;
  /** Holographic shadow fill. */
  shadow: string;
  /** Solid coat color once the animal has hatched. */
  body: string;
  /** Hatchling length, or wingspan for flying birds, in centimeters. */
  hatchlingMeasureCm: number;
  adultMetricKind: AdultMetricKind;
  /** Adult wingspan or total length, centimeters. */
  adultMeasureCm: number;
  referenceScale: ReferenceScale;
  /** Real-world size of the comparison object, centimeters. */
  referenceCentimeters: number;
  reference: string;
  behavior: string;
  fieldNotes: string;
}

export type DevelopmentStage =
  | 'cleavage'
  | 'vascular'
  | 'organogenesis'
  | 'internal_pip'
  | 'external_pip'
  | 'hatchling'
  | 'juvenile'
  | 'adult';

export type LifeStage = 'egg' | 'pip' | 'hatchling' | 'juvenile' | 'adult';

export type AudioMilestoneTrigger =
  | 'silent'
  | 'heartbeat'
  | 'embryo_movement'
  | 'internal_chirp'
  | 'shell_pip'
  | 'hatch_call';

export interface CandlingFeatures {
  bloodVesselsVisible: boolean;
  eyeSpotVisible: boolean;
  embryoSilhouettePct: number; // 0.0 to 1.0 of shell volume
  airCellPct: number; // 0.0 to 1.0 (grows larger over incubation)
  movementDetectable: boolean;
}

export interface BiologicalMilestone {
  day: number;
  stage: DevelopmentStage;
  title: string;
  scientificSummary: string;
  candling: CandlingFeatures;
  audioTrigger: AudioMilestoneTrigger;
}

export interface SpeciesConfig {
  id: SpeciesId;
  commonName: string;
  scientificName: string;
  incubationDays: number;
  adultMaturationDays: number;
  /** Typical mass at emergence, in grams. */
  hatchWeightGrams: number;
  /** Typical mature mass, in grams. Growth plateaus here. */
  adultWeightGrams: number;
  baseHeartRateBpm: number;
  temperatureTargetCelsius: number;
  humidityTargetPct: number;
  taxon: TaxonomicClass;
  tag: RosterTag;
  egg: EggProfile;
  growth: GrowthProfile;
  /** Post-hatch plumage or pattern, shown in the journal and growth preview. */
  juvenile: GrowthStageCopy;
  adult: GrowthStageCopy;
  showcase: SpeciesShowcase;
  milestones: BiologicalMilestone[];
}

export interface PetInstance {
  id: string;
  speciesId: SpeciesId;
  nickname: string;
  laidAtEpoch: number;
  lastVerifiedEpoch: number;
  lastInteractedEpoch: number;
  healthMultiplier: number; // 0.0 to 1.0 (modulates visual vibrancy, never kills)
  /** Nest temperature at `lastWarmedEpoch`, before deterministic cooling. */
  currentTemperatureCelsius: number;
  /** Substrate humidity at `lastMistedEpoch`, before deterministic drying. */
  currentHumidityPct: number;
  lastWarmedEpoch: number;
  lastMistedEpoch: number;
  /** Incubation vigor in [0.3, 1]. Neglect never lowers this through the floor. */
  vitalityScore: number;
  /** Set by a post-hatch feeding. Absent until the first logged meal. */
  lastFedEpoch?: number;
  /** Set by a post-hatch weighing. Absent until the first weigh-in. */
  lastWeighedEpoch?: number;
  isHatched: boolean;
  hatchedAtEpoch?: number;
}

export type ClockAnomaly = 'none' | 'rollback' | 'forward_jump';

export interface ClockResolution {
  effectiveEpoch: number;
  isClockTampered: boolean;
  anomaly: ClockAnomaly;
  shouldCommitVerifiedEpoch: boolean;
}

export interface ClockResolveOptions {
  /**
   * When set, wall-clock jumps larger than this window are treated as a live
   * forward-tamper: progress is frozen at `lastVerifiedEpoch` and the jumped
   * timestamp must not be persisted.
   *
   * Omit on genuine resume/catch-up so long absences still advance 1:1.
   */
  maxForwardAdvanceMs?: number;
}

export interface PetSnapshot {
  ageSeconds: number;
  ageDays: number;
  ageHours: number;
  /** Incubation completion in [0, 1]. Remains 1.0 after hatch. */
  progress: number;
  incubationProgress: number;
  /** Post-hatch growth toward adulthood in [0, 1]. 0 before hatch. */
  maturationProgress: number;
  /** Days since `hatchedAtEpoch`. Fractional; 0 before hatch. Frozen on clock rollback. */
  postHatchAgeDays: number;
  /** Deterministic mass in grams. 0 before hatch; plateaus at the species adult weight. */
  currentWeightGrams: number;
  /** Whole days remaining until `adultMaturationDays`. 0 before hatch and once adult. */
  daysUntilAdult: number;
  currentMilestone: BiologicalMilestone;
  currentHeartRate: number;
  lifeStage: LifeStage;
  isPipped: boolean;
  isReadyToHatch: boolean;
  isHatched: boolean;
  isClockTampered: boolean;
  clockAnomaly: ClockAnomaly;
}

export type PetInteractionKind = 'warm_nest' | 'mist_nest' | 'feed' | 'weigh' | 'pet';
