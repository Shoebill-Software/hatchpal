import Svg, { Ellipse } from 'react-native-svg';

import { parsePortraitKey } from '@/data/species/showcase';

import { FieldGuideFigure } from './fieldGuide';

export interface SpeciesPortraitProps {
  illustration: string;
  width: number;
  height: number;
}

export function SpeciesPortrait({ illustration, width, height }: SpeciesPortraitProps) {
  const parsed = parsePortraitKey(illustration);

  return (
    <Svg width={width} height={height} viewBox="0 0 200 240">
      <Ellipse cx="100" cy="214" rx="52" ry="6" fill="#140E0A" opacity={0.34} />
      {parsed ? <FieldGuideFigure speciesId={parsed.speciesId} baby={parsed.stage === 'baby'} /> : null}
    </Svg>
  );
}
