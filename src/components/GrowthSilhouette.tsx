import Svg, { Defs, FeGaussianBlur, Filter, G, LinearGradient, Path, Stop } from 'react-native-svg';

import type { SpeciesId } from '@/domain/types';

import { getSilhouettePlate } from './silhouettes';

/** Largest box that fits the plate inside the max frame without stretching it. */
export function fitSilhouette(
  speciesId: SpeciesId,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const art = getSilhouettePlate(speciesId);
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
  /** Defaults to the fill opacity plus a lift so the contour reads over it. */
  rimOpacity?: number;
  /** Opacity multiplier at the plate's base, fading the fill from top to bottom. */
  fadeTo?: number;
  /** Keeps filter ids unique when two copies of the same plate share a screen. */
  filterSuffix?: string;
  /** `ground` stands the plate on the bottom edge. `center` sits it in the middle of the frame. */
  align?: 'ground' | 'center';
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
  rimOpacity,
  fadeTo,
  filterSuffix = 'main',
  align = 'ground',
}: GrowthSilhouetteProps) {
  const art = getSilhouettePlate(speciesId);
  const filterId = `sil-${speciesId}-${stage}-${filterSuffix}`;
  const fadeId = `sil-fade-${speciesId}-${stage}-${filterSuffix}`;
  const softened = blur > 0;
  const faded = fadeTo != null && fadeTo < 1;
  const rimWidth = rim != null ? (1.15 * art.viewBoxWidth) / Math.max(width, 1) : 0;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${art.viewBoxWidth} ${art.viewBoxHeight}`}
      preserveAspectRatio={align === 'center' ? 'xMidYMid meet' : 'xMidYMax meet'}>
      {softened || faded ? (
        <Defs>
          {softened ? (
            <Filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <FeGaussianBlur stdDeviation={Math.min(blur, 0.8) * (art.viewBoxWidth / 120)} />
            </Filter>
          ) : null}
          {faded ? (
            <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={fill} stopOpacity={1} />
              <Stop offset="55%" stopColor={fill} stopOpacity={0.5 + fadeTo * 0.5} />
              <Stop offset="100%" stopColor={fill} stopOpacity={fadeTo} />
            </LinearGradient>
          ) : null}
        </Defs>
      ) : null}
      <G opacity={opacity} filter={softened ? `url(#${filterId})` : undefined}>
        <Path d={art.d} fill={faded ? `url(#${fadeId})` : fill} />
      </G>
      {rim && rimWidth > 0 ? (
        <G opacity={rimOpacity ?? Math.min(1, opacity + 0.42)}>
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
