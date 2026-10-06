import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { HatchlingFigure } from '@/components/HatchlingFigure';
import type { CandlingFeatures, DevelopmentStage, SpeciesId } from '@/domain/types';

export interface MilestoneDiagramProps {
  stage: DevelopmentStage;
  candling: CandlingFeatures | null;
  speciesId: SpeciesId;
  duringIncubation: boolean;
}

export function MilestoneDiagram({
  stage,
  candling,
  speciesId,
  duringIncubation,
}: MilestoneDiagramProps) {
  return (
    <View style={styles.plate}>
      {duringIncubation && candling ? (
        <IncubationPlate stage={stage} candling={candling} />
      ) : (
        <HatchlingFigure
          speciesId={speciesId}
          maturationProgress={figureProgress(stage)}
          width={168}
          height={188}
          resting
        />
      )}
    </View>
  );
}

function IncubationPlate({ stage, candling }: { stage: DevelopmentStage; candling: CandlingFeatures }) {
  const silhouette = clampUnit(candling.embryoSilhouettePct);
  const air = clampUnit(candling.airCellPct);
  const embryoRx = 8 + silhouette * 34;
  const embryoRy = 10 + silhouette * 46;
  const embryoCx = 80;
  const embryoCy = 128 - silhouette * 18;
  const airRy = 8 + air * 34;
  const airCy = 48 + airRy * 0.15;
  const clipId = `milestone-egg-${stage}`;

  return (
    <Svg width={200} height={236} viewBox="0 0 160 200">
      <Defs>
        <ClipPath id={clipId}>
          <Ellipse cx="80" cy="108" rx="58" ry="74" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Ellipse cx="80" cy="108" rx="58" ry="74" fill="#F6D7B0" />
        {silhouette < 0.5 ? <Ellipse cx="86" cy="132" rx="34" ry="28" fill="#E7B23C" /> : null}
        <Ellipse cx="80" cy={airCy} rx={36 + air * 10} ry={airRy} fill="#FBF6EE" />
        {candling.bloodVesselsVisible ? (
          <G stroke="#8B3030" strokeWidth={1.6} fill="none" opacity={0.8} strokeLinecap="round">
            <Path d={`M ${embryoCx} ${embryoCy} C 58 96 48 78 40 92`} />
            <Path d={`M ${embryoCx} ${embryoCy} C 104 92 118 74 124 96`} />
            <Path d={`M ${embryoCx} ${embryoCy} C 70 150 52 158 46 142`} />
            <Path d={`M ${embryoCx} ${embryoCy} C 98 154 120 150 118 132`} />
          </G>
        ) : null}
        <Ellipse cx={embryoCx} cy={embryoCy} rx={embryoRx} ry={embryoRy} fill="#C4654A" />
        {candling.eyeSpotVisible ? (
          <Circle
            cx={embryoCx - embryoRx * 0.15}
            cy={embryoCy - embryoRy * 0.12}
            r={Math.max(2.4, embryoRx * 0.14)}
            fill="#1B140F"
          />
        ) : null}
      </G>
      <Ellipse cx="80" cy="108" rx="58" ry="74" stroke="#E4C7A2" strokeWidth={3} fill="none" />
      {stage === 'external_pip' ? (
        <Path
          d="M108 64 L100 78 L114 90 L102 108"
          stroke="#FBF7F1"
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

function figureProgress(stage: DevelopmentStage): number {
  if (stage === 'adult') {
    return 1;
  }
  if (stage === 'juvenile') {
    return 0.5;
  }
  return 0.04;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: '#F6EFE4',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 210,
  },
});
