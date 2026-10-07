import Svg, { Ellipse, Path } from 'react-native-svg';

import type { EggShape, SpeciesConfig, SpeckleStyle } from '@/domain/types';

const VIEW_WIDTH = 120;
const VIEW_HEIGHT = 160;

const SHAPE_PATH: Record<EggShape, string> = {
  oval: 'M60 16 C34 16 22 52 22 88 C22 126 38 146 60 146 C82 146 98 126 98 88 C98 52 86 16 60 16 Z',
  elliptical:
    'M60 20 C32 20 18 54 18 82 C18 112 34 144 60 144 C86 144 102 112 102 82 C102 54 88 20 60 20 Z',
  pear: 'M60 14 C32 16 18 46 22 78 C26 114 40 150 60 152 C80 150 94 114 98 78 C102 46 88 16 60 14 Z',
  sphere:
    'M60 24 C30 24 16 52 16 82 C16 114 32 142 60 142 C88 142 104 114 104 82 C104 52 90 24 60 24 Z',
  elongated:
    'M60 8 C40 8 26 40 26 82 C26 124 40 154 60 154 C80 154 94 124 94 82 C94 40 80 8 60 8 Z',
  pitted:
    'M60 18 C28 18 12 52 12 84 C12 118 30 148 60 148 C90 148 108 118 108 84 C108 52 92 18 60 18 Z',
};

const SPECKLES: Record<Exclude<SpeckleStyle, 'none'>, readonly { cx: number; cy: number; rx: number; ry: number }[]> =
  {
    fine: [
      { cx: 48, cy: 70, rx: 2.2, ry: 1.6 },
      { cx: 74, cy: 88, rx: 1.8, ry: 1.4 },
      { cx: 58, cy: 108, rx: 2, ry: 1.5 },
    ],
    mottled: [
      { cx: 44, cy: 62, rx: 8, ry: 5.5 },
      { cx: 70, cy: 78, rx: 6, ry: 4.2 },
      { cx: 50, cy: 96, rx: 7, ry: 4.6 },
      { cx: 76, cy: 112, rx: 5.5, ry: 3.8 },
      { cx: 58, cy: 124, rx: 4, ry: 2.8 },
    ],
    pitted: [
      { cx: 40, cy: 58, rx: 2.4, ry: 2.4 },
      { cx: 58, cy: 52, rx: 2, ry: 2 },
      { cx: 76, cy: 64, rx: 2.6, ry: 2.6 },
      { cx: 46, cy: 78, rx: 2.2, ry: 2.2 },
      { cx: 68, cy: 86, rx: 2.4, ry: 2.4 },
      { cx: 84, cy: 96, rx: 2, ry: 2 },
      { cx: 52, cy: 104, rx: 2.6, ry: 2.6 },
      { cx: 74, cy: 116, rx: 2.2, ry: 2.2 },
      { cx: 42, cy: 118, rx: 1.8, ry: 1.8 },
    ],
  };

export interface SpeciesEggArtProps {
  species: SpeciesConfig;
  width: number;
  height: number;
}

export function SpeciesEggArt({ species, width, height }: SpeciesEggArtProps) {
  const { nest, shape, speckle } = species.egg;
  const marks = speckle === 'none' ? [] : SPECKLES[speckle];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <Ellipse cx="60" cy="150" rx="34" ry="6" fill={nest.castShadow} opacity={0.22} />
      <Path d={SHAPE_PATH[shape]} fill={nest.body} stroke={nest.stroke} strokeWidth={1.6} />
      <Path
        d="M46 36 C38 62 38 96 50 122"
        stroke={nest.highlight}
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.35}
        fill="none"
      />
      {marks.map((mark) => (
        <Ellipse
          key={`${mark.cx}-${mark.cy}`}
          cx={mark.cx}
          cy={mark.cy}
          rx={mark.rx}
          ry={mark.ry}
          fill={nest.speckle}
          opacity={speckle === 'pitted' ? 0.55 : 0.72}
        />
      ))}
    </Svg>
  );
}
