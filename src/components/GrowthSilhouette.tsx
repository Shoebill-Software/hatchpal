import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { SpeciesId } from '@/domain/types';

export interface GrowthSilhouetteProps {
  speciesId: SpeciesId;
  stage: 'juvenile' | 'adult';
  width: number;
  height: number;
  fill: string;
  opacity?: number;
}

export function GrowthSilhouette({
  speciesId,
  stage,
  width,
  height,
  fill,
  opacity = 1,
}: GrowthSilhouetteProps) {
  const juvenile = stage === 'juvenile';

  return (
    <Svg width={width} height={height} viewBox="0 0 120 160">
      <G opacity={opacity} fill={fill}>
        <Silhouette speciesId={speciesId} juvenile={juvenile} fill={fill} />
      </G>
    </Svg>
  );
}

function Silhouette({
  speciesId,
  juvenile,
  fill,
}: {
  speciesId: SpeciesId;
  juvenile: boolean;
  fill: string;
}) {
  switch (speciesId) {
    case 'peregrine_falcon':
      return <Falcon juvenile={juvenile} fill={fill} />;
    case 'emperor_penguin':
      return <Penguin juvenile={juvenile} fill={fill} />;
    case 'barn_owl':
      return <Owl juvenile={juvenile} fill={fill} />;
    case 'mandarin_duck':
      return <Duck juvenile={juvenile} fill={fill} />;
    case 'common_ostrich':
      return <Ostrich juvenile={juvenile} fill={fill} />;
    case 'veiled_chameleon':
      return <Chameleon juvenile={juvenile} fill={fill} />;
    case 'saltwater_crocodile':
      return <Crocodile juvenile={juvenile} fill={fill} />;
    case 'ball_python':
      return <Python juvenile={juvenile} fill={fill} />;
    case 'platypus':
      return <Platypus juvenile={juvenile} fill={fill} />;
    case 'silkie_chicken':
      return <Chicken juvenile={juvenile} fill={fill} />;
    case 'leopard_gecko':
      return <Gecko juvenile={juvenile} fill={fill} />;
    case 'green_sea_turtle':
      return <Turtle juvenile={juvenile} fill={fill} />;
    default:
      return assertSpecies(speciesId);
  }
}

function assertSpecies(speciesId: never): null {
  void speciesId;
  return null;
}

function Falcon({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  const wing = juvenile
    ? 'M58 78 C28 70 8 88 12 108 C28 100 44 96 58 100 Z'
    : 'M58 72 C18 48 2 78 10 112 C30 96 46 90 60 96 Z';
  return (
    <G fill={fill}>
      <Path d={wing} />
      <Path
        d={
          juvenile
            ? 'M62 78 C88 74 108 90 104 108 C88 100 74 96 62 100 Z'
            : 'M62 72 C98 46 118 76 110 112 C90 96 74 90 62 96 Z'
        }
      />
      <Ellipse cx="60" cy={juvenile ? 96 : 100} rx={juvenile ? 16 : 14} ry={juvenile ? 22 : 26} />
      <Circle cx="60" cy={juvenile ? 68 : 58} r={juvenile ? 12 : 11} />
      <Path d={juvenile ? 'M70 66 L84 70 L70 76 Z' : 'M70 56 L90 60 L70 68 Z'} />
      <Path d={juvenile ? 'M54 116 L48 132 L58 128 Z' : 'M52 122 L44 148 L62 136 Z'} />
    </G>
  );
}

function Penguin({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="60" cy={juvenile ? 96 : 92} rx={juvenile ? 28 : 24} ry={juvenile ? 40 : 48} />
      <Circle cx="60" cy={juvenile ? 52 : 38} r={juvenile ? 16 : 14} />
      <Path d={juvenile ? 'M74 52 L90 58 L74 66 Z' : 'M72 36 L96 44 L72 54 Z'} />
      <Path d={juvenile ? 'M36 88 C18 98 18 118 36 116 Z' : 'M38 78 C12 92 14 122 40 116 Z'} />
      <Path d={juvenile ? 'M84 88 C102 98 102 118 84 116 Z' : 'M82 78 C108 92 106 122 80 116 Z'} />
      <Ellipse cx="46" cy={juvenile ? 136 : 142} rx="12" ry="5" />
      <Ellipse cx="76" cy={juvenile ? 136 : 142} rx="12" ry="5" />
    </G>
  );
}

function Owl({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="60" cy={juvenile ? 108 : 112} rx={juvenile ? 28 : 24} ry={juvenile ? 28 : 30} />
      <Circle cx="60" cy={juvenile ? 70 : 62} r={juvenile ? 26 : 24} />
      <Path d={juvenile ? 'M40 128 L32 146 L50 138 Z' : 'M38 132 L24 154 L52 140 Z'} />
      <Path d={juvenile ? 'M80 128 L88 146 L70 138 Z' : 'M82 132 L96 154 L68 140 Z'} />
      {!juvenile ? <Path d="M36 100 C16 92 12 112 34 116 Z" /> : null}
      {!juvenile ? <Path d="M84 100 C104 92 108 112 86 116 Z" /> : null}
    </G>
  );
}

function Duck({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx={juvenile ? 62 : 64} cy="108" rx={juvenile ? 28 : 32} ry={juvenile ? 16 : 18} />
      <Circle cx={juvenile ? 36 : 34} cy={juvenile ? 96 : 92} r={juvenile ? 12 : 11} />
      <Path d={juvenile ? 'M24 96 L8 100 L24 106 Z' : 'M24 90 L4 96 L24 104 Z'} />
      {!juvenile ? <Path d="M40 78 C48 62 62 64 58 82 Z" /> : null}
      {!juvenile ? <Path d="M70 96 C92 78 104 96 86 108 Z" /> : null}
      <Path d="M48 122 L44 140 L56 132 M78 124 L84 142 L70 134" stroke={fill} strokeWidth="4" />
    </G>
  );
}

function Ostrich({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="70" cy={juvenile ? 100 : 108} rx={juvenile ? 26 : 30} ry={juvenile ? 18 : 20} />
      <Path
        d={
          juvenile
            ? 'M58 92 C48 70 46 48 52 36'
            : 'M58 96 C40 64 36 36 48 16'
        }
        stroke={fill}
        strokeWidth={juvenile ? 8 : 7}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={juvenile ? 52 : 46} cy={juvenile ? 32 : 14} r={juvenile ? 7 : 6} />
      <Path d={juvenile ? 'M58 30 L70 32 L58 36 Z' : 'M50 12 L66 14 L50 18 Z'} />
      <Path
        d={juvenile ? 'M58 116 L48 148 M82 116 L92 148' : 'M56 124 L40 156 M86 124 L104 156'}
        stroke={fill}
        strokeWidth={juvenile ? 5 : 4}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

function Chameleon({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="58" cy="100" rx={juvenile ? 22 : 24} ry="12" />
      <Path
        d={
          juvenile
            ? 'M46 92 C40 78 48 68 58 72 C52 64 44 70 46 84'
            : 'M44 86 C36 58 52 40 66 52 C54 36 36 48 42 78'
        }
      />
      <Circle cx={juvenile ? 64 : 70} cy={juvenile ? 86 : 78} r={juvenile ? 5 : 6} />
      <Path
        d={
          juvenile
            ? 'M78 104 C96 112 104 132 90 140 C100 124 92 110 78 108'
            : 'M80 104 C104 96 118 120 108 142 C116 120 104 104 84 108'
        }
        stroke={fill}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

function Crocodile({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="62" cy="96" rx={juvenile ? 28 : 30} ry="12" />
      <Path
        d={
          juvenile
            ? 'M36 92 L8 88 L6 96 L36 100 Z'
            : 'M34 90 L4 84 L2 94 L34 100 Z'
        }
      />
      <Path d={juvenile ? 'M88 98 C104 104 112 120 100 128' : 'M90 98 C112 108 118 132 100 140'} stroke={fill} strokeWidth={juvenile ? 8 : 10} strokeLinecap="round" fill="none" />
      <Path d="M48 106 L44 122 M62 108 L60 124 M76 106 L80 122" stroke={fill} strokeWidth="3" strokeLinecap="round" />
      {!juvenile ? <Path d="M40 84 L48 78 L56 84 L64 76 L72 84" fill={fill} /> : null}
    </G>
  );
}

function Python({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Path
        d={
          juvenile
            ? 'M70 48 C96 48 104 72 92 88 C108 96 100 124 74 124 C40 124 28 96 48 84 C32 72 40 48 70 48 Z'
            : 'M78 36 C108 40 114 72 98 92 C116 104 104 136 70 136 C28 136 16 100 42 84 C24 64 40 32 78 36 Z'
        }
      />
      <Circle cx={juvenile ? 78 : 88} cy={juvenile ? 56 : 48} r={juvenile ? 7 : 8} />
      <Path d={juvenile ? 'M84 54 L96 56 L84 62 Z' : 'M94 44 L112 46 L94 54 Z'} />
    </G>
  );
}

function Platypus({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="62" cy="100" rx={juvenile ? 24 : 28} ry="14" />
      <Ellipse cx={juvenile ? 34 : 28} cy="96" rx={juvenile ? 12 : 16} ry="6" />
      <Path
        d={
          juvenile
            ? 'M84 96 L108 92 L110 108 L84 106 Z'
            : 'M86 92 L116 86 L118 110 L86 108 Z'
        }
      />
      <Path d="M50 112 L46 128 M70 114 L74 130" stroke={fill} strokeWidth="4" strokeLinecap="round" />
    </G>
  );
}

function Chicken({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="60" cy="108" rx={juvenile ? 26 : 28} ry={juvenile ? 20 : 22} />
      <Circle cx="78" cy={juvenile ? 78 : 72} r={juvenile ? 14 : 13} />
      <Path d={juvenile ? 'M70 64 C74 52 86 54 82 68 Z' : 'M72 56 C78 36 96 48 86 66 Z'} />
      <Path d="M90 74 L106 78 L90 84 Z" />
      <Path d="M48 126 L42 146 M74 128 L80 148" stroke={fill} strokeWidth="4" strokeLinecap="round" />
    </G>
  );
}

function Gecko({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="64" cy="100" rx={juvenile ? 22 : 26} ry="12" />
      <Circle cx="40" cy="92" r={juvenile ? 9 : 10} />
      <Path
        d={
          juvenile
            ? 'M82 100 C100 108 108 128 92 136'
            : 'M86 102 C108 96 116 124 98 142'
        }
        stroke={fill}
        strokeWidth={juvenile ? 8 : 10}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M52 110 L46 126 M70 112 L76 128" stroke={fill} strokeWidth="3" strokeLinecap="round" />
    </G>
  );
}

function Turtle({ juvenile, fill }: { juvenile: boolean; fill: string }) {
  return (
    <G fill={fill}>
      <Ellipse cx="60" cy="96" rx={juvenile ? 28 : 34} ry={juvenile ? 18 : 22} />
      <Ellipse cx="60" cy="96" rx={juvenile ? 16 : 18} ry={juvenile ? 10 : 12} fill="none" stroke={fill} strokeWidth="3" />
      <Ellipse cx={juvenile ? 28 : 22} cy="92" rx="8" ry="6" />
      <Path d={juvenile ? 'M36 112 L22 132' : 'M30 114 L8 140'} stroke={fill} strokeWidth="6" strokeLinecap="round" />
      <Path d={juvenile ? 'M84 112 L98 132' : 'M90 114 L112 140'} stroke={fill} strokeWidth="6" strokeLinecap="round" />
    </G>
  );
}
