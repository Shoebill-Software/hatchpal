import type { SpeciesId } from '@/domain/types';

export const EGG_ASPECT = 196 / 248;

export type EggLayout = {
  canvasWidth: number;
  canvasHeight: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
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

export function createEggPath(cx: number, cy: number, rx: number, ry: number): string {
  const top = cy - ry;
  const bottom = cy + ry;
  const left = cx - rx;
  const right = cx + rx;
  const waistY = cy + ry * 0.04;
  const shoulderY = cy - ry * 0.34;

  return [
    `M ${cx} ${top}`,
    `C ${cx - rx * 0.92} ${top} ${left} ${shoulderY} ${left} ${waistY}`,
    `C ${left} ${cy + ry * 0.7} ${cx - rx * 0.56} ${bottom} ${cx} ${bottom}`,
    `C ${cx + rx * 0.56} ${bottom} ${right} ${cy + ry * 0.7} ${right} ${waistY}`,
    `C ${right} ${shoulderY} ${cx + rx * 0.92} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

export function layoutEgg(width: number, height: number, padding = 36): EggLayout {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const availableW = Math.max(0, safeWidth - padding * 2);
  const availableH = Math.max(0, safeHeight - padding * 2);

  let eggHeight = availableH;
  let eggWidth = eggHeight * EGG_ASPECT;
  if (eggWidth > availableW) {
    eggWidth = availableW;
    eggHeight = eggWidth / EGG_ASPECT;
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
    path: createEggPath(cx, cy, rx, ry),
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

export function createVesselNetwork(originX: number, originY: number, radius: number): VesselNetwork {
  const spread = Math.max(8, radius);
  const primaryAngles = [-2.55, -2.05, -1.45, -0.85, -0.28, 0.32, 0.88, 1.48, 2.08, 2.58];
  const arteries: string[] = [];
  const capillaries: string[] = [];

  for (let index = 0; index < primaryAngles.length; index += 1) {
    const angle = primaryAngles[index];
    const length = spread * (0.72 + (index % 3) * 0.09);
    const mid = length * 0.46;
    const bend = ((index % 2 === 0 ? 1 : -1) * spread) * 0.16;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin;
    const perpY = cos;

    const midX = originX + cos * mid + perpX * bend;
    const midY = originY + sin * mid + perpY * bend;
    const endX = originX + cos * length;
    const endY = originY + sin * length;
    arteries.push(`M ${originX} ${originY} Q ${midX} ${midY} ${endX} ${endY}`);

    const forkAngle = angle + (index % 2 === 0 ? 0.28 : -0.3);
    const forkLen = length * 0.42;
    const forkMid = forkLen * 0.5;
    const forkCos = Math.cos(forkAngle);
    const forkSin = Math.sin(forkAngle);
    const forkStartX = originX + cos * (length * 0.52);
    const forkStartY = originY + sin * (length * 0.52);
    const forkMidX = forkStartX + forkCos * forkMid;
    const forkMidY = forkStartY + forkSin * forkMid;
    const forkEndX = forkStartX + forkCos * forkLen;
    const forkEndY = forkStartY + forkSin * forkLen;
    capillaries.push(`M ${forkStartX} ${forkStartY} Q ${forkMidX} ${forkMidY} ${forkEndX} ${forkEndY}`);
  }

  const ringRx = spread * 0.92;
  const ringRy = spread * 0.78;
  const ringCy = originY + spread * 0.06;
  const terminalis = [
    `M ${originX} ${ringCy - ringRy}`,
    `C ${originX + ringRx * 0.55} ${ringCy - ringRy} ${originX + ringRx} ${ringCy - ringRy * 0.35} ${originX + ringRx} ${ringCy}`,
    `C ${originX + ringRx} ${ringCy + ringRy * 0.45} ${originX + ringRx * 0.5} ${ringCy + ringRy} ${originX} ${ringCy + ringRy}`,
    `C ${originX - ringRx * 0.5} ${ringCy + ringRy} ${originX - ringRx} ${ringCy + ringRy * 0.45} ${originX - ringRx} ${ringCy}`,
    `C ${originX - ringRx} ${ringCy - ringRy * 0.35} ${originX - ringRx * 0.55} ${ringCy - ringRy} ${originX} ${ringCy - ringRy}`,
  ].join(' ');

  return {
    arteries: arteries.join(' '),
    capillaries: capillaries.join(' '),
    terminalis,
  };
}

export function candlingShellPalette(speciesId: SpeciesId): CandlingShellPalette {
  if (speciesId === 'leopard_gecko') {
    return {
      body: '#EFE6D4',
      stroke: '#C9B89A',
      highlight: '#FFF8EC',
      speckle: '#B7A48A',
      interior: '#3A2414',
      yolk: '#C47832',
    };
  }

  if (speciesId === 'green_sea_turtle') {
    return {
      body: '#F0D6C6',
      stroke: '#D2B09C',
      highlight: '#FFF4EC',
      speckle: '#C49A86',
      interior: '#3A1C14',
      yolk: '#C45A32',
    };
  }

  return {
    body: '#EED9A0',
    stroke: '#D0B474',
    highlight: '#FFF6D8',
    speckle: '#C4A066',
    interior: '#3A220C',
    yolk: '#D07028',
  };
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
