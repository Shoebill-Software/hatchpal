import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { getSpeciesConfig } from '@/data/species';
import type { SpeciesId } from '@/domain/types';

import { fitSilhouette, GrowthSilhouette } from './GrowthSilhouette';

export interface HatchlingFigureProps {
  speciesId: SpeciesId;
  maturationProgress: number;
  width?: number;
  height?: number;
  /** Draws the brooder bed under the animal. Omit while it is still inside the shell. */
  resting?: boolean;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Neonates keep a large head. Body mass catches up along the maturation curve. */
function morphScales(progress: number): { body: number; head: number } {
  const t = clampProgress(progress);
  return {
    body: 0.78 + 0.22 * t,
    head: 1.08 - 0.14 * t,
  };
}

export function HatchlingFigure({
  speciesId,
  maturationProgress,
  width = 220,
  height = 240,
  resting = true,
}: HatchlingFigureProps) {
  const { body, head } = morphScales(maturationProgress);

  if (
    speciesId !== 'silkie_chicken' &&
    speciesId !== 'leopard_gecko' &&
    speciesId !== 'green_sea_turtle'
  ) {
    return (
      <View style={{ width, height }}>
        {resting ? (
          <Svg width={width} height={height} viewBox="0 0 200 240" style={{ position: 'absolute' }}>
            <Ellipse cx="100" cy="214" rx="70" ry="14" fill="#CDB89A" opacity={0.45} />
            <Ellipse cx="100" cy="210" rx="46" ry="8" fill="#E7D7BE" opacity={0.9} />
          </Svg>
        ) : null}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' }}>
          <GrowthSilhouette
            speciesId={speciesId}
            stage="adult"
            {...fitSilhouette(speciesId, width * 0.92 * body, height * 0.78 * body)}
            fill={getSpeciesConfig(speciesId).growth.body}
          />
        </View>
      </View>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 200 240">
      {resting ? <Ellipse cx="100" cy="214" rx="70" ry="14" fill="#CDB89A" opacity={0.45} /> : null}
      {resting ? <Ellipse cx="100" cy="210" rx="46" ry="8" fill="#E7D7BE" opacity={0.9} /> : null}
      {speciesId === 'leopard_gecko' ? (
        <GeckoFigure body={body} head={head} />
      ) : speciesId === 'green_sea_turtle' ? (
        <TurtleFigure body={body} head={head} />
      ) : (
        <SilkieFigure body={body} head={head} />
      )}
    </Svg>
  );
}

function SilkieFigure({ body, head }: { body: number; head: number }) {
  return (
    <>
      <G transform={`translate(100 158) scale(${body}) translate(-100 -158)`}>
        <Ellipse cx="100" cy="162" rx="54" ry="42" fill="#F6E4B4" />
        <Ellipse cx="58" cy="150" rx="22" ry="18" fill="#F8EDD0" />
        <Ellipse cx="142" cy="152" rx="22" ry="18" fill="#F8EDD0" />
        <Ellipse cx="78" cy="176" rx="24" ry="16" fill="#E7D09A" />
        <Ellipse cx="124" cy="174" rx="26" ry="16" fill="#E7D09A" />
        <Ellipse cx="100" cy="148" rx="18" ry="12" fill="#FFF6DE" opacity={0.7} />
      </G>
      <Path
        d="M74 186 L66 210 M126 186 L134 210"
        stroke="#E07A3D"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M60 210 H74 M124 210 H140" stroke="#E07A3D" strokeWidth="3" strokeLinecap="round" />
      <G transform={`translate(112 92) scale(${head}) translate(-112 -92)`}>
        <Ellipse cx="112" cy="96" rx="32" ry="28" fill="#F7E7C2" />
        <Ellipse cx="100" cy="78" rx="12" ry="10" fill="#F3D98A" />
        <Ellipse cx="124" cy="70" rx="14" ry="11" fill="#E8C56A" />
        <Ellipse cx="136" cy="84" rx="10" ry="8" fill="#F3D98A" />
        <Circle cx="124" cy="94" r="3.4" fill="#2C241C" />
        <Circle cx="125.2" cy="93" r="1" fill="#FFFFFF" />
        <Path d="M140 100 L158 106 L140 112 Z" fill="#E08A3C" />
      </G>
    </>
  );
}

function GeckoFigure({ body, head }: { body: number; head: number }) {
  return (
    <>
      <G transform={`translate(108 150) scale(${body}) translate(-108 -150)`}>
        <Path
          d="M118 132 C150 118 168 146 162 168 C156 188 96 196 78 176 C62 158 70 132 96 128 C104 126 110 128 118 132 Z"
          fill="#E3C15A"
        />
        <Path
          d="M78 168 C58 176 36 168 22 150 C34 158 52 156 70 150"
          stroke="#E3C15A"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="128" cy="150" r="5" fill="#6A4A28" />
        <Circle cx="112" cy="162" r="4" fill="#6A4A28" />
        <Circle cx="138" cy="166" r="3.5" fill="#6A4A28" />
        <Circle cx="100" cy="148" r="3" fill="#6A4A28" />
        <Path d="M96 186 L88 206 M124 188 L132 208" stroke="#C4A24A" strokeWidth="3" strokeLinecap="round" />
        <Path d="M146 176 L160 196 M70 170 L56 188" stroke="#C4A24A" strokeWidth="3" strokeLinecap="round" />
      </G>
      <G transform={`translate(150 124) scale(${head}) translate(-150 -124)`}>
        <Ellipse cx="150" cy="124" rx="22" ry="16" fill="#E8C86A" />
        <Circle cx="158" cy="120" r="3.2" fill="#2C241C" />
        <Circle cx="159" cy="119" r="1" fill="#FFFFFF" />
        <Path d="M168 126 L180 130 L168 134" stroke="#C4843A" strokeWidth="2" strokeLinecap="round" fill="none" />
      </G>
    </>
  );
}

function TurtleFigure({ body, head }: { body: number; head: number }) {
  return (
    <>
      <G transform={`translate(100 150) scale(${body}) translate(-100 -150)`}>
        <Ellipse cx="100" cy="156" rx="58" ry="40" fill="#3E6B4F" />
        <Ellipse cx="100" cy="156" rx="40" ry="26" fill="#2F5340" />
        <Path d="M78 142 H122 M100 136 V176 M84 164 L116 148 M84 148 L116 164" stroke="#6FA888" strokeWidth="1.4" />
        <Ellipse cx="100" cy="176" rx="36" ry="10" fill="#E7D3A1" />
        <Ellipse cx="46" cy="150" rx="18" ry="8" fill="#6B8F72" transform="rotate(-18 46 150)" />
        <Ellipse cx="154" cy="150" rx="18" ry="8" fill="#6B8F72" transform="rotate(18 154 150)" />
        <Ellipse cx="62" cy="184" rx="16" ry="7" fill="#6B8F72" transform="rotate(24 62 184)" />
        <Ellipse cx="138" cy="184" rx="16" ry="7" fill="#6B8F72" transform="rotate(-24 138 184)" />
      </G>
      <G transform={`translate(148 118) scale(${head}) translate(-148 -118)`}>
        <Ellipse cx="148" cy="122" rx="16" ry="12" fill="#7DA184" />
        <Circle cx="154" cy="118" r="2.6" fill="#1C241C" />
        <Path d="M160 124 L172 128" stroke="#5E7A64" strokeWidth="2" strokeLinecap="round" />
      </G>
    </>
  );
}
