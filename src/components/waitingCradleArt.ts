/**
 * The vacant cradle's egg. Light comes from the upper left. The shell is matte
 * calcium with a coal of amber inside it. Coordinates are a fixed design frame;
 * the canvas scales that frame into the nest.
 */

export const CRADLE_FRAME = { width: 360, height: 360 } as const;

export const EGG = {
  cx: 180,
  cy: 158,
  rx: 74,
  ry: 102,
  taper: 0.36,
  /** Radians. The shell leans a little, the way a real egg settles. */
  lean: -0.045,
} as const;

/** Pivot near the lower third so the lean reads as weight in the cup. */
export const EGG_PIVOT_Y = EGG.cy + EGG.ry * 0.42;

export type Rgb = readonly [number, number, number];

export type CradleMote = {
  x: number;
  y: number;
  r: number;
  phase: number;
  drift: number;
  front: boolean;
};

export type CradleFreckle = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
};

export type CradlePalette = {
  scheme: 'light' | 'dark';
  glow: readonly [string, string];
  shadow: string;
  shadowStrength: number;
  moteCore: string;
  moteEdge: string;
  halo: string;
  haloStrength: number;
  rim: readonly [string, string, string];
  /** Fallback shell when the runtime shader is unavailable. Lit, mid, deep. */
  shell: readonly [string, string, string];
  freckle: string;
};

const LIGHT: CradlePalette = {
  scheme: 'light',
  glow: ['rgba(231, 176, 92, 0.42)', 'rgba(196, 120, 58, 0)'],
  shadow: '#2A1C12',
  shadowStrength: 0.22,
  moteCore: '#FFF6E4',
  moteEdge: 'rgba(231, 176, 92, 0)',
  halo: '#FFB15A',
  haloStrength: 0.28,
  rim: ['#FFF8EE', '#E7C090', '#8A5432'],
  shell: ['#FFF6EA', '#E7C096', '#8E5A3A'],
  freckle: '#C48A62',
};

const DARK: CradlePalette = {
  scheme: 'dark',
  glow: ['rgba(231, 164, 86, 0.5)', 'rgba(196, 112, 48, 0)'],
  shadow: '#000000',
  shadowStrength: 0.55,
  moteCore: '#FFF1D4',
  moteEdge: 'rgba(240, 180, 90, 0)',
  halo: '#FFB15A',
  haloStrength: 0.5,
  rim: ['#FFF4E4', '#D7A878', '#6A3C24'],
  shell: ['#F0E0CC', '#C4926A', '#6A3C24'],
  freckle: '#A87456',
};

export function cradlePalette(scheme: 'light' | 'dark'): CradlePalette {
  return scheme === 'dark' ? DARK : LIGHT;
}

/** Porcelain under a north window. The same shell in both rooms. */
export const SHELL = {
  lit: '#FFF8F0',
  mid: '#F4E0C4',
  shade: '#C9926A',
  deep: '#8E5A3A',
  blush: '#E8C0B2',
  ember: '#FFB15C',
  freckle: '#D7A878',
} as const;

export const SHELL_RGB: Record<keyof typeof SHELL, Rgb> = {
  lit: rgbOf(SHELL.lit),
  mid: rgbOf(SHELL.mid),
  shade: rgbOf(SHELL.shade),
  deep: rgbOf(SHELL.deep),
  blush: rgbOf(SHELL.blush),
  ember: rgbOf(SHELL.ember),
  freckle: rgbOf(SHELL.freckle),
};

/**
 * Reflected light on a chalky shell. `warmth` breathes the coal behind the
 * calcium; it never reaches the rim, so the egg stays opaque.
 */
export const SHELL_SHADER = `
uniform float2 center;
uniform float2 radii;
uniform float warmth;
uniform float room;
uniform float3 lit;
uniform float3 mid;
uniform float3 shade;
uniform float3 deep;
uniform float3 blush;
uniform float3 ember;
uniform float3 freckle;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  return noise(p) * 0.55 + noise(p * 2.03 + 7.1) * 0.3 + noise(p * 4.07 + 3.3) * 0.15;
}

float spots(float2 p, float density, float size) {
  float2 i = floor(p);
  float2 f = fract(p);
  float best = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float2 g = float2(float(x), float(y));
      float2 cell = i + g;
      float2 o = float2(hash(cell + 17.3), hash(cell + 41.7));
      float r = size * (0.35 + 0.65 * hash(cell + 73.1));
      float dist = length(g + o - f);
      float s = (1.0 - smoothstep(r * 0.35, r, dist)) * step(hash(cell), density);
      best = max(best, s * (0.55 + 0.45 * hash(cell + 91.9)));
    }
  }
  return best;
}

half4 main(float2 p) {
  float2 q = (p - center) / radii;
  float e2 = dot(q, q);
  float e = sqrt(e2);
  float z = sqrt(max(0.0, 1.0 - min(e2, 1.0)));
  float3 n = normalize(float3(q.x, q.y * 0.96, z));

  float3 key = normalize(float3(-0.78, -0.46, 0.4));
  float wrap = clamp(dot(n, key) * 0.72 + 0.38, 0.0, 1.0);

  float3 col = mix(deep, shade, smoothstep(0.0, 0.42, wrap));
  col = mix(col, mid, smoothstep(0.22, 0.8, wrap));
  float capMask = smoothstep(0.2, -0.7, q.x) * smoothstep(0.25, -0.85, q.y);
  col = mix(col, lit, smoothstep(0.7, 1.0, wrap) * capMask);

  float3 bounce = normalize(float3(0.28, 0.78, 0.55));
  float nb = clamp(dot(n, bounce), 0.0, 1.0);
  col = mix(col, mix(mid, ember, 0.28), nb * 0.34);

  float blushAmt = smoothstep(0.62, 0.08, wrap);
  col = mix(col, blush, blushAmt * 0.16);

  float2 uv = q / max(z, 0.32);
  float grain = noise(uv * 14.0 + 4.2);
  float fine = noise(uv * 36.0 + 1.7);
  col *= 0.94 + grain * 0.075 + fine * 0.03;

  float blot = fbm(uv * 1.8 + 8.0);
  col = mix(col, freckle, smoothstep(0.62, 0.92, blot) * 0.12);

  float pore = spots(uv * 11.0 + 2.4, 0.12, 0.2);
  col = mix(col, lit, pore * 0.22);

  float2 window = (q - float2(-0.4, -0.55)) * float2(1.55, 0.82);
  float ribbon = exp(-dot(window, window) * 2.6);
  col = mix(col, lit, ribbon * 0.34);

  float3 view = float3(0.0, 0.0, 1.0);
  float3 halfv = normalize(key + view);
  float spec = pow(clamp(dot(n, halfv), 0.0, 1.0), 18.0);
  col += spec * capMask * 0.08;

  float2 yolk = (q - float2(-0.02, 0.18)) / float2(0.62, 0.7);
  float coal = smoothstep(1.05, 0.05, length(yolk)) * z;
  col = mix(col, ember, coal * 0.34 * warmth * (1.0 + room * 0.35));

  float limb = smoothstep(0.55, 1.02, e);
  col = mix(col, deep, limb * 0.62);

  float rim = pow(clamp(1.0 - z, 0.0, 1.0), 1.45);
  float cool = smoothstep(-0.15, 0.8, q.x) * smoothstep(0.35, -0.45, q.y);
  col = mix(col, lit, rim * cool * 0.14);

  float crown = smoothstep(0.05, -0.85, q.y) * (1.0 - limb);
  col = mix(col, lit, crown * 0.08);
  col = mix(col, col * float3(0.86, 0.78, 0.68), room);

  return half4(half3(col), 1.0);
}
`;

export const EGG_PATH = ovalEgg(EGG.cx, EGG.cy, EGG.rx, EGG.ry, EGG.taper);

/** A few chalk marks. Kept faint so the shell stays one surface. */
export const FRECKLES: readonly CradleFreckle[] = [
  { x: EGG.cx + 18, y: EGG.cy + 4, rx: 5.2, ry: 3.4, opacity: 0.07 },
  { x: EGG.cx - 16, y: EGG.cy - 22, rx: 3.2, ry: 2.2, opacity: 0.05 },
  { x: EGG.cx + 10, y: EGG.cy + 32, rx: 4.4, ry: 2.8, opacity: 0.06 },
  { x: EGG.cx + 24, y: EGG.cy - 18, rx: 2.4, ry: 1.7, opacity: 0.05 },
  { x: EGG.cx - 6, y: EGG.cy + 14, rx: 2.6, ry: 1.8, opacity: 0.04 },
];

/** Soft ground the shell rests on. Kept wide and low so it reads as shadow. */
export const GROUND_SHADOW = { cx: 188, cy: 286, rx: 92, ry: 18 } as const;

export const MOTES: readonly CradleMote[] = [
  { x: 52, y: 78, r: 2.2, phase: 0.05, drift: 12, front: false },
  { x: 304, y: 96, r: 1.6, phase: 0.46, drift: 10, front: false },
  { x: 188, y: 40, r: 1.8, phase: 0.22, drift: 14, front: false },
  { x: 112, y: 52, r: 1.3, phase: 0.8, drift: 9, front: true },
  { x: 328, y: 158, r: 1.7, phase: 0.33, drift: 11, front: true },
  { x: 78, y: 44, r: 1.1, phase: 0.6, drift: 8, front: true },
];

function rgbOf(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function n(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Object.is(rounded, -0)) {
    return '0';
  }
  return String(rounded);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Classic avian oval: blunt crown, softer point. Mirrors the candling shell. */
function ovalEgg(cx: number, cy: number, rx: number, ry: number, taper: number): string {
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
    `M ${n(cx)} ${n(top)}`,
    `C ${n(cx - crown)} ${n(top)} ${n(left)} ${n(shoulderY)} ${n(left)} ${n(waistY)}`,
    `C ${n(left)} ${n(hipY)} ${n(cx - tip)} ${n(bottom)} ${n(cx)} ${n(bottom)}`,
    `C ${n(cx + tip)} ${n(bottom)} ${n(right)} ${n(hipY)} ${n(right)} ${n(waistY)}`,
    `C ${n(right)} ${n(shoulderY)} ${n(cx + crown)} ${n(top)} ${n(cx)} ${n(top)}`,
    'Z',
  ].join(' ');
}

