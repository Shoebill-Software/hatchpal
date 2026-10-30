import { formatCoord, createVesselTree, type EggLayout, type VesselTree } from '@/components/candlingGeometry';
import { clamp01, ramp, type CandlingStageDescriptor } from '@/components/candling/candlingStages';
import type { EggShape, SpeckleStyle, SpeciesId } from '@/domain/types';

/**
 * Candling reads as a shadow play: transmitted light, a mobile yolk, red
 * vitelline vessels, and a dark body whose plan matches the animal in the shell.
 * Poses are normalized to the egg (y negative is the blunt pole) and morphed
 * with incubation so the silhouette grows instead of swapping drawings.
 */

export type CandlingBodyPlan =
  | 'avian'
  | 'serpent'
  | 'lizard'
  | 'chameleon'
  | 'turtle'
  | 'crocodilian'
  | 'monotreme';

export interface CandlingSubject {
  id: SpeciesId;
  shape: EggShape;
  speckle: SpeckleStyle;
}

export interface CandlingDisc {
  cx: number;
  cy: number;
  r: number;
}

export interface CandlingOval {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export interface CandlingMark {
  path: string;
  /** Set for a rope (snake coil, leg, tail). Omitted for a filled silhouette. */
  strokeWidth?: number;
}

/** Procedural shell texture seen in transmitted light. */
export interface CandlingShellTexture {
  /** Pigment blotch coverage in [0, 1]. */
  pigment: number;
  /** Pigment cells per shell half-width: high for fine flecks, low for mottling. */
  pigmentScale: number;
  /** 0 draws pigment as separate flecks, 1 as merged organic patches. */
  blotch: number;
  /** Bright pore pinpricks in [0, 1]. */
  pores: number;
  /** Uneven calcium contrast in the glow. */
  mottle: number;
  seed: number;
}

export interface CandlingAnatomy {
  bodyPlan: CandlingBodyPlan;
  yolk: CandlingOval;
  chalazae: { path: string; opacity: number } | null;
  germinalDisc: (CandlingDisc & { opacity: number }) | null;
  allantois: (CandlingDisc & { opacity: number }) | null;
  /** Vitelline field on the yolk sac; it fades once the growing body hides the yolk. */
  vessels: VesselTree & { opacity: number };
  /** Chorioallantoic net lining the shell; it stays visible in the lit rim after the body covers the yolk. */
  membraneVessels: (VesselTree & { opacity: number }) | null;
  /** Where the body's shadow pools once it crowds the shell. */
  mass: CandlingDisc;
  body: CandlingMark;
  /** Round head cap for a coiled body. Avian heads are already part of the fill. */
  head: CandlingDisc | null;
  limbs: string[];
  leg: CandlingMark | null;
  tail: CandlingMark | null;
  crest: string | null;
  carapace: CandlingOval | null;
  scutes: string | null;
  beak: string | null;
  eye: CandlingDisc | null;
  heart: CandlingDisc | null;
  /** `contents` is everything below the membrane, so albumen never tints the air cell. */
  airCell: { fill: string; membrane: string; contents: string; depth: number };
  shell: CandlingShellTexture;
  metrics: {
    headRadius: number;
    yolkRadius: number;
    beakReach: number;
    coilLength: number;
  };
}

type Sample = { x: number; y: number; r: number };
type Point = { x: number; y: number };

type Accent = {
  head: number;
  wing: number;
  wingWidth: number;
  leg: number;
  beak: number;
  hook: number;
  broad: boolean;
  flipper: boolean;
};

const AVIAN_EARLY: readonly Sample[] = [
  { x: 0.04, y: -0.06, r: 0.05 },
  { x: 0.1, y: 0.0, r: 0.034 },
  { x: 0.05, y: 0.07, r: 0.03 },
  { x: -0.03, y: 0.12, r: 0.024 },
  { x: -0.09, y: 0.08, r: 0.018 },
  { x: -0.1, y: 0.02, r: 0.014 },
];

const AVIAN_MID: readonly Sample[] = [
  { x: 0.06, y: -0.26, r: 0.15 },
  { x: 0.16, y: -0.1, r: 0.085 },
  { x: 0.02, y: 0.04, r: 0.14 },
  { x: -0.16, y: 0.18, r: 0.16 },
  { x: -0.04, y: 0.34, r: 0.08 },
  { x: 0.14, y: 0.3, r: 0.045 },
];

const AVIAN_LATE: readonly Sample[] = [
  { x: 0.14, y: -0.3, r: 0.17 },
  { x: 0.0, y: -0.14, r: 0.11 },
  { x: -0.22, y: 0.02, r: 0.19 },
  { x: -0.06, y: 0.22, r: 0.22 },
  { x: 0.18, y: 0.32, r: 0.13 },
  { x: 0.16, y: 0.48, r: 0.05 },
];

const LIZARD_EARLY: readonly Sample[] = [
  { x: 0.02, y: -0.04, r: 0.04 },
  { x: 0.08, y: 0.02, r: 0.028 },
  { x: 0.04, y: 0.08, r: 0.026 },
  { x: -0.04, y: 0.12, r: 0.02 },
  { x: -0.1, y: 0.08, r: 0.014 },
  { x: -0.12, y: 0.02, r: 0.01 },
];

const LIZARD_MID: readonly Sample[] = [
  { x: -0.02, y: -0.18, r: 0.09 },
  { x: 0.1, y: -0.05, r: 0.05 },
  { x: 0.1, y: 0.09, r: 0.075 },
  { x: -0.02, y: 0.18, r: 0.05 },
  { x: -0.16, y: 0.22, r: 0.03 },
  { x: -0.26, y: 0.1, r: 0.016 },
];

const LIZARD_LATE: readonly Sample[] = [
  { x: -0.02, y: -0.28, r: 0.12 },
  { x: 0.12, y: -0.12, r: 0.07 },
  { x: 0.14, y: 0.06, r: 0.1 },
  { x: -0.02, y: 0.2, r: 0.075 },
  { x: -0.22, y: 0.32, r: 0.04 },
  { x: -0.34, y: 0.16, r: 0.02 },
];

const TURTLE_EARLY: readonly Sample[] = [
  { x: 0.0, y: -0.04, r: 0.046 },
  { x: 0.01, y: 0.02, r: 0.04 },
  { x: 0.0, y: 0.08, r: 0.052 },
  { x: 0.0, y: 0.13, r: 0.046 },
  { x: 0.0, y: 0.17, r: 0.02 },
  { x: 0.0, y: 0.2, r: 0.014 },
];

const TURTLE_MID: readonly Sample[] = [
  { x: 0.0, y: -0.22, r: 0.1 },
  { x: 0.0, y: -0.08, r: 0.068 },
  { x: 0.0, y: 0.06, r: 0.15 },
  { x: -0.01, y: 0.16, r: 0.13 },
  { x: 0.0, y: 0.28, r: 0.04 },
  { x: 0.02, y: 0.34, r: 0.024 },
];

const TURTLE_LATE: readonly Sample[] = [
  { x: 0.02, y: -0.3, r: 0.13 },
  { x: 0.0, y: -0.14, r: 0.09 },
  { x: -0.02, y: 0.04, r: 0.22 },
  { x: 0.0, y: 0.18, r: 0.2 },
  { x: 0.02, y: 0.36, r: 0.055 },
  { x: 0.04, y: 0.44, r: 0.03 },
];

const CROC_EARLY: readonly Sample[] = [
  { x: 0.02, y: -0.1, r: 0.028 },
  { x: 0.02, y: -0.02, r: 0.046 },
  { x: 0.0, y: 0.06, r: 0.04 },
  { x: -0.04, y: 0.12, r: 0.032 },
  { x: -0.02, y: 0.18, r: 0.02 },
  { x: 0.04, y: 0.22, r: 0.014 },
];

const CROC_MID: readonly Sample[] = [
  { x: 0.06, y: -0.34, r: 0.034 },
  { x: 0.04, y: -0.2, r: 0.082 },
  { x: -0.02, y: -0.04, r: 0.1 },
  { x: -0.08, y: 0.12, r: 0.13 },
  { x: 0.04, y: 0.26, r: 0.068 },
  { x: 0.16, y: 0.36, r: 0.034 },
];

const CROC_LATE: readonly Sample[] = [
  { x: 0.08, y: -0.32, r: 0.045 },
  { x: 0.04, y: -0.18, r: 0.11 },
  { x: -0.1, y: 0.0, r: 0.16 },
  { x: -0.08, y: 0.2, r: 0.18 },
  { x: 0.1, y: 0.34, r: 0.09 },
  { x: 0.2, y: 0.46, r: 0.04 },
];

const MONO_EARLY: readonly Sample[] = [
  { x: 0.0, y: -0.02, r: 0.042 },
  { x: 0.06, y: 0.03, r: 0.03 },
  { x: 0.02, y: 0.08, r: 0.028 },
  { x: -0.04, y: 0.1, r: 0.022 },
  { x: -0.08, y: 0.05, r: 0.016 },
  { x: -0.05, y: 0.0, r: 0.012 },
];

const MONO_MID: readonly Sample[] = [
  { x: 0.02, y: -0.16, r: 0.09 },
  { x: 0.1, y: -0.04, r: 0.055 },
  { x: 0.02, y: 0.08, r: 0.09 },
  { x: -0.1, y: 0.16, r: 0.07 },
  { x: -0.12, y: 0.26, r: 0.038 },
  { x: -0.02, y: 0.3, r: 0.024 },
];

const MONO_LATE: readonly Sample[] = [
  { x: 0.04, y: -0.26, r: 0.13 },
  { x: 0.02, y: -0.1, r: 0.09 },
  { x: -0.14, y: 0.06, r: 0.15 },
  { x: -0.02, y: 0.22, r: 0.16 },
  { x: 0.16, y: 0.32, r: 0.08 },
  { x: 0.12, y: 0.44, r: 0.04 },
];

/** Pose follows the milestone silhouette, so a mid-incubation candle already has a head, eye, and limbs. */
function visualGrowth(stage: CandlingStageDescriptor): number {
  return clamp01(ramp(stage.embryo, 0.04, 0.88));
}

export function candlingBodyPlan(speciesId: SpeciesId): CandlingBodyPlan {
  switch (speciesId) {
    case 'ball_python':
      return 'serpent';
    case 'leopard_gecko':
      return 'lizard';
    case 'veiled_chameleon':
      return 'chameleon';
    case 'green_sea_turtle':
      return 'turtle';
    case 'saltwater_crocodile':
      return 'crocodilian';
    case 'platypus':
      return 'monotreme';
    default:
      return 'avian';
  }
}

export function buildCandlingAnatomy(
  layout: EggLayout,
  stage: CandlingStageDescriptor,
  subject: CandlingSubject,
  options?: { beakInAirCell?: boolean },
): CandlingAnatomy {
  const plan = candlingBodyPlan(subject.id);
  const growth = visualGrowth(stage);
  const beakInAirCell = options?.beakInAirCell ?? false;
  const accent = accentFor(subject.id);
  const posed = poseBody(plan, layout, growth, accent, beakInAirCell);

  const yolk = yolkOval(layout, stage, posed.yolkAnchor);
  const chalazaOpacity = clamp01(stage.yolk * (1 - ramp(growth, 0.25, 0.7)));
  const discOpacity = clamp01(1 - stage.vessels * 1.35) * clamp01(1 - growth * 4.2);
  const allantoisOpacity = clamp01(stage.vessels * (1 - stage.crowding * 0.85)) * 0.72;
  const settle = ramp(growth, 0.3, 0.6);
  const vesselOrigin = {
    x: posed.headSample.x + (posed.yolkAnchor.x - posed.headSample.x) * settle,
    y: posed.headSample.y + (posed.yolkAnchor.y - posed.headSample.y) * settle,
  };
  const vesselSpread = Math.max(layout.rx * 0.3, (yolk.width + yolk.height) * 0.24) * (0.78 + stage.vessels * 0.4);
  const seed = speciesSeed(subject.id);
  // Chorioallantoic net tracks silhouette growth from milestone data, not a progress timer.
  const membraneAmount = ramp(stage.embryo, 0.06, 0.42);

  const airCell = airCellArt(layout, stage.airCell);

  return {
    bodyPlan: plan,
    yolk,
    chalazae:
      chalazaOpacity > 0.05
        ? { path: chalazaRopes(yolk, layout), opacity: chalazaOpacity }
        : null,
    germinalDisc:
      discOpacity > 0.05
        ? {
            cx: yolk.cx + layout.rx * 0.02,
            cy: yolk.cy - yolk.height * 0.14,
            r: Math.max(3, layout.rx * 0.046),
            opacity: discOpacity,
          }
        : null,
    allantois:
      allantoisOpacity > 0.04
        ? {
            cx: layout.cx,
            cy: layout.cy + layout.ry * 0.02,
            r: layout.rx * (0.4 + stage.vessels * 0.62),
            opacity: allantoisOpacity,
          }
        : null,
    vessels: {
      ...createVesselTree(vesselOrigin.x, vesselOrigin.y, vesselSpread, { seed, arms: 9, depth: 4 }),
      // Milestone `vessels` already drops once the body covers the yolk sac; only a light
      // late dim remains so the spider does not fight a nearly opaque silhouette.
      opacity: clamp01(stage.vessels * (1 - ramp(stage.embryo, 0.62, 0.95) * 0.35)),
    },
    membraneVessels:
      membraneAmount > 0.04
        ? {
            ...createVesselTree(
              posed.mass.cx + layout.rx * 0.18,
              posed.mass.cy + layout.ry * 0.06,
              Math.max(layout.rx, layout.ry) * (0.55 + membraneAmount * 0.75),
              { seed: seed + 101, arms: 8, depth: 5, wiggle: 1.05 },
            ),
            opacity: membraneAmount,
          }
        : null,
    mass: posed.mass,
    body: posed.body,
    head: posed.head,
    limbs: posed.limbs,
    leg: posed.leg,
    tail: posed.tail,
    crest: posed.crest,
    carapace: posed.carapace,
    scutes: posed.scutes,
    beak: posed.beak,
    eye: eyeFor(posed.headSample, stage, plan),
    heart: heartFor(posed.headSample, posed.neckSample, layout, stage, growth),
    airCell,
    shell: shellTexture(subject, seed),
    metrics: {
      headRadius: posed.headSample.r,
      yolkRadius: (yolk.width + yolk.height) / 4,
      beakReach: posed.beakReach,
      coilLength: posed.coilLength,
    },
  };
}

function accentFor(id: SpeciesId): Accent {
  switch (id) {
    case 'peregrine_falcon':
    case 'barn_owl':
      return { head: 1.16, wing: 0.9, wingWidth: 0.95, leg: 0.85, beak: 0.72, hook: 1, broad: false, flipper: false };
    case 'mandarin_duck':
      return { head: 1.04, wing: 1, wingWidth: 1.08, leg: 0.9, beak: 1.2, hook: 0, broad: true, flipper: false };
    case 'emperor_penguin':
      return { head: 1.1, wing: 0.8, wingWidth: 1.65, leg: 0.62, beak: 0.78, hook: 0, broad: false, flipper: true };
    case 'common_ostrich':
    case 'emu':
      return { head: 0.9, wing: 0.3, wingWidth: 0.55, leg: 1.5, beak: 0.74, hook: 0, broad: false, flipper: false };
    case 'american_robin':
      return { head: 1.22, wing: 1.08, wingWidth: 0.82, leg: 0.72, beak: 0.56, hook: 0, broad: false, flipper: false };
    default:
      return { head: 1, wing: 1, wingWidth: 1, leg: 1.12, beak: 0.84, hook: 0, broad: false, flipper: false };
  }
}

interface PosedBody {
  body: CandlingMark;
  head: CandlingDisc | null;
  headSample: Sample;
  neckSample: Sample;
  yolkAnchor: Sample;
  mass: CandlingDisc;
  limbs: string[];
  leg: CandlingMark | null;
  tail: CandlingMark | null;
  crest: string | null;
  carapace: CandlingOval | null;
  scutes: string | null;
  beak: string | null;
  beakReach: number;
  coilLength: number;
}

function poseBody(
  plan: CandlingBodyPlan,
  layout: EggLayout,
  growth: number,
  accent: Accent,
  beakInAirCell: boolean,
): PosedBody {
  if (plan === 'serpent') {
    return poseSerpent(layout, growth, beakInAirCell);
  }

  const table = poseTable(plan);
  const morph = morphPose(table.early, table.mid, table.late, growth);
  if (plan === 'chameleon') {
    morph[0] = { ...morph[0], r: morph[0].r * 1.28 };
  }
  if (plan === 'crocodilian' && beakInAirCell) {
    morph[0] = { ...morph[0], y: morph[0].y - 0.08 };
  }
  const samples = smoothPose(placePose(morph, layout, plan === 'avian' ? accent.head : 1), 4);
  const headSample = samples[0];
  const neckSample = samples[Math.min(4, samples.length - 1)];
  const chest = samples[Math.min(Math.floor(samples.length * 0.42), samples.length - 1)];
  const hip = samples[Math.min(Math.floor(samples.length * 0.68), samples.length - 1)];
  const facing = normalize(headSample.x - neckSample.x, headSample.y - neckSample.y);
  const up = { x: facing.x * 0.35 + 0.15, y: Math.min(facing.y, -0.55) };

  const limbs: string[] = [];
  let leg: CandlingMark | null = null;
  let tail: CandlingMark | null = null;
  let crest: string | null = null;
  let carapace: CandlingOval | null = null;
  let scutes: string | null = null;
  let beak: string | null = null;
  let beakReach = 0;

  if (plan === 'avian') {
    const wingAmount = ramp(growth, 0.22, 0.48) * accent.wing;
    if (wingAmount > 0.08) {
      const length = layout.rx * (accent.flipper ? 0.36 : 0.28) * wingAmount;
      // Wings fold back over the flank instead of reaching into the open curl.
      const lift = accent.flipper ? 0.5 : 0.62;
      limbs.push(
        paddle(
          chest.x + chest.r * 0.72,
          chest.y,
          chest.x + chest.r * 0.72 + length,
          chest.y + length * lift,
          layout.rx * 0.055 * accent.wingWidth,
        ),
      );
    }
    const budAmount = ramp(growth, 0.14, 0.26) * (1 - ramp(growth, 0.36, 0.5));
    if (budAmount > 0.08) {
      limbs.push(
        ...pairedBuds(chest, layout.rx * 0.045 * budAmount),
        ...pairedBuds(hip, layout.rx * 0.038 * budAmount),
      );
    }
    const legAmount = ramp(growth, 0.36, 0.6) * accent.leg;
    if (legAmount > 0.08) {
      leg = foldedLeg(hip, layout.rx * 0.34 * legAmount);
    }
    const beakAmount = ramp(growth, 0.32, 0.58);
    if (beakAmount > 0.06) {
      beakReach = headSample.r * (0.22 + accent.beak * 0.28) * beakAmount + (beakInAirCell ? headSample.r * 0.48 : 0);
      beak = accent.broad
        ? billPath(headSample, beakReach, 1.2)
        : hookedBeak(headSample, beakReach, accent.hook);
    }
  } else if (plan === 'turtle') {
    const paddles = ramp(growth, 0.22, 0.55);
    if (paddles > 0.06) {
      const front = layout.rx * 0.34 * paddles;
      const rear = layout.rx * 0.22 * paddles;
      limbs.push(
        paddle(chest.x - chest.r * 0.4, chest.y, chest.x - chest.r - front, chest.y - front * 0.72, front * 0.38),
        paddle(chest.x + chest.r * 0.4, chest.y, chest.x + chest.r + front, chest.y - front * 0.55, front * 0.38),
        paddle(hip.x - hip.r * 0.3, hip.y, hip.x - hip.r - rear, hip.y + rear * 0.55, rear * 0.34),
        paddle(hip.x + hip.r * 0.3, hip.y, hip.x + hip.r + rear * 0.85, hip.y + rear * 0.6, rear * 0.32),
      );
    }
    if (growth > 0.32) {
      carapace = shellDisc(chest, hip);
    }
    const beakAmount = ramp(growth, 0.38, 0.62);
    if (beakAmount > 0.06) {
      beakReach = headSample.r * 0.55 * beakAmount + (beakInAirCell ? headSample.r * 0.9 : 0);
      beak = directedBeak(headSample, up.x, up.y, beakReach, headSample.r * 0.34);
    }
  } else if (plan === 'crocodilian') {
    const buds = ramp(growth, 0.28, 0.5);
    if (buds > 0.06) {
      const reach = layout.rx * 0.16 * buds;
      limbs.push(
        stickLimb(chest, Math.PI * 0.82, reach, reach * 0.28),
        stickLimb(chest, Math.PI * 0.18, reach * 0.9, reach * 0.26),
        stickLimb(hip, Math.PI * 0.7, reach * 0.8, reach * 0.24),
        stickLimb(hip, Math.PI * 0.28, reach * 0.75, reach * 0.22),
      );
    }
    if (growth > 0.55) {
      scutes = scuteMarks(samples);
    }
    if (beakInAirCell || growth > 0.7) {
      beakReach = headSample.r * 0.9 + (beakInAirCell ? layout.ry * 0.06 : 0);
      beak = directedBeak(headSample, 0.15, -1, beakReach, Math.max(headSample.r * 0.9, layout.rx * 0.03));
    }
  } else if (plan === 'monotreme') {
    const buds = ramp(growth, 0.24, 0.5);
    if (buds > 0.06) {
      const reach = layout.rx * 0.12 * buds;
      limbs.push(
        stickLimb(chest, Math.PI * 0.85, reach, reach * 0.34),
        stickLimb(chest, Math.PI * 0.15, reach, reach * 0.34),
        stickLimb(hip, Math.PI * 0.72, reach * 0.85, reach * 0.3),
        stickLimb(hip, Math.PI * 0.28, reach * 0.85, reach * 0.3),
      );
    }
    const bill = ramp(growth, 0.3, 0.55);
    if (bill > 0.06) {
      beakReach = headSample.r * (0.35 + bill * 0.4) + (beakInAirCell ? headSample.r * 0.45 : 0);
      beak = billPath(headSample, beakReach, 1.35);
    }
  } else {
    const buds = ramp(growth, 0.2, 0.48);
    if (buds > 0.06) {
      const reach = layout.rx * 0.16 * buds;
      limbs.push(
        stickLimb(chest, Math.PI * 0.78, reach, reach * 0.22),
        stickLimb(chest, Math.PI * 0.22, reach * 0.85, reach * 0.2),
        stickLimb(hip, Math.PI * 0.62, reach * 0.9, reach * 0.2),
        stickLimb(hip, Math.PI * 0.35, reach * 0.75, reach * 0.18),
      );
    }
    if (plan === 'chameleon' && growth > 0.34) {
      crest = casque(headSample);
      tail = spiralTail(samples[samples.length - 1], growth, layout);
    }
    const snout = ramp(growth, 0.4, 0.62);
    if (snout > 0.06) {
      beakReach = headSample.r * 0.38 * snout + (beakInAirCell ? headSample.r * 0.4 : 0);
      beak = directedBeak(headSample, up.x, up.y, beakReach, headSample.r * 0.42);
    }
  }

  return {
    body: { path: ribbonPath(samples) },
    head: null,
    headSample,
    neckSample,
    yolkAnchor: hip,
    mass: massOf(samples),
    limbs,
    leg,
    tail,
    crest,
    carapace,
    scutes,
    beak,
    beakReach,
    coilLength: 0,
  };
}

function poseSerpent(layout: EggLayout, growth: number, beakInAirCell: boolean): PosedBody {
  const turns = 1.3 + growth * 1.7;
  const maxRadius = 0.1 + growth * 0.46;
  const steps = 112;
  const samples: Sample[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = 0.5 + t * turns * Math.PI * 2;
    // Turn spacing stays just above the body's width so the coils press together with a thin seam of light between them.
    const radius = (0.05 + t * maxRadius) * (1 + Math.sin(angle * 2.3 + 0.8) * 0.05);
    const taper = Math.min(1, t * 1.25) * (1 - Math.max(0, t - 0.94) * 4);
    const girth = layout.rx * (0.012 + taper * (0.022 + growth * 0.036));
    samples.push({
      x: layout.cx + Math.cos(angle) * radius * layout.rx * 0.92,
      y: layout.cy + Math.sin(angle) * radius * layout.rx * 0.8 + growth * layout.ry * 0.08,
      r: Math.max(1.1, girth),
    });
  }
  const headSample = samples[samples.length - 1];
  const neckSample = samples[samples.length - 2];
  const facing = normalize(headSample.x - neckSample.x, headSample.y - neckSample.y);
  const anchor = samples[Math.floor(samples.length * 0.4)];
  const headR = Math.max(2.4, layout.rx * (0.045 + growth * 0.04));
  const head = {
    x: headSample.x + facing.x * headR * 0.45,
    y: headSample.y + facing.y * headR * 0.45,
    r: headR,
  };
  const snout = ramp(growth, 0.42, 0.66);
  const beakReach = snout > 0.06 ? headR * (0.9 + snout * 0.55) + (beakInAirCell ? headR * 1.2 : 0) : 0;
  return {
    body: { path: ribbonPath(samples) },
    head: { cx: head.x, cy: head.y, r: headR },
    headSample: head,
    neckSample,
    yolkAnchor: anchor,
    mass: massOf(samples),
    limbs: [],
    leg: null,
    tail: null,
    crest: null,
    carapace: null,
    scutes: null,
    beak: beakReach > 0 ? directedBeak(head, facing.x, facing.y, beakReach, headR * 0.72) : null,
    beakReach,
    coilLength: polylineLength(samples),
  };
}

function poseTable(plan: CandlingBodyPlan): { early: readonly Sample[]; mid: readonly Sample[]; late: readonly Sample[] } {
  switch (plan) {
    case 'lizard':
    case 'chameleon':
      return { early: LIZARD_EARLY, mid: LIZARD_MID, late: LIZARD_LATE };
    case 'turtle':
      return { early: TURTLE_EARLY, mid: TURTLE_MID, late: TURTLE_LATE };
    case 'crocodilian':
      return { early: CROC_EARLY, mid: CROC_MID, late: CROC_LATE };
    case 'monotreme':
      return { early: MONO_EARLY, mid: MONO_MID, late: MONO_LATE };
    case 'avian':
    case 'serpent':
    default:
      return { early: AVIAN_EARLY, mid: AVIAN_MID, late: AVIAN_LATE };
  }
}

function morphPose(early: readonly Sample[], mid: readonly Sample[], late: readonly Sample[], growth: number): Sample[] {
  const g = clamp01(growth);
  if (g <= 0.42) {
    const t = g / 0.42;
    return early.map((sample, index) => lerpSample(sample, mid[index], t));
  }
  const t = (g - 0.42) / 0.58;
  return mid.map((sample, index) => lerpSample(sample, late[index], t));
}

function lerpSample(a: Sample, b: Sample, t: number): Sample {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    r: a.r + (b.r - a.r) * t,
  };
}

function placePose(pose: readonly Sample[], layout: EggLayout, headScale: number): Sample[] {
  return pose.map((sample, index) => ({
    x: layout.cx + sample.x * layout.rx,
    y: layout.cy + sample.y * layout.ry,
    r: Math.max(1.2, sample.r * layout.rx * (index === 0 ? headScale : 1)),
  }));
}

function smoothPose(samples: Sample[], segments: number): Sample[] {
  if (samples.length < 3) {
    return samples;
  }
  const out: Sample[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const p0 = samples[Math.max(0, index - 1)];
    const p1 = samples[index];
    const p2 = samples[index + 1];
    const p3 = samples[Math.min(samples.length - 1, index + 2)];
    for (let step = 0; step < segments; step += 1) {
      const t = step / segments;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
        r: Math.max(1, catmull(p0.r, p1.r, p2.r, p3.r, t)),
      });
    }
  }
  out.push(samples[samples.length - 1]);
  return out;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function ribbonPath(samples: Sample[]): string {
  if (samples.length < 2) {
    return '';
  }
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index < samples.length; index += 1) {
    const prev = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const sample = samples[index];
    left.push({ x: sample.x - tangent.y * sample.r, y: sample.y + tangent.x * sample.r });
    right.push({ x: sample.x + tangent.y * sample.r, y: sample.y - tangent.x * sample.r });
  }
  const headOut = normalize(samples[0].x - samples[1].x, samples[0].y - samples[1].y);
  const last = samples.length - 1;
  const tailOut = normalize(samples[last].x - samples[last - 1].x, samples[last].y - samples[last - 1].y);
  const tailCap = arcPoints(left[last], right[last], samples[last], tailOut.x, tailOut.y);
  const headCap = arcPoints(right[0], left[0], samples[0], headOut.x, headOut.y);
  return pathFrom([...left, ...tailCap, ...[...right].reverse(), ...headCap], true);
}

function arcPoints(from: Point, to: Point, center: Sample, outwardX: number, outwardY: number): Point[] {
  const start = Math.atan2(from.y - center.y, from.x - center.x);
  const end = Math.atan2(to.y - center.y, to.x - center.x);
  let sweep = end - start;
  while (sweep <= -Math.PI) {
    sweep += Math.PI * 2;
  }
  while (sweep > Math.PI) {
    sweep -= Math.PI * 2;
  }
  const mid = start + sweep / 2;
  const dot = Math.cos(mid) * outwardX + Math.sin(mid) * outwardY;
  if (dot < 0) {
    sweep += sweep > 0 ? -Math.PI * 2 : Math.PI * 2;
  }
  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  const steps = 6;
  const points: Point[] = [];
  for (let index = 1; index <= steps; index += 1) {
    const angle = start + (sweep * index) / steps;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

function eyeFor(head: Sample, stage: CandlingStageDescriptor, plan: CandlingBodyPlan): CandlingDisc | null {
  if (stage.eye < 0.04) {
    return null;
  }
  const scale = plan === 'avian' ? 0.42 : plan === 'monotreme' ? 0.26 : 0.32;
  const r = Math.max(2.3, head.r * scale * (0.6 + stage.eye * 0.4));
  return {
    cx: head.x + head.r * 0.12,
    cy: head.y + head.r * 0.02,
    r,
  };
}

function heartFor(
  head: Sample,
  neck: Sample,
  layout: EggLayout,
  stage: CandlingStageDescriptor,
  growth: number,
): CandlingDisc | null {
  if (stage.vessels < 0.08 || stage.embryo > 0.58 || stage.crowding > 0.2) {
    return null;
  }
  return {
    cx: head.x * 0.42 + neck.x * 0.58,
    cy: head.y * 0.42 + neck.y * 0.58,
    r: Math.max(3.1, layout.rx * (0.028 + growth * 0.012)),
  };
}

function yolkOval(layout: EggLayout, stage: CandlingStageDescriptor, anchor: Sample): CandlingOval {
  const shrink = 1 - clamp01(stage.embryo) * 0.78;
  const rx = layout.rx * (0.18 + 0.48 * shrink);
  const ry = layout.ry * (0.12 + 0.38 * shrink);
  const restX = layout.cx + layout.rx * 0.02;
  const restY = layout.cy + layout.ry * 0.06;
  const tuck = ramp(stage.embryo, 0.35, 0.85);
  const cx = restX + (anchor.x + layout.rx * 0.12 - restX) * tuck;
  const cy = restY + (anchor.y + layout.ry * 0.04 - restY) * tuck;
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2, cx, cy };
}

function chalazaRopes(yolk: CandlingOval, layout: EggLayout): string {
  return [
    twistedRope(yolk.cx, yolk.y + yolk.height * 0.08, layout.cx, layout.cy - layout.ry * 0.58, layout.rx * 0.045),
    twistedRope(
      yolk.cx,
      yolk.y + yolk.height * 0.92,
      layout.cx,
      layout.cy + layout.ry * 0.78,
      layout.rx * 0.04,
    ),
  ].join(' ');
}

function twistedRope(x1: number, y1: number, x2: number, y2: number, amp: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * amp;
  const py = (dx / len) * amp;
  const a = { x: x1 + dx * 0.33, y: y1 + dy * 0.33 };
  const mid = { x: x1 + dx * 0.5, y: y1 + dy * 0.5 };
  const b = { x: x1 + dx * 0.72, y: y1 + dy * 0.72 };
  return [
    `M ${formatCoord(x1)} ${formatCoord(y1)}`,
    `Q ${formatCoord(a.x + px)} ${formatCoord(a.y + py)} ${formatCoord(mid.x - px * 0.25)} ${formatCoord(mid.y - py * 0.25)}`,
    `Q ${formatCoord(b.x - px)} ${formatCoord(b.y - py)} ${formatCoord(x2)} ${formatCoord(y2)}`,
    `M ${formatCoord(x1)} ${formatCoord(y1)}`,
    `Q ${formatCoord(a.x - px)} ${formatCoord(a.y - py)} ${formatCoord(mid.x + px * 0.25)} ${formatCoord(mid.y + py * 0.25)}`,
    `Q ${formatCoord(b.x + px)} ${formatCoord(b.y + py)} ${formatCoord(x2)} ${formatCoord(y2)}`,
  ].join(' ');
}

function massOf(samples: readonly Sample[]): CandlingDisc {
  let weight = 0;
  let x = 0;
  let y = 0;
  for (const sample of samples) {
    x += sample.x * sample.r;
    y += sample.y * sample.r;
    weight += sample.r;
  }
  const cx = weight > 0 ? x / weight : samples[0].x;
  const cy = weight > 0 ? y / weight : samples[0].y;
  let r = 0;
  for (const sample of samples) {
    r = Math.max(r, Math.hypot(sample.x - cx, sample.y - cy) + sample.r);
  }
  return { cx, cy, r: Math.max(2, r) };
}

function airCellArt(
  layout: EggLayout,
  amount: number,
): { fill: string; membrane: string; contents: string; depth: number } {
  const depth = layout.ry * (0.1 + clamp01(amount) * 0.58);
  const top = layout.cy - layout.ry;
  const membraneY = top + depth;
  const bow = layout.rx * (0.24 + clamp01(amount) * 0.36);
  const left = layout.cx - layout.rx * 1.1;
  const right = layout.cx + layout.rx * 1.1;
  const capTop = top - layout.ry * 0.4;
  const fill = [
    `M ${formatCoord(left)} ${formatCoord(capTop)}`,
    `L ${formatCoord(right)} ${formatCoord(capTop)}`,
    `L ${formatCoord(right)} ${formatCoord(membraneY)}`,
    `Q ${formatCoord(layout.cx)} ${formatCoord(membraneY + bow)} ${formatCoord(left)} ${formatCoord(membraneY)}`,
    'Z',
  ].join(' ');
  const half = layout.rx * 1.1;
  const membrane = `M ${formatCoord(layout.cx - half)} ${formatCoord(membraneY)} Q ${formatCoord(layout.cx)} ${formatCoord(membraneY + bow)} ${formatCoord(layout.cx + half)} ${formatCoord(membraneY)}`;
  const floor = layout.cy + layout.ry * 1.4;
  const contents = [
    `M ${formatCoord(left)} ${formatCoord(membraneY)}`,
    `Q ${formatCoord(layout.cx)} ${formatCoord(membraneY + bow)} ${formatCoord(right)} ${formatCoord(membraneY)}`,
    `L ${formatCoord(right)} ${formatCoord(floor)}`,
    `L ${formatCoord(left)} ${formatCoord(floor)}`,
    'Z',
  ].join(' ');
  return { fill, membrane, contents, depth };
}

function shellTexture(subject: CandlingSubject, seed: number): CandlingShellTexture {
  const offset = (seed % 61) * 1.7;
  if (subject.speckle === 'pitted' || subject.shape === 'pitted') {
    return { pigment: 0, pigmentScale: 10, blotch: 0, pores: 0.85, mottle: 0.15, seed: offset };
  }
  switch (subject.speckle) {
    case 'mottled':
      return { pigment: 0.75, pigmentScale: 2.4, blotch: 1, pores: 0, mottle: 0.12, seed: offset };
    case 'fine':
      return { pigment: 0.16, pigmentScale: 15, blotch: 0, pores: 0.1, mottle: 0.1, seed: offset };
    case 'none':
    default:
      return { pigment: 0, pigmentScale: 10, blotch: 0, pores: 0, mottle: 0.07, seed: offset };
  }
}

function speciesSeed(id: SpeciesId): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619) >>> 0;
  }
  return hash % 9973;
}

function paddle(ax: number, ay: number, bx: number, by: number, width: number): string {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * width;
  const py = (dx / len) * width;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  return [
    `M ${formatCoord(ax)} ${formatCoord(ay)}`,
    `Q ${formatCoord(mx + px)} ${formatCoord(my + py)} ${formatCoord(bx)} ${formatCoord(by)}`,
    `Q ${formatCoord(mx - px)} ${formatCoord(my - py)} ${formatCoord(ax)} ${formatCoord(ay)}`,
    'Z',
  ].join(' ');
}

function pairedBuds(sample: Sample, radius: number): string[] {
  const rx = Math.max(1.4, radius);
  const ry = rx * 0.62;
  return [ellipsePath(sample.x - sample.r - rx * 0.2, sample.y, rx, ry), ellipsePath(sample.x + sample.r + rx * 0.2, sample.y, rx, ry)];
}

function stickLimb(sample: Sample, angle: number, length: number, width: number): string {
  const startX = sample.x + Math.cos(angle) * sample.r * 0.82;
  const startY = sample.y + Math.sin(angle) * sample.r * 0.82;
  const tipX = sample.x + Math.cos(angle) * (sample.r + length);
  const tipY = sample.y + Math.sin(angle) * (sample.r + length);
  return paddle(startX, startY, tipX, tipY, width);
}

/** Thigh forward, shank folded back up the belly, toes tucked toward the head. */
function foldedLeg(hip: Sample, length: number): CandlingMark {
  const kneeX = hip.x + length * 0.34;
  const kneeY = hip.y + length * 0.2;
  const ankleX = kneeX + length * 0.1;
  const ankleY = kneeY - length * 0.62;
  const toeX = ankleX - length * 0.16;
  const toeY = ankleY - length * 0.3;
  return {
    path: `M ${formatCoord(hip.x)} ${formatCoord(hip.y)} L ${formatCoord(kneeX)} ${formatCoord(kneeY)} L ${formatCoord(ankleX)} ${formatCoord(ankleY)} L ${formatCoord(toeX)} ${formatCoord(toeY)}`,
    strokeWidth: Math.max(2.4, length * 0.24),
  };
}

function hookedBeak(head: Sample, reach: number, hook: number): string {
  const length = Math.max(2, Math.min(reach, head.r * (hook > 0.2 ? 0.62 : 0.85)));
  const half = head.r * 0.32;
  const baseY = head.y - head.r * 0.28;
  const leftX = head.x - half * 0.35;
  const rightX = head.x + half * 0.85;
  const tipX = head.x + length * 0.05;
  const tipY = head.y - head.r * 0.42 - length;
  if (hook > 0.2) {
    const curlX = tipX + length * 0.38;
    const curlY = tipY + length * 0.42;
    return [
      `M ${formatCoord(leftX)} ${formatCoord(baseY)}`,
      `Q ${formatCoord(tipX - length * 0.05)} ${formatCoord(tipY)} ${formatCoord(curlX)} ${formatCoord(curlY)}`,
      `Q ${formatCoord(rightX)} ${formatCoord(baseY + half * 0.15)} ${formatCoord(rightX)} ${formatCoord(baseY)}`,
      'Z',
    ].join(' ');
  }
  return [
    `M ${formatCoord(leftX)} ${formatCoord(baseY)}`,
    `Q ${formatCoord(head.x - half * 0.05)} ${formatCoord(tipY)} ${formatCoord(tipX)} ${formatCoord(tipY)}`,
    `Q ${formatCoord(head.x + half * 0.35)} ${formatCoord(tipY)} ${formatCoord(rightX)} ${formatCoord(baseY)}`,
    'Z',
  ].join(' ');
}

function billPath(head: Sample, reach: number, widthScale: number): string {
  return ellipsePath(
    head.x,
    head.y - head.r * 0.78 - reach * 0.2,
    head.r * widthScale,
    Math.max(head.r * 0.22, reach * 0.18),
  );
}

function directedBeak(head: Sample, dirX: number, dirY: number, reach: number, halfWidth: number): string {
  const facing = normalize(dirX, dirY);
  const tipX = head.x + facing.x * reach;
  const tipY = head.y + facing.y * reach;
  const base = Math.max(head.r * 0.2, 1);
  return [
    `M ${formatCoord(head.x + -facing.y * halfWidth + facing.x * base)} ${formatCoord(head.y + facing.x * halfWidth + facing.y * base)}`,
    `L ${formatCoord(tipX)} ${formatCoord(tipY)}`,
    `L ${formatCoord(head.x - -facing.y * halfWidth + facing.x * base)} ${formatCoord(head.y - facing.x * halfWidth + facing.y * base)}`,
    'Z',
  ].join(' ');
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${formatCoord(cx - rx)} ${formatCoord(cy)}`,
    `C ${formatCoord(cx - rx)} ${formatCoord(cy - ry * 0.55)} ${formatCoord(cx - rx * 0.55)} ${formatCoord(cy - ry)} ${formatCoord(cx)} ${formatCoord(cy - ry)}`,
    `C ${formatCoord(cx + rx * 0.55)} ${formatCoord(cy - ry)} ${formatCoord(cx + rx)} ${formatCoord(cy - ry * 0.55)} ${formatCoord(cx + rx)} ${formatCoord(cy)}`,
    `C ${formatCoord(cx + rx)} ${formatCoord(cy + ry * 0.55)} ${formatCoord(cx + rx * 0.55)} ${formatCoord(cy + ry)} ${formatCoord(cx)} ${formatCoord(cy + ry)}`,
    `C ${formatCoord(cx - rx * 0.55)} ${formatCoord(cy + ry)} ${formatCoord(cx - rx)} ${formatCoord(cy + ry * 0.55)} ${formatCoord(cx - rx)} ${formatCoord(cy)}`,
    'Z',
  ].join(' ');
}

function casque(head: Sample): string {
  return paddle(head.x, head.y - head.r * 0.2, head.x - head.r * 0.05, head.y - head.r * 1.25, head.r * 0.55);
}

function spiralTail(origin: Sample, growth: number, layout: EggLayout): CandlingMark {
  const turns = 1.25 + growth * 0.45;
  const points: Point[] = [];
  const steps = 28;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = 0.9 + t * turns * Math.PI * 2;
    const radius = layout.rx * (0.03 + t * 0.2);
    points.push({
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius * 0.82,
    });
  }
  return {
    path: pathFrom(points, false),
    strokeWidth: Math.max(2.2, layout.rx * 0.032),
  };
}

function shellDisc(chest: Sample, hip: Sample): CandlingOval {
  const cx = (chest.x + hip.x) / 2;
  const cy = (chest.y + hip.y) / 2 + Math.abs(hip.y - chest.y) * 0.1;
  const rx = Math.max(chest.r, hip.r) * 1.55;
  const ry = rx * 0.78;
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2, cx, cy };
}

function scuteMarks(samples: Sample[]): string {
  const parts: string[] = [];
  const step = Math.max(1, Math.floor(samples.length / 6));
  for (let index = step; index < samples.length - step; index += step) {
    const prev = samples[index - 1];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const reach = samples[index].r * 0.92;
    parts.push(
      `M ${formatCoord(samples[index].x + tangent.y * reach)} ${formatCoord(samples[index].y - tangent.x * reach)} L ${formatCoord(samples[index].x - tangent.y * reach * 0.15)} ${formatCoord(samples[index].y + tangent.x * reach * 0.15)}`,
    );
  }
  return parts.join(' ');
}

function pathFrom(points: readonly Point[], close: boolean): string {
  if (points.length === 0) {
    return '';
  }
  const commands = points.map(
    (point, index) => `${index === 0 ? 'M' : 'L'} ${formatCoord(point.x)} ${formatCoord(point.y)}`,
  );
  if (close) {
    commands.push('Z');
  }
  return commands.join(' ');
}

function polylineLength(samples: readonly Sample[]): number {
  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    total += Math.hypot(samples[index].x - samples[index - 1].x, samples[index].y - samples[index - 1].y);
  }
  return total;
}

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y);
  if (length < 0.001) {
    return { x: 0, y: -1 };
  }
  return { x: x / length, y: y / length };
}
