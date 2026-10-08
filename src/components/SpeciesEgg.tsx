import Svg, { Ellipse, Path } from 'react-native-svg';

import { layoutEgg } from '@/components/candlingGeometry';

export type EggAppearance = {
  shape: string;
  finish: string;
  visualScale: number;
  bodyColor: string;
  strokeColor: string;
  highlightColor: string;
  speckleColor: string;
  speckleDensity: number;
  interiorColor: string;
  yolkColor: string;
  crackColor: string;
};

export type SpeciesEggProps = {
  appearance: EggAppearance;
  width: number;
  height: number;
  pipOpacity?: number;
  showHatchCrack?: boolean;
};

const PEBBLE_LOCI: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-0.32, -0.48, 0.08, 0.055, -1],
  [0.22, -0.4, 0.07, 0.048, 1],
  [-0.08, -0.28, 0.09, 0.06, 0],
  [0.36, -0.18, 0.06, 0.042, -1],
  [-0.4, -0.08, 0.07, 0.05, 1],
  [0.08, -0.08, 0.08, 0.055, -1],
  [-0.18, 0.06, 0.075, 0.05, 0],
  [0.3, 0.1, 0.065, 0.045, 1],
  [-0.36, 0.22, 0.07, 0.048, -1],
  [0.02, 0.24, 0.09, 0.06, 0],
  [0.38, 0.32, 0.055, 0.04, -1],
  [-0.22, 0.38, 0.08, 0.052, 1],
  [0.16, 0.46, 0.07, 0.046, -1],
  [-0.06, 0.54, 0.06, 0.04, 0],
  [0.26, -0.52, 0.05, 0.034, 1],
  [-0.24, -0.58, 0.055, 0.038, -1],
  [0.42, 0.02, 0.048, 0.034, 0],
  [-0.44, 0.36, 0.05, 0.036, 1],
  [0.12, 0.16, 0.06, 0.042, -1],
  [-0.12, -0.16, 0.05, 0.034, 1],
  [0.34, 0.5, 0.052, 0.036, 0],
  [-0.3, 0.56, 0.048, 0.032, -1],
];

const SPECKLE_LOCI: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.28, -0.22, 0.045, 0.03],
  [0.24, -0.08, 0.038, 0.026],
  [-0.06, 0.12, 0.032, 0.022],
  [0.2, 0.3, 0.036, 0.024],
  [-0.22, 0.36, 0.03, 0.02],
  [0.08, -0.38, 0.028, 0.018],
];

type Point = { x: number; y: number };

function mapPoint(cx: number, cy: number, rx: number, ry: number, ox: number, oy: number): Point {
  return { x: cx + rx * ox, y: cy + ry * oy };
}

function cubic(
  start: Point,
  c1: Point,
  c2: Point,
  end: Point
): string {
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

export function SpeciesEgg({
  appearance,
  width,
  height,
  pipOpacity = 0,
  showHatchCrack = false,
}: SpeciesEggProps) {
  const layout = layoutEgg(width, height, 2);
  const { cx, cy, rx, ry, path } = layout;
  const p = (ox: number, oy: number) => mapPoint(cx, cy, rx, ry, ox, oy);
  const speckleCount = Math.round(
    SPECKLE_LOCI.length * Math.min(1, Math.max(0, appearance.speckleDensity))
  );

  const highlight = cubic(p(-0.28, -0.62), p(-0.42, -0.22), p(-0.38, 0.08), p(-0.18, 0.22));
  const wrinkles = [
    cubic(p(0.62, -0.42), p(0.48, -0.18), p(0.5, 0.08), p(0.58, 0.32)),
    cubic(p(-0.58, -0.28), p(-0.46, -0.02), p(-0.48, 0.22), p(-0.54, 0.46)),
    cubic(p(-0.22, -0.62), p(-0.08, -0.4), p(0.04, -0.18), p(0.08, 0.04)),
    cubic(p(0.18, 0.12), p(0.28, 0.3), p(0.22, 0.48), p(0.1, 0.62)),
  ];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={path} fill={appearance.bodyColor} stroke={appearance.strokeColor} strokeWidth={1.4} />
      <Path
        d={highlight}
        stroke={appearance.highlightColor}
        strokeWidth={Math.max(6, rx * 0.12)}
        strokeLinecap="round"
        opacity={appearance.finish === 'pebbled' ? 0.16 : 0.3}
        fill="none"
      />

      {appearance.finish === 'leathery'
        ? wrinkles.map((d, index) => (
            <Path
              key={`wrinkle-${index}`}
              d={d}
              stroke={appearance.strokeColor}
              strokeWidth={1.15}
              strokeLinecap="round"
              opacity={0.2}
              fill="none"
            />
          ))
        : null}

      {appearance.finish === 'pebbled'
        ? PEBBLE_LOCI.map(([ox, oy, orx, ory, shade], index) => (
            <Ellipse
              key={`pebble-${index}`}
              cx={cx + rx * ox}
              cy={cy + ry * oy}
              rx={rx * orx}
              ry={ry * ory}
              fill={shade < 0 ? appearance.speckleColor : shade > 0 ? appearance.highlightColor : appearance.strokeColor}
              opacity={shade > 0 ? 0.22 : 0.38}
            />
          ))
        : SPECKLE_LOCI.slice(0, Math.max(0, speckleCount)).map(([ox, oy, orx, ory], index) => (
            <Ellipse
              key={`speckle-${index}`}
              cx={cx + rx * ox}
              cy={cy + ry * oy}
              rx={rx * orx}
              ry={ry * ory}
              fill={appearance.speckleColor}
              opacity={0.32}
            />
          ))}

      {pipOpacity > 0 ? (
        <>
          <Path
            d={`M ${p(0.08, -0.62).x} ${p(0.08, -0.62).y} L ${p(0.2, -0.38).x} ${p(0.2, -0.38).y} L ${p(0.1, -0.16).x} ${p(0.1, -0.16).y} L ${p(0.24, 0.04).x} ${p(0.24, 0.04).y}`}
            stroke={appearance.crackColor}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
            opacity={pipOpacity}
          />
          <Path
            d={`M ${p(-0.08, -0.55).x} ${p(-0.08, -0.55).y} L ${p(-0.16, -0.32).x} ${p(-0.16, -0.32).y} L ${p(-0.06, -0.12).x} ${p(-0.06, -0.12).y}`}
            stroke={appearance.crackColor}
            strokeWidth={1.25}
            strokeLinecap="round"
            fill="none"
            opacity={pipOpacity * 0.85}
          />
        </>
      ) : null}

      {showHatchCrack ? (
        <Path
          d={`M ${p(0.04, -0.7).x} ${p(0.04, -0.7).y} L ${p(0.28, -0.48).x} ${p(0.28, -0.48).y} L ${p(0.14, -0.22).x} ${p(0.14, -0.22).y} L ${p(0.36, 0.02).x} ${p(0.36, 0.02).y} L ${p(0.18, 0.28).x} ${p(0.18, 0.28).y}`}
          stroke={appearance.crackColor}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.92}
        />
      ) : null}
    </Svg>
  );
}
