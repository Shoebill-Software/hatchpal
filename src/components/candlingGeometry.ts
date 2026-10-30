import { getSpeciesConfig } from '@/data/species';
import type { EggShape, SpeciesId } from '@/domain/types';

export const EGG_ASPECT = 196 / 248;

export type EggLayout = {
  canvasWidth: number;
  canvasHeight: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Width / length. The default keeps the historic nest-egg proportion. */
  aspect: number;
  shape: EggShape;
  path: string;
};

export type CandlingShellPalette = {
  body: string;
  stroke: string;
  highlight: string;
  speckle: string;
  interior: string;
  yolk: string;
};

export type VesselNetwork = {
  arteries: string;
  capillaries: string;
  terminalis: string;
};

export function formatCoord(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Object.is(rounded, -0)) {
    return '0';
  }
  return String(rounded);
}

function clampAspect(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return EGG_ASPECT;
  }
  return Math.min(1, Math.max(0.42, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Classic avian oval: blunt pole up, pointed pole down. `taper` moves the
 * widest point toward the blunt pole and narrows the pointed end.
 */
function ovalEgg(cx: number, cy: number, rx: number, ry: number, taper = 0): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  const waistY = cy + ry * lerp(0.04, -0.12, taper);
  const shoulderY = cy - ry * lerp(0.34, 0.6, taper);
  const crown = rx * lerp(0.92, 0.6, taper);
  const hipY = cy + ry * lerp(0.7, 0.5, taper);
  const tip = rx * lerp(0.56, 0.42, taper);

  return [
    `M ${cx} ${top}`,
    `C ${cx - crown} ${top} ${left} ${shoulderY} ${left} ${waistY}`,
    `C ${left} ${hipY} ${cx - tip} ${bottom} ${cx} ${bottom}`,
    `C ${cx + tip} ${bottom} ${right} ${hipY} ${right} ${waistY}`,
    `C ${right} ${shoulderY} ${cx + crown} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

function sphereEgg(cx: number, cy: number, rx: number, ry: number): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  return [
    `M ${cx} ${top}`,
    `C ${cx - rx * 0.55} ${top} ${left} ${cy - ry * 0.55} ${left} ${cy}`,
    `C ${left} ${cy + ry * 0.55} ${cx - rx * 0.55} ${bottom} ${cx} ${bottom}`,
    `C ${cx + rx * 0.55} ${bottom} ${right} ${cy + ry * 0.55} ${right} ${cy}`,
    `C ${right} ${cy - ry * 0.55} ${cx + rx * 0.55} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

function pearEgg(cx: number, cy: number, rx: number, ry: number): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  return [
    `M ${cx} ${top}`,
    `C ${cx - rx * 0.96} ${top + ry * 0.03} ${left} ${cy - ry * 0.16} ${left} ${cy + ry * 0.08}`,
    `C ${left} ${cy + ry * 0.62} ${cx - rx * 0.26} ${bottom} ${cx} ${bottom}`,
    `C ${cx + rx * 0.26} ${bottom} ${right} ${cy + ry * 0.62} ${right} ${cy + ry * 0.08}`,
    `C ${right} ${cy - ry * 0.16} ${cx + rx * 0.96} ${top + ry * 0.03} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

function ellipticalEgg(cx: number, cy: number, rx: number, ry: number, taper = 0): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  const waistY = cy - ry * 0.06 * taper;
  const tip = rx * lerp(0.56, 0.5, taper);
  return [
    `M ${cx} ${top}`,
    `C ${cx - rx * 0.56} ${top} ${left} ${waistY - ry * 0.5} ${left} ${waistY}`,
    `C ${left} ${waistY + ry * 0.54} ${cx - tip} ${bottom} ${cx} ${bottom}`,
    `C ${cx + tip} ${bottom} ${right} ${waistY + ry * 0.54} ${right} ${waistY}`,
    `C ${right} ${waistY - ry * 0.5} ${cx + rx * 0.56} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

function elongatedEgg(cx: number, cy: number, rx: number, ry: number, taper = 0): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  const crown = rx * lerp(0.72, 0.62, taper);
  const shoulderY = cy - ry * lerp(0.76, 0.64, taper);
  const hipY = cy + ry * lerp(0.48, 0.4, taper);
  const tip = rx * lerp(0.64, 0.58, taper);
  return [
    `M ${cx} ${top}`,
    `C ${cx - crown} ${top} ${left} ${shoulderY} ${left} ${cy - ry * 0.18}`,
    `C ${left} ${hipY} ${cx - tip} ${bottom} ${cx} ${bottom}`,
    `C ${cx + tip} ${bottom} ${right} ${hipY} ${right} ${cy - ry * 0.18}`,
    `C ${right} ${shoulderY} ${cx + crown} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

export function createEggPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shape: EggShape = 'oval',
  taper = 0,
): string {
  const t = Math.min(1, Math.max(0, taper));
  switch (shape) {
    case 'sphere':
      return sphereEgg(cx, cy, rx, ry);
    case 'pear':
      return pearEgg(cx, cy, rx, ry);
    case 'elliptical':
      return ellipticalEgg(cx, cy, rx, ry, t);
    case 'elongated':
      return elongatedEgg(cx, cy, rx, ry, t);
    case 'pitted':
    case 'oval':
    default:
      return ovalEgg(cx, cy, rx, ry, t);
  }
}

export function layoutEgg(
  width: number,
  height: number,
  padding = 36,
  options?: { aspect?: number; shape?: EggShape; taper?: number },
): EggLayout {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const availableW = Math.max(0, safeWidth - padding * 2);
  const availableH = Math.max(0, safeHeight - padding * 2);
  const aspect = clampAspect(options?.aspect);
  const shape = options?.shape ?? 'oval';

  let eggHeight = availableH;
  let eggWidth = eggHeight * aspect;
  if (eggWidth > availableW) {
    eggWidth = availableW;
    eggHeight = eggWidth / aspect;
  }

  const cx = safeWidth / 2;
  const cy = safeHeight / 2;
  const rx = eggWidth / 2;
  const ry = eggHeight / 2;

  return {
    canvasWidth: safeWidth,
    canvasHeight: safeHeight,
    cx,
    cy,
    rx,
    ry,
    aspect,
    shape,
    path: createEggPath(cx, cy, rx, ry, shape, options?.taper),
  };
}

export function isPointInEgg(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  slack = 1.06
): boolean {
  if (rx <= 0 || ry <= 0) {
    return false;
  }
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  return nx * nx + ny * ny <= slack * slack;
}

export function lightProximity(
  lightX: number,
  lightY: number,
  cx: number,
  cy: number,
  maxRadius: number
): number {
  if (maxRadius <= 0) {
    return 0;
  }
  const distance = Math.hypot(lightX - cx, lightY - cy);
  return 1 - Math.min(1, distance / maxRadius);
}

export function lightConeRadius(proximity: number, eggRy: number): number {
  const clamped = Math.min(1, Math.max(0, proximity));
  return Math.max(8, eggRy * (0.62 + clamped * 0.52));
}

export function createEmbryoBlob(cx: number, cy: number, size: number): string {
  const s = Math.max(2, size);
  return [
    `M ${cx} ${cy - s * 0.72}`,
    `C ${cx + s * 0.58} ${cy - s * 0.68} ${cx + s * 0.82} ${cy - s * 0.12} ${cx + s * 0.64} ${cy + s * 0.26}`,
    `C ${cx + s * 0.48} ${cy + s * 0.68} ${cx + s * 0.08} ${cy + s * 0.84} ${cx - s * 0.22} ${cy + s * 0.72}`,
    `C ${cx - s * 0.72} ${cy + s * 0.52} ${cx - s * 0.86} ${cy - s * 0.02} ${cx - s * 0.5} ${cy - s * 0.4}`,
    `C ${cx - s * 0.24} ${cy - s * 0.7} ${cx - s * 0.06} ${cy - s * 0.76} ${cx} ${cy - s * 0.72}`,
    'Z',
  ].join(' ');
}

function vesselQuad(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): string {
  return `M ${formatCoord(x0)} ${formatCoord(y0)} Q ${formatCoord(cx)} ${formatCoord(cy)} ${formatCoord(x1)} ${formatCoord(y1)}`;
}

/**
 * Vitelline circulation: uneven arteries, a second fork on most of them,
 * and a sinus terminalis that wobbles instead of sitting as a perfect oval.
 * Paths are deterministic so the same egg does not shimmer between renders.
 */
export function createVesselNetwork(originX: number, originY: number, radius: number): VesselNetwork {
  const spread = Math.max(8, radius);
  const primaryAngles = [-2.72, -2.2, -1.64, -1.08, -0.5, 0.06, 0.58, 1.16, 1.72, 2.28, 2.8];
  const arteries: string[] = [];
  const capillaries: string[] = [];

  for (let index = 0; index < primaryAngles.length; index += 1) {
    const angle = primaryAngles[index];
    const length = spread * (0.52 + ((index * 17) % 10) * 0.038);
    const bend = (index % 2 === 0 ? 1 : -1) * spread * (0.16 + (index % 3) * 0.045);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin;
    const perpY = cos;
    const mid = length * 0.46;
    const endX = originX + cos * length;
    const endY = originY + sin * length;
    arteries.push(
      vesselQuad(
        originX,
        originY,
        originX + cos * mid + perpX * bend,
        originY + sin * mid + perpY * bend,
        endX,
        endY,
      ),
    );

    const forks = index % 2 === 0 ? [0.36, -0.24] : [0.3];
    for (let forkIndex = 0; forkIndex < forks.length; forkIndex += 1) {
      const forkAngle = angle + forks[forkIndex];
      const forkLen = length * (0.26 + forkIndex * 0.1);
      const startDist = length * (0.42 + forkIndex * 0.14);
      const startX = originX + cos * startDist;
      const startY = originY + sin * startDist;
      const forkCos = Math.cos(forkAngle);
      const forkSin = Math.sin(forkAngle);
      const wobble = (forkIndex % 2 === 0 ? 1 : -1) * forkLen * 0.2;
      capillaries.push(
        vesselQuad(
          startX,
          startY,
          startX + forkCos * forkLen * 0.5 - forkSin * wobble,
          startY + forkSin * forkLen * 0.5 + forkCos * wobble,
          startX + forkCos * forkLen,
          startY + forkSin * forkLen,
        ),
      );
    }
  }

  const ringRx = spread * 0.98;
  const ringRy = spread * 0.82;
  const ring: string[] = [];
  const steps = 36;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + Math.sin(angle * 3 + 0.7) * 0.06 + Math.sin(angle * 7.2) * 0.028;
    const x = originX + Math.cos(angle) * ringRx * wobble;
    const y = originY + spread * 0.05 + Math.sin(angle) * ringRy * wobble;
    ring.push(`${index === 0 ? 'M' : 'L'} ${formatCoord(x)} ${formatCoord(y)}`);
  }
  ring.push('Z');

  return {
    arteries: arteries.join(' '),
    capillaries: capillaries.join(' '),
    terminalis: ring.join(' '),
  };
}

export type VesselTree = {
  /** Paths grouped by calibre, thickest first, so each level can be stroked at its own width. */
  levels: string[];
  terminalis: string;
};

export type VesselTreeOptions = {
  seed?: number;
  arms?: number;
  depth?: number;
  /** Heading change per step in radians; membrane vessels meander more than yolk-sac trunks. */
  wiggle?: number;
};

/**
 * Branching vessel field: wandering trunks that fork and taper toward the rim.
 * The random sequence never depends on `radius`, so a growing network keeps
 * its topology from day to day and only lengthens.
 */
export function createVesselTree(
  originX: number,
  originY: number,
  radius: number,
  options?: VesselTreeOptions,
): VesselTree {
  const spread = Math.max(8, radius);
  const depth = Math.max(1, Math.min(5, options?.depth ?? 4));
  const arms = Math.max(3, options?.arms ?? 9);
  const wiggle = options?.wiggle ?? 0.62;
  const random = seededRandom(options?.seed ?? 7);
  const levels: string[][] = Array.from({ length: depth }, () => []);

  const grow = (x: number, y: number, angle: number, length: number, level: number) => {
    const points: { x: number; y: number }[] = [{ x, y }];
    let heading = angle;
    let px = x;
    let py = y;
    const steps = 4;
    // A steady curl per segment plus jitter reads as a vessel; jitter alone reads as a crack.
    const curl = (random() - 0.5) * wiggle * 0.5;
    for (let step = 0; step < steps; step += 1) {
      heading += curl + (random() - 0.5) * wiggle * 0.6;
      px += Math.cos(heading) * (length / steps);
      py += Math.sin(heading) * (length / steps);
      points.push({ x: px, y: py });
    }
    levels[level].push(smoothPolyline(points));
    if (level + 1 >= depth) {
      return;
    }
    const fork = 0.3 + random() * 0.32;
    const keep = 0.64 + random() * 0.14;
    grow(px, py, heading - fork, length * keep, level + 1);
    grow(px, py, heading + fork * (0.8 + random() * 0.4), length * (keep - 0.06), level + 1);
    if (random() < 0.45) {
      const mid = points[2];
      const side = random() < 0.5 ? -1 : 1;
      grow(mid.x, mid.y, heading + side * (0.9 + random() * 0.4), length * 0.42, level + 1);
    }
  };

  const offset = random() * Math.PI * 2;
  for (let arm = 0; arm < arms; arm += 1) {
    const angle = offset + (arm / arms) * Math.PI * 2 + (random() - 0.5) * 0.4;
    const root = spread * (0.03 + random() * 0.04);
    grow(
      originX + Math.cos(angle) * root,
      originY + Math.sin(angle) * root,
      angle,
      spread * (0.28 + random() * 0.12),
      0,
    );
  }

  return {
    levels: levels.map((paths) => paths.join(' ')),
    terminalis: vesselRing(originX, originY, spread),
  };
}

function vesselRing(originX: number, originY: number, spread: number): string {
  const ringRx = spread * 0.98;
  const ringRy = spread * 0.86;
  const ring: string[] = [];
  const steps = 48;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + Math.sin(angle * 3 + 0.7) * 0.05 + Math.sin(angle * 7.2) * 0.022;
    const x = originX + Math.cos(angle) * ringRx * wobble;
    const y = originY + spread * 0.04 + Math.sin(angle) * ringRy * wobble;
    ring.push(`${index === 0 ? 'M' : 'L'} ${formatCoord(x)} ${formatCoord(y)}`);
  }
  ring.push('Z');
  return ring.join(' ');
}

function smoothPolyline(points: readonly { x: number; y: number }[]): string {
  const first = points[0];
  const commands = [`M ${formatCoord(first.x)} ${formatCoord(first.y)}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    commands.push(
      `Q ${formatCoord(point.x)} ${formatCoord(point.y)} ${formatCoord((point.x + next.x) / 2)} ${formatCoord((point.y + next.y) / 2)}`,
    );
  }
  const last = points[points.length - 1];
  commands.push(`L ${formatCoord(last.x)} ${formatCoord(last.y)}`);
  return commands.join(' ');
}

function seededRandom(seed: number): () => number {
  let state = Math.floor(seed) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function candlingShellPalette(speciesId: SpeciesId): CandlingShellPalette {
  const candle = getSpeciesConfig(speciesId).egg.candle;
  return {
    body: candle.body,
    stroke: candle.stroke,
    highlight: candle.highlight,
    speckle: candle.speckle,
    interior: candle.interior,
    yolk: candle.yolk,
  };
}

/**
 * Pip seen against the lamp: hairline fractures radiating from the spot the
 * beak strikes, just under the air cell. An external pip also opens a hole.
 */
export function createPipStar(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  external: boolean,
): { cracks: string; hole: string | null } {
  const random = seededRandom(external ? 41 : 23);
  const px = cx + rx * 0.34;
  const py = cy - ry * 0.5;
  const rays = external ? 6 : 3;
  const reach = rx * (external ? 0.24 : 0.15);
  const cracks: string[] = [];
  const fracture = (x0: number, y0: number, heading0: number, length: number, steps: number, branch: boolean) => {
    let heading = heading0;
    let x = x0;
    let y = y0;
    const points = [`M ${formatCoord(x)} ${formatCoord(y)}`];
    for (let step = 0; step < steps; step += 1) {
      heading += (random() - 0.5) * 1.1;
      const stride = (length / steps) * (0.6 + random() * 0.8);
      x += Math.cos(heading) * stride;
      y += Math.sin(heading) * stride;
      points.push(`L ${formatCoord(x)} ${formatCoord(y)}`);
      if (branch && step === 1 && random() < 0.6) {
        fracture(x, y, heading + (random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.5), length * 0.35, 3, false);
      }
    }
    cracks.push(points.join(' '));
  };
  for (let ray = 0; ray < rays; ray += 1) {
    const heading = (ray / rays) * Math.PI * 2 + random() * 1.1;
    fracture(px, py, heading, reach * (0.35 + random() * 0.9), 5, true);
  }
  if (!external) {
    return { cracks: cracks.join(' '), hole: null };
  }
  const hole: string[] = [];
  const corners = 9;
  for (let corner = 0; corner < corners; corner += 1) {
    const angle = (corner / corners) * Math.PI * 2;
    const radius = rx * 0.045 * (0.65 + random() * 0.6);
    hole.push(
      `${corner === 0 ? 'M' : 'L'} ${formatCoord(px + Math.cos(angle) * radius)} ${formatCoord(py + Math.sin(angle) * radius * 0.8)}`,
    );
  }
  hole.push('Z');
  return { cracks: cracks.join(' '), hole: hole.join(' ') };
}

export function createPipCrackPath(cx: number, cy: number, rx: number, ry: number, external: boolean): string {
  const startX = cx + rx * 0.08;
  const startY = cy - ry * 0.72;
  if (external) {
    return [
      `M ${startX} ${startY}`,
      `L ${cx + rx * 0.28} ${cy - ry * 0.48}`,
      `L ${cx + rx * 0.14} ${cy - ry * 0.22}`,
      `L ${cx + rx * 0.36} ${cy + ry * 0.02}`,
      `L ${cx + rx * 0.18} ${cy + ry * 0.28}`,
    ].join(' ');
  }
  return [
    `M ${startX + rx * 0.04} ${startY + ry * 0.08}`,
    `L ${cx + rx * 0.18} ${cy - ry * 0.44}`,
    `L ${cx + rx * 0.1} ${cy - ry * 0.2}`,
    `L ${cx + rx * 0.2} ${cy}`,
  ].join(' ');
}
