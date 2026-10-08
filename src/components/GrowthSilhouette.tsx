import Svg, { Defs, FeGaussianBlur, Filter, G, Path } from 'react-native-svg';

import type { SpeciesId } from '@/domain/types';

import { SILHOUETTE_ART } from './silhouetteArt';

/** Largest box that fits the plate inside the max frame without stretching it. */
export function fitSilhouette(
  speciesId: SpeciesId,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const art = SILHOUETTE_ART[speciesId];
  const aspect = art.viewBoxWidth / Math.max(art.viewBoxHeight, 1);
  const safeWidth = Math.max(maxWidth, 1);
  const safeHeight = Math.max(maxHeight, 1);
  const widthFromHeight = safeHeight * aspect;
  if (widthFromHeight <= safeWidth) {
    return { width: widthFromHeight, height: safeHeight };
  }
  return { width: safeWidth, height: safeWidth / aspect };
}

export interface GrowthSilhouetteProps {
  speciesId: SpeciesId;
  stage: 'juvenile' | 'adult';
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  /** Soft Gaussian halo. Leave at 0 for a crisp plate. */
  blur?: number;
  /** Fine contour highlight drawn outside the fill. */
  rim?: string;
  /** Keeps filter ids unique when two copies of the same plate share a screen. */
  filterSuffix?: string;
}

export function GrowthSilhouette({
  speciesId,
  stage,
  width,
  height,
  fill,
  opacity = 1,
  blur = 0,
  rim,
  filterSuffix = 'main',
}: GrowthSilhouetteProps) {
  const art = SILHOUETTE_ART[speciesId];
  const filterId = `sil-${speciesId}-${stage}-${filterSuffix}`;
  const softened = blur > 0;
  const rimWidth = rim != null ? (1.15 * art.viewBoxWidth) / Math.max(width, 1) : 0;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${art.viewBoxWidth} ${art.viewBoxHeight}`}
      preserveAspectRatio="xMidYMax meet">
      {softened ? (
        <Defs>
          <Filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <FeGaussianBlur stdDeviation={Math.min(blur, 0.8) * (art.viewBoxWidth / 120)} />
          </Filter>
        </Defs>
      ) : null}
      <G opacity={opacity} filter={softened ? `url(#${filterId})` : undefined}>
        <Path d={art.d} fill={fill} />
      </G>
      {rim && rimWidth > 0 ? (
        <G opacity={Math.min(1, opacity + 0.42)}>
          <Path
            d={art.d}
            fill="none"
            stroke={rim}
            strokeWidth={rimWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
    </Svg>
  );
}
