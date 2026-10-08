import Svg, { Defs, Ellipse, FeGaussianBlur, Filter, G, Path } from 'react-native-svg';

import type { SpeciesId } from '@/domain/types';

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

interface Ink {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinecap?: 'round';
  strokeLinejoin?: 'round';
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
  const juvenile = stage === 'juvenile';
  const filterId = `sil-${speciesId}-${stage}-${filterSuffix}`;
  const softened = blur > 0;
  const rimWidth = rim ? (1.15 * 120) / Math.max(width, 1) : 0;
  const body: Ink = { fill };
  const edge: Ink | null =
    rim && rimWidth > 0
      ? {
          fill: 'none',
          stroke: rim,
          strokeWidth: rimWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }
      : null;

  return (
    <Svg width={width} height={height} viewBox="0 0 120 160">
      {softened ? (
        <Defs>
          <Filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <FeGaussianBlur stdDeviation={Math.min(blur, 0.8)} />
          </Filter>
        </Defs>
      ) : null}
      <G opacity={opacity} filter={softened ? `url(#${filterId})` : undefined}>
        <Silhouette speciesId={speciesId} juvenile={juvenile} ink={body} />
      </G>
      {edge ? (
        <G opacity={Math.min(1, opacity + 0.42)}>
          <Silhouette speciesId={speciesId} juvenile={juvenile} ink={edge} />
        </G>
      ) : null}
    </Svg>
  );
}

function Silhouette({
  speciesId,
  juvenile,
  ink,
}: {
  speciesId: SpeciesId;
  juvenile: boolean;
  ink: Ink;
}) {
  switch (speciesId) {
    case 'peregrine_falcon':
      return <Falcon juvenile={juvenile} ink={ink} />;
    case 'emperor_penguin':
      return <Penguin juvenile={juvenile} ink={ink} />;
    case 'barn_owl':
      return <Owl juvenile={juvenile} ink={ink} />;
    case 'mandarin_duck':
      return <Duck juvenile={juvenile} ink={ink} />;
    case 'common_ostrich':
      return <Ostrich juvenile={juvenile} ink={ink} />;
    case 'emu':
      return <Emu juvenile={juvenile} ink={ink} />;
    case 'veiled_chameleon':
      return <Chameleon juvenile={juvenile} ink={ink} />;
    case 'saltwater_crocodile':
      return <Crocodile juvenile={juvenile} ink={ink} />;
    case 'ball_python':
      return <Python juvenile={juvenile} ink={ink} />;
    case 'platypus':
      return <Platypus juvenile={juvenile} ink={ink} />;
    case 'silkie_chicken':
      return <Chicken juvenile={juvenile} ink={ink} />;
    case 'american_robin':
      return <Robin juvenile={juvenile} ink={ink} />;
    case 'leopard_gecko':
      return <Gecko juvenile={juvenile} ink={ink} />;
    case 'green_sea_turtle':
      return <Turtle juvenile={juvenile} ink={ink} />;
    default:
      return assertSpecies(speciesId);
  }
}

function linePaint(ink: Ink, width: number) {
  const rim = ink.fill === 'none';
  return {
    fill: 'none' as const,
    stroke: rim ? ink.stroke : ink.fill,
    strokeWidth: rim ? (ink.strokeWidth ?? 1.2) : width,
    strokeLinecap: 'round' as const,
  };
}

function assertSpecies(speciesId: never): null {
  void speciesId;
  return null;
}

function Owl({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M40 108 C26 102 24 86 38 82 C32 64 48 50 64 60 C74 46 94 54 90 72 L106 76 L90 82 C98 96 88 110 72 114 L68 152 L56 152 L58 118 L46 118 L44 152 L32 152 L36 116 C24 114 22 108 40 108 Z"
          {...ink}
        />
        <Path d="M34 88 C18 96 20 112 38 104 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M60 38 C46 18 28 18 26 40 C12 44 10 64 24 76 C16 92 28 112 40 120 L34 132 L26 152 L44 152 L48 134 L72 134 L76 152 L94 152 L86 132 L80 120 C92 112 104 92 96 76 C110 64 108 44 94 40 C92 18 74 18 60 38 Z"
        {...ink}
      />
      <Path d="M56 78 L60 88 L64 78 Z" {...ink} />
      <Path d="M16 154 H104 V158 H16 Z" {...ink} />
    </G>
  );
}

function Duck({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M18 108 C8 100 10 116 22 114 C16 128 28 136 40 130 L36 152 L52 152 L54 132 L70 132 L74 152 L88 152 L82 130 C100 126 108 110 98 98 C112 92 114 78 100 76 C104 60 82 52 68 66 C60 54 42 58 42 74 C28 68 20 82 26 96 C18 94 14 102 18 108 Z"
          {...ink}
        />
        <Path d="M96 84 L116 90 L100 98 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path d="M6 86 L38 82 L38 98 L8 102 Z" {...ink} />
      <Path d="M24 76 C16 64 34 56 46 68 C52 80 42 94 30 90 C24 88 22 82 24 76 Z" {...ink} />
      <Path d="M36 92 Q50 48 74 54 Q62 78 38 96 Z" {...ink} />
      <Path d="M28 94 L46 114 L70 108 L50 82 Z" {...ink} />
      <Path d="M46 100 C38 118 50 142 74 142 C100 144 114 126 108 110 C96 100 70 104 52 108 Z" {...ink} />
      <Path d="M72 112 Q74 52 88 32 Q100 58 94 112 Z" {...ink} />
      <Path d="M88 112 Q102 56 116 64 Q108 92 102 112 Z" {...ink} />
      <Path d="M58 140 L52 156 L72 156 L66 140 Z" {...ink} />
      <Path d="M84 140 L80 156 L100 156 L92 140 Z" {...ink} />
    </G>
  );
}

function Chicken({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M30 122 C16 116 16 98 32 94 C26 76 44 62 60 72 C66 52 90 54 90 76 L106 80 L90 90 C100 106 92 126 74 130 L78 152 L62 152 L58 132 L44 132 L40 152 L28 152 L32 128 C20 126 18 118 30 122 Z"
          {...ink}
        />
        <Path d="M62 58 C66 46 82 46 84 62 C76 54 68 54 62 62 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Ellipse cx="50" cy="46" rx="15" ry="13" {...ink} />
      <Path
        d="M34 62 C18 66 16 86 30 92 C24 104 34 112 46 104 C40 118 58 122 62 106 C76 112 78 90 62 82 C70 66 54 56 40 62 Z"
        {...ink}
      />
      <Path d="M22 76 L6 80 L22 88 Z" {...ink} />
      <Path d="M26 88 C16 100 30 110 42 98 Z" {...ink} />
      <Path
        d="M46 100 C28 106 26 130 44 140 C64 152 98 148 110 130 C120 114 108 96 88 98 C74 88 58 92 46 100 Z"
        {...ink}
      />
      <Path d="M98 108 C118 98 128 118 110 130 C102 118 100 112 98 108 Z" {...ink} />
      <Path d="M44 134 C32 140 30 158 48 158 C60 158 66 146 58 134 Z" {...ink} />
      <Path d="M74 136 C70 152 78 160 94 158 C106 156 104 140 88 134 Z" {...ink} />
    </G>
  );
}

function Gecko({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path d="M16 106 C6 98 8 82 24 80 C38 76 50 90 42 104 C34 114 22 116 16 106 Z" {...ink} />
        <Path d="M34 98 C58 88 84 94 90 108 C94 120 70 128 44 118 C34 112 30 104 34 98 Z" {...ink} />
        <Path d="M84 106 C106 98 122 110 116 124 C106 116 96 114 86 114 Z" {...ink} />
        <Path d="M20 112 L12 122 L20 118 L14 130 L24 120 L26 132 L32 118 L38 128 L34 112 Z" {...ink} />
        <Path d="M62 120 L56 132 L64 128 L62 140 L70 128 L74 138 L78 124 L70 118 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path d="M10 100 L4 104 L12 108 Z" {...ink} />
      <Path d="M12 102 C8 90 22 80 34 86 C42 78 52 90 44 102 C38 110 22 112 12 102 Z" {...ink} />
      <Path d="M36 96 C58 88 78 94 82 108 C86 120 64 128 44 120 C34 114 30 104 36 96 Z" {...ink} />
      <Path d="M76 104 C98 94 116 108 112 128 C104 120 90 114 78 112 Z" {...ink} />
      <Path d="M24 114 L16 124 L24 120 L18 132 L28 122 L30 134 L36 122 L40 130 L34 114 Z" {...ink} />
      <Path d="M64 118 L58 130 L66 126 L64 138 L72 126 L78 136 L82 124 L72 116 Z" {...ink} />
    </G>
  );
}

function Turtle({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M36 100 C26 102 24 120 36 128 C50 138 74 136 82 122 C88 110 80 96 66 94 C52 90 42 92 36 100 Z"
          {...ink}
        />
        <Path d="M78 108 C92 104 108 110 106 118 C100 124 88 122 80 116 Z" {...ink} />
        <Path d="M64 116 C84 124 104 140 96 150 C82 140 66 128 58 118 Z" {...ink} />
        <Path d="M40 120 C26 130 28 144 42 136 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M58 72 C40 78 36 102 50 114 C66 128 96 126 108 112 C118 98 112 76 94 70 C78 62 68 64 58 72 Z"
        {...ink}
      />
      <Path d="M50 92 C32 86 18 96 22 108 C28 116 44 114 52 104 Z" {...ink} />
      <Path d="M62 108 C40 118 16 136 22 150 C34 140 52 124 70 114 Z" {...ink} />
      <Path d="M100 112 C116 122 114 138 100 132 C96 124 98 116 100 112 Z" {...ink} />
    </G>
  );
}

function Falcon({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M34 126 C18 118 18 98 36 92 C28 72 48 56 66 70 C74 52 96 56 96 76 L112 80 L96 90 C106 108 94 128 74 132 L78 152 L62 152 L58 132 L46 132 L42 152 L30 152 Z"
          {...ink}
        />
        <Path d="M36 108 C18 116 20 132 40 124 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path d="M10 78 L24 72 L22 86 Z" {...ink} />
      <Path d="M20 80 C16 62 32 50 46 58 C54 46 70 48 68 64 C60 74 46 78 40 86 C32 80 26 82 20 80 Z" {...ink} />
      <Path d="M40 84 C32 100 42 124 58 132 L52 152 L68 152 L72 134 C90 126 98 104 88 88 C78 96 58 98 48 88 Z" {...ink} />
      <Path d="M64 96 C90 74 112 98 98 130 L114 152 L124 146 L102 102 C92 86 76 90 66 106 Z" {...ink} />
      <Path d="M50 148 L44 158 L66 156 L58 146 Z" {...ink} />
      <Path d="M76 146 L72 158 L96 154 L84 144 Z" {...ink} />
    </G>
  );
}

function Penguin({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M40 136 C22 122 26 90 48 78 C42 58 62 44 78 56 C92 48 106 66 98 84 L114 90 L96 98 C110 116 100 140 76 146 L82 156 L64 156 L60 142 L46 142 L44 156 L32 156 Z"
          {...ink}
        />
        <Path d="M36 96 C16 108 18 130 42 120 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M52 34 C38 40 34 58 44 70 L30 76 L46 84 C36 104 34 128 50 142 L42 156 L74 156 L68 142 C90 134 100 104 90 76 C100 58 88 34 70 30 C62 26 56 28 52 34 Z"
        {...ink}
      />
      <Path d="M46 88 C20 104 16 134 44 126 C36 112 38 98 46 88 Z" {...ink} />
      <Path d="M36 154 H82 V159 H36 Z" {...ink} />
    </G>
  );
}

function Robin({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M40 116 C26 110 26 94 40 90 C36 74 52 64 66 74 C72 64 88 68 84 82 L100 86 L84 94 C92 110 82 126 66 126 L62 148 L48 148 L50 126 L40 124 Z"
          {...ink}
        />
      </G>
    );
  }
  return (
    <G>
      <Path d="M24 100 L8 104 L26 110 Z" {...ink} />
      <Path d="M22 98 C16 82 34 72 44 86 C50 74 64 78 56 94 C48 104 32 106 22 98 Z" {...ink} />
      <Path d="M40 100 C30 114 40 130 58 132 C76 134 88 118 78 104 C66 114 50 112 40 100 Z" {...ink} />
      <Path d="M72 108 C96 78 118 98 100 116 C90 106 80 108 72 114 Z" {...ink} />
      <Path d="M52 130 L46 152 L56 152 L60 132 Z" {...ink} />
      <Path d="M70 130 L78 152 L68 152 L64 132 Z" {...ink} />
      <Path d="M34 152 H96 V156 H34 Z" {...ink} />
    </G>
  );
}

function Ostrich({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  const neck = juvenile
    ? 'M64 108 C52 86 50 58 58 40'
    : 'M62 112 C44 84 40 48 52 22';
  return (
    <G>
      <Path
        d={
          juvenile
            ? 'M52 104 C36 108 34 132 52 138 C72 146 100 140 102 122 C104 106 86 98 70 102 C64 96 56 98 52 104 Z'
            : 'M48 108 C30 114 28 140 50 146 C74 156 106 148 110 126 C112 108 92 98 72 104 C64 96 54 98 48 108 Z'
        }
        {...ink}
      />
      <Path d={neck} {...linePaint(ink, juvenile ? 8 : 7)} />
      <Path
        d={juvenile ? 'M54 36 C48 26 64 18 70 30 C66 40 56 42 54 36 Z' : 'M46 22 C38 10 56 2 68 16 C64 28 50 30 46 22 Z'}
        {...ink}
      />
      <Path d={juvenile ? 'M50 32 L36 34 L50 40 Z' : 'M44 16 L26 18 L44 24 Z'} {...ink} />
      <Path d={juvenile ? 'M60 136 L52 156' : 'M56 144 L44 158'} {...linePaint(ink, juvenile ? 4.2 : 3.6)} />
      <Path d={juvenile ? 'M84 136 L94 156' : 'M90 144 L106 158'} {...linePaint(ink, juvenile ? 4.2 : 3.6)} />
      <Path d={juvenile ? 'M46 156 L60 154 L58 161 L42 160 Z' : 'M36 158 L54 154 L52 163 L30 162 Z'} {...ink} />
      <Path d={juvenile ? 'M86 156 L102 154 L100 161 L84 160 Z' : 'M96 158 L118 154 L114 163 L94 162 Z'} {...ink} />
    </G>
  );
}

function Emu({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  return (
    <G>
      <Path
        d={
          juvenile
            ? 'M48 108 C32 112 30 136 50 142 C74 150 104 142 104 122 C104 108 86 100 70 106 C60 96 50 100 48 108 Z'
            : 'M44 112 C26 118 24 144 48 150 C76 160 112 148 112 124 C112 108 90 98 70 108 C58 96 46 102 44 112 Z'
        }
        {...ink}
      />
      <Path d={juvenile ? 'M56 72 C68 92 76 110 80 122' : 'M50 36 C64 68 74 98 80 118'} {...linePaint(ink, juvenile ? 10 : 9)} />
      <Path
        d={juvenile ? 'M48 68 C42 56 58 48 68 60 C64 74 52 78 48 68 Z' : 'M42 34 C34 20 54 12 66 28 C60 42 46 44 42 34 Z'}
        {...ink}
      />
      <Path d={juvenile ? 'M46 64 L32 68 L48 74 Z' : 'M40 28 L22 32 L42 38 Z'} {...ink} />
      <Path d={juvenile ? 'M58 140 L48 158' : 'M54 148 L40 160'} {...linePaint(ink, juvenile ? 5 : 4.4)} />
      <Path d={juvenile ? 'M86 140 L98 158' : 'M96 148 L114 160'} {...linePaint(ink, juvenile ? 5 : 4.4)} />
      <Path d={juvenile ? 'M40 158 H108 V162 H40 Z' : 'M32 160 H120 V164 H32 Z'} {...ink} />
    </G>
  );
}

function Chameleon({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  return (
    <G>
      <Path
        d={
          juvenile
            ? 'M40 108 C28 104 30 122 44 124 C58 128 82 122 84 110 C86 98 68 94 54 100 C48 92 40 96 40 108 Z'
            : 'M36 112 C22 106 24 128 42 130 C62 136 90 128 92 112 C94 98 72 92 56 100 C48 90 36 96 36 112 Z'
        }
        {...ink}
      />
      <Path
        d={juvenile ? 'M48 96 C42 70 58 56 68 70 C60 62 50 70 52 90 Z' : 'M46 96 C36 58 58 32 74 56 C62 40 44 54 50 90 Z'}
        {...ink}
      />
      <Ellipse cx={juvenile ? 70 : 78} cy={juvenile ? 78 : 70} rx={juvenile ? 6 : 8} ry={juvenile ? 6 : 8} {...ink} />
      <Path
        d={
          juvenile
            ? 'M80 112 C98 104 110 120 102 132 C94 140 84 128 90 120 C94 112 88 110 84 116 Z'
            : 'M88 114 C112 102 128 124 116 140 C106 152 90 138 98 126 C104 116 96 112 92 120 C86 128 92 136 100 132 C108 126 100 116 92 118 Z'
        }
        {...ink}
      />
      <Path d={juvenile ? 'M48 122 L42 136 L54 130 L50 144 L60 128 Z' : 'M46 128 L38 146 L54 136 L48 154 L64 134 Z'} {...ink} />
      <Path d={juvenile ? 'M66 124 L70 140 L78 128 L84 142 L80 124 Z' : 'M68 128 L74 150 L86 134 L96 152 L88 128 Z'} {...ink} />
    </G>
  );
}

function Crocodile({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  return (
    <G>
      <Path
        d={
          juvenile
            ? 'M6 104 L16 98 L20 104 L26 98 L30 104 L36 100 L48 102 L70 96 L76 88 L82 98 L88 86 L94 100 L108 104 C118 112 116 128 102 130 L96 142 L84 128 L70 132 L64 144 L54 130 L40 128 L36 140 L28 126 L18 112 Z'
            : 'M2 102 L14 94 L20 102 L28 94 L34 102 L42 96 L56 100 L78 92 L86 80 L94 96 L102 78 L110 98 L124 104 C132 116 128 136 112 138 L104 154 L90 136 L74 140 L66 156 L54 136 L38 132 L32 148 L22 128 L8 112 Z'
        }
        {...ink}
      />
      <Path
        d={juvenile ? 'M102 112 C116 118 120 136 108 140 C112 128 108 118 102 114 Z' : 'M112 116 C132 124 138 150 118 156 C126 138 122 124 112 118 Z'}
        {...ink}
      />
    </G>
  );
}

function Python({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  if (juvenile) {
    return (
      <G>
        <Path
          d="M72 56 C96 50 108 74 94 90 C110 100 100 128 74 126 C46 124 36 100 52 88 C40 74 48 52 72 56 Z"
          {...ink}
        />
        <Path d="M78 58 C96 50 110 66 100 80 L90 72 C88 64 82 60 78 58 Z" {...ink} />
        <Path d="M96 66 L112 62 L100 76 Z" {...ink} />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M78 40 C112 36 122 72 104 94 C124 108 108 142 72 140 C32 138 20 104 42 86 C26 64 42 34 78 40 Z"
        {...ink}
      />
      <Path d="M86 44 C108 36 124 56 112 74 L98 64 C98 54 90 48 86 44 Z" {...ink} />
      <Path d="M108 58 L128 52 L112 72 Z" {...ink} />
    </G>
  );
}

function Platypus({ juvenile, ink }: { juvenile: boolean; ink: Ink }) {
  return (
    <G>
      <Path
        d={
          juvenile
            ? 'M22 104 C18 94 32 90 40 98 C36 108 28 110 22 104 Z'
            : 'M14 102 C8 90 28 84 40 96 C34 108 22 112 14 102 Z'
        }
        {...ink}
      />
      <Path
        d={
          juvenile
            ? 'M34 100 C52 90 86 94 92 108 C98 122 78 132 54 126 C40 122 30 112 34 100 Z'
            : 'M32 100 C54 86 96 92 104 110 C112 128 84 140 54 132 C36 126 26 114 32 100 Z'
        }
        {...ink}
      />
      <Path
        d={
          juvenile
            ? 'M86 108 C104 100 116 112 110 124 C100 120 92 116 86 112 Z'
            : 'M96 108 C120 98 136 114 126 130 C112 124 102 118 96 112 Z'
        }
        {...ink}
      />
      <Path d={juvenile ? 'M48 124 L44 140' : 'M46 130 L40 150'} {...linePaint(ink, juvenile ? 3.4 : 4.2)} />
      <Path d={juvenile ? 'M68 126 L74 142' : 'M74 132 L84 152'} {...linePaint(ink, juvenile ? 3.4 : 4.2)} />
    </G>
  );
}
