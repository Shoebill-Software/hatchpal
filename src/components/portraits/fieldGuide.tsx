import { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { SpeciesId } from '@/domain/types';

const INK = '#2A2118';

function edge(color: string, width = 0.7) {
  return {
    stroke: color,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function ProfileEye({ x, y, r = 3.1 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={r * 1.2} ry={r} fill="#F7F3EA" stroke={INK} strokeWidth={0.55} />
      <Circle cx={x + r * 0.2} cy={y} r={r * 0.46} fill="#1C140E" />
      <Circle cx={x - r * 0.05} cy={y - r * 0.22} r={r * 0.16} fill="#FFFFFF" />
    </G>
  );
}

export function FieldGuideFigure({ speciesId, baby }: { speciesId: SpeciesId; baby: boolean }) {
  switch (speciesId) {
    case 'silkie_chicken':
      return baby ? <SilkieChick /> : <SilkieHen />;
    case 'peregrine_falcon':
      return baby ? <FalconChick /> : <Peregrine />;
    case 'barn_owl':
      return baby ? <OwlChick /> : <BarnOwl />;
    case 'mandarin_duck':
      return baby ? <Duckling /> : <MandarinDrake />;
    case 'american_robin':
      return baby ? <RobinNestling /> : <Robin />;
    case 'emperor_penguin':
      return baby ? <PenguinChick /> : <Emperor />;
    case 'common_ostrich':
      return baby ? <OstrichChick /> : <Ostrich />;
    case 'emu':
      return baby ? <EmuChick /> : <Emu />;
    case 'leopard_gecko':
      return baby ? <GeckoHatchling /> : <LeopardGecko />;
    case 'veiled_chameleon':
      return baby ? <ChameleonHatchling /> : <VeiledChameleon />;
    case 'ball_python':
      return baby ? <PythonHatchling /> : <BallPython />;
    case 'green_sea_turtle':
      return baby ? <TurtleHatchling /> : <GreenTurtle />;
    case 'saltwater_crocodile':
      return baby ? <CrocHatchling /> : <SaltwaterCrocodile />;
    case 'platypus':
      return baby ? <PlatypusNestling /> : <Platypus />;
    default:
      return assertSpecies(speciesId);
  }
}

function assertSpecies(speciesId: never): null {
  void speciesId;
  return null;
}

function SilkieChick() {
  return (
    <G>
      <Path d="M92 188 L86 210 M108 190 L112 212" stroke="#C4A06A" strokeWidth={3.2} strokeLinecap="round" />
      <Ellipse cx="108" cy="162" rx="34" ry="28" fill="#F3E2B4" {...edge('#C8AE78', 0.8)} />
      <Ellipse cx="96" cy="168" rx="16" ry="12" fill="#E4C98A" />
      <Path d="M118 150 C138 156 142 174 122 180 C134 168 132 156 118 152 Z" fill="#EBD7A2" {...edge('#C8AE78', 0.6)} />
      <Circle cx="78" cy="132" r="18" fill="#F6E6BE" {...edge('#C8AE78', 0.8)} />
      <Path d="M70 118 C74 108 88 108 86 120 Z" fill="#F8EED4" {...edge('#C8AE78', 0.6)} />
      <Path d="M62 136 C48 134 46 142 60 144 Z" fill="#E0B15A" {...edge('#A87830', 0.6)} />
      <ProfileEye x={74} y={130} r={3.2} />
    </G>
  );
}

function SilkieHen() {
  return (
    <G>
      <Path d="M118 196 C108 214 128 216 124 198" stroke="#E7D3A4" strokeWidth={7} strokeLinecap="round" />
      <Path d="M86 198 C76 216 96 218 92 200" stroke="#E7D3A4" strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx="112" cy="160" rx="40" ry="32" fill="#F4E4B6" {...edge('#C8AE78', 0.8)} />
      <Path d="M124 142 C156 150 160 178 128 186 C148 170 146 154 126 148 Z" fill="#E7D4A0" {...edge('#C8AE78', 0.7)} />
      <Path d="M136 168 C148 174 150 186 136 184" stroke="#D2B888" strokeWidth={1} fill="none" />
      <Circle cx="78" cy="124" r="18" fill="#F6E6BE" {...edge('#C8AE78', 0.8)} />
      <Path d="M64 108 C70 86 96 84 98 112 C88 96 74 98 68 112 Z" fill="#FBF3DC" {...edge('#C8AE78', 0.7)} />
      <Path d="M70 112 C78 96 92 100 86 116 C80 104 72 106 70 116 Z" fill="#6A2848" {...edge('#4A1830', 0.6)} />
      <Ellipse cx="62" cy="128" rx="4" ry="5" fill="#3AA8A4" {...edge('#1E6864', 0.5)} />
      <Path d="M60 132 C46 130 44 138 58 140 Z" fill="#E0B15A" {...edge('#A87830', 0.6)} />
      <ProfileEye x={74} y={122} />
    </G>
  );
}

function FalconChick() {
  return (
    <G>
      <Path d="M96 190 L90 214 M120 192 L128 214" stroke="#E2B15A" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx="112" cy="164" rx="32" ry="28" fill="#F4EFE6" {...edge('#C8BEB0', 0.8)} />
      <Path d="M88 156 C68 162 66 180 90 176 Z" fill="#E7E0D4" {...edge('#C8BEB0', 0.6)} />
      <Circle cx="82" cy="128" r="16" fill="#F7F3EA" {...edge('#C8BEB0', 0.8)} />
      <Path d="M70 118 C74 108 96 110 92 122 Z" fill="#3A342C" />
      <Path d="M66 132 C50 128 48 138 64 140 C70 136 66 134 66 132 Z" fill="#C8B48A" {...edge('#8A7040', 0.6)} />
      <ProfileEye x={78} y={126} />
    </G>
  );
}

function Peregrine() {
  return (
    <G>
      <Path d="M128 150 C168 118 196 132 188 156 C166 146 146 150 128 162 Z" fill="#4E5C6A" {...edge('#2E3842', 0.7)} />
      <Path d="M150 138 C162 128 176 134 170 146" stroke="#D7C4A4" strokeWidth={1.2} fill="none" />
      <Path d="M118 176 L108 214" stroke="#E2B15A" strokeWidth={4.5} strokeLinecap="round" />
      <Path d="M96 178 L84 214" stroke="#E2B15A" strokeWidth={4.5} strokeLinecap="round" />
      <Ellipse cx="112" cy="156" rx="22" ry="30" fill="#F3E6D2" {...edge('#C4B096', 0.7)} />
      <Path d="M100 140 H124" stroke="#C4B096" strokeWidth={1.1} />
      <Path d="M98 152 H126" stroke="#C4B096" strokeWidth={1.1} />
      <Path d="M100 164 H124" stroke="#C4B096" strokeWidth={1.1} />
      <Path d="M108 168 L96 196 L116 184 Z" fill="#5C6A78" {...edge('#2E3842', 0.6)} />
      <Circle cx="86" cy="112" r="14" fill="#3E4A56" {...edge('#2E3842', 0.7)} />
      <Path d="M78 104 C86 96 100 100 96 112 C90 102 82 104 78 112 Z" fill="#1C2430" />
      <Path d="M72 116 C54 112 52 124 70 126 Z" fill="#F0C14A" {...edge('#A87820', 0.6)} />
      <ProfileEye x={82} y={110} r={2.8} />
    </G>
  );
}

function OwlChick() {
  return (
    <G>
      <Path d="M78 196 L70 214 M122 196 L130 214" stroke="#E7D3B0" strokeWidth={3.4} strokeLinecap="round" />
      <Ellipse cx="104" cy="168" rx="36" ry="28" fill="#F7F4EF" {...edge('#D8D0C4', 0.8)} />
      <Path d="M70 132 C68 96 100 84 104 112 C108 84 140 96 136 132 C136 156 104 168 104 168 C104 168 70 156 70 132 Z" fill="#FFF8EE" {...edge('#D8D0C4', 0.8)} />
      <Path d="M96 138 L100 146 L104 138 Z" fill="#C9A15A" {...edge('#8A7030', 0.5)} />
      <ProfileEye x={90} y={124} r={4.2} />
      <ProfileEye x={118} y={124} r={4.2} />
    </G>
  );
}

function BarnOwl() {
  return (
    <G>
      <Path d="M92 196 L80 220 M128 196 L140 220" stroke="#F0D7B0" strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M128 148 C164 132 176 162 146 176 Z" fill="#E4C98A" {...edge('#B89458', 0.7)} />
      <Ellipse cx="108" cy="164" rx="30" ry="32" fill="#F3E2C0" {...edge('#C8B48A', 0.7)} />
      <Path d="M78 118 C76 82 108 70 112 100 C116 70 148 82 146 118 C146 148 112 162 112 162 C112 162 78 148 78 118 Z" fill="#FFF6EA" {...edge('#D2C4AE', 0.8)} />
      <Path d="M104 132 L108 142 L112 132 Z" fill="#C9A15A" {...edge('#8A7030', 0.5)} />
      <ProfileEye x={96} y={112} r={4} />
      <ProfileEye x={126} y={112} r={4} />
    </G>
  );
}

function Duckling() {
  return (
    <G>
      <Path d="M96 186 L88 210 M124 188 L132 210" stroke="#C9842A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M86 208 H108 L100 214 Z" fill="#E0923A" />
      <Path d="M116 210 H138 L128 216 Z" fill="#E0923A" />
      <Ellipse cx="112" cy="162" rx="34" ry="24" fill="#F0C84A" {...edge('#C9842A', 0.8)} />
      <Ellipse cx="98" cy="166" rx="12" ry="9" fill="#C9842A" />
      <Circle cx="74" cy="140" r="16" fill="#F6D56A" {...edge('#C9842A', 0.8)} />
      <Path d="M62 136 C40 132 28 142 34 150 C46 156 64 148 66 142 Z" fill="#E0923A" {...edge('#A86820', 0.7)} />
      <Path d="M70 124 C66 112 86 112 82 126 Z" fill="#C9842A" />
      <ProfileEye x={70} y={136} />
    </G>
  );
}

function MandarinDrake() {
  return (
    <G>
      <Path d="M132 86 C148 36 176 34 178 86 C164 58 148 64 136 92 Z" fill="#F08A2A" {...edge('#C45A18', 0.8)} />
      <Path d="M140 92 C156 48 184 56 180 98 C164 70 150 78 142 100 Z" fill="#E07020" {...edge('#C45A18', 0.6)} />
      <Ellipse cx="116" cy="158" rx="40" ry="24" fill="#F4F1EA" {...edge('#C8C0B4', 0.7)} />
      <Path d="M92 148 C82 128 104 118 112 140 Z" fill="#6A3E86" {...edge('#3E2048', 0.7)} />
      <Circle cx="70" cy="128" r="16" fill="#F7F3EA" {...edge('#C8C0B4', 0.7)} />
      <Path d="M62 112 C72 96 92 102 86 118 C78 106 66 108 62 120 Z" fill="#F08A2A" {...edge('#C45A18', 0.6)} />
      <Path d="M56 132 C32 128 22 140 30 148 C44 154 58 144 60 138 Z" fill="#D24A3A" {...edge('#8A2818', 0.7)} />
      <Path d="M100 176 L92 210 M136 178 L148 210" stroke="#E0923A" strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M90 208 H116 L104 216 Z" fill="#E0923A" />
      <Path d="M126 210 H154 L140 218 Z" fill="#E0923A" />
      <ProfileEye x={66} y={126} r={2.8} />
    </G>
  );
}

function RobinNestling() {
  return (
    <G>
      <Ellipse cx="112" cy="166" rx="30" ry="26" fill="#E7C2A4" {...edge('#C4926A', 0.8)} />
      <Circle cx="96" cy="160" r="2.2" fill="#5C4030" />
      <Circle cx="112" cy="172" r="1.8" fill="#5C4030" />
      <Circle cx="124" cy="158" r="2" fill="#5C4030" />
      <Circle cx="80" cy="132" r="16" fill="#F3D2B4" {...edge('#C4926A', 0.8)} />
      <Path d="M64 136 C42 132 40 146 62 148 C78 144 70 138 64 136 Z" fill="#F0C14A" {...edge('#C49220', 0.6)} />
      <Path d="M58 142 L52 150 L66 146 Z" fill="#F6D56A" />
      <Path d="M100 188 L94 212 M126 190 L134 212" stroke="#C4926A" strokeWidth={3} strokeLinecap="round" />
      <ProfileEye x={76} y={130} r={3.4} />
    </G>
  );
}

function Robin() {
  return (
    <G>
      <Path d="M128 142 C166 116 184 136 168 162 C154 148 140 148 128 156 Z" fill="#6B5344" {...edge('#3E3228', 0.7)} />
      <Ellipse cx="112" cy="158" rx="30" ry="24" fill="#E15A3A" {...edge('#A83822', 0.7)} />
      <Path d="M96 176 L78 198 L108 186 Z" fill="#6B5344" {...edge('#3E3228', 0.6)} />
      <Circle cx="78" cy="128" r="15" fill="#4A4038" {...edge('#2A241C', 0.7)} />
      <Path d="M64 132 C42 128 38 140 60 144 Z" fill="#F0C14A" {...edge('#C49220', 0.6)} />
      <Path d="M104 184 L96 214 M132 186 L142 214" stroke="#5C4030" strokeWidth={3.2} strokeLinecap="round" />
      <ProfileEye x={74} y={126} r={2.8} />
    </G>
  );
}

function PenguinChick() {
  return (
    <G>
      <Ellipse cx="104" cy="168" rx="36" ry="32" fill="#C8C2B8" {...edge('#8A847C', 0.8)} />
      <Ellipse cx="104" cy="176" rx="18" ry="16" fill="#F4F1EA" />
      <Circle cx="104" cy="122" r="22" fill="#4A4A4A" {...edge('#2A2A2A', 0.7)} />
      <Path d="M92 118 C100 108 124 108 128 124 C116 114 100 114 92 124 Z" fill="#F4F1EA" />
      <Path d="M124 126 C146 122 148 134 128 136 Z" fill="#E07A3A" {...edge('#A85020', 0.6)} />
      <Path d="M78 160 C58 168 60 186 82 178 Z" fill="#B0AAA2" {...edge('#8A847C', 0.6)} />
      <Ellipse cx="86" cy="204" rx="12" ry="5" fill="#E7D3B0" />
      <Ellipse cx="122" cy="204" rx="12" ry="5" fill="#E7D3B0" />
      <ProfileEye x={112} y={120} r={2.6} />
    </G>
  );
}

function Emperor() {
  return (
    <G>
      <Ellipse cx="108" cy="158" rx="28" ry="46" fill="#1C1C1C" {...edge('#111', 0.6)} />
      <Path d="M96 130 C108 150 128 168 118 196 C100 176 92 150 96 130 Z" fill="#F4F1EA" />
      <Path d="M100 124 C112 112 136 124 128 146 C116 132 104 128 100 124 Z" fill="#F0C14A" />
      <Circle cx="112" cy="96" r="16" fill="#1C1C1C" />
      <Path d="M104 88 C116 78 132 90 124 104 C114 94 106 92 104 88 Z" fill="#F0C14A" />
      <Path d="M126 98 C156 92 160 108 130 112 Z" fill="#E07A3A" {...edge('#A85020', 0.6)} />
      <Path d="M82 140 C52 150 54 182 88 170 Z" fill="#1C1C1C" />
      <Ellipse cx="92" cy="208" rx="14" ry="5" fill="#E7D3B0" />
      <Ellipse cx="126" cy="208" rx="14" ry="5" fill="#E7D3B0" />
      <ProfileEye x={116} y={94} r={2.4} />
    </G>
  );
}

function OstrichChick() {
  return (
    <G>
      <Ellipse cx="118" cy="150" rx="28" ry="22" fill="#E6C48A" {...edge('#B89458', 0.8)} />
      <Path d="M100 140 C88 110 86 78 96 58" stroke="#E6C48A" strokeWidth={8} strokeLinecap="round" />
      <Path d="M96 120 L104 116 M94 100 L104 96 M96 80 L104 78" stroke="#3A342C" strokeWidth={2} />
      <Circle cx="94" cy="50" r="8" fill="#E6C48A" {...edge('#B89458', 0.7)} />
      <Path d="M88 50 L72 52 L88 56 Z" fill="#C9842A" />
      <Path d="M108 168 L96 210 M132 168 L146 210" stroke="#C9A36A" strokeWidth={4} strokeLinecap="round" />
      <ProfileEye x={96} y={48} r={2.2} />
    </G>
  );
}

function Ostrich() {
  return (
    <G>
      <Ellipse cx="124" cy="150" rx="34" ry="24" fill="#1E1E1E" />
      <Path d="M112 136 C150 120 168 150 140 162 Z" fill="#F4F1EA" {...edge('#C8C0B4', 0.6)} />
      <Path d="M108 132 C78 96 70 52 92 22" stroke="#E7B7B0" strokeWidth={7} strokeLinecap="round" fill="none" />
      <Circle cx="90" cy="18" r="7" fill="#E7B7B0" />
      <Path d="M84 16 L64 18 L84 22 Z" fill="#C9842A" />
      <Path d="M108 170 L88 214 M140 170 L164 214" stroke="#E7B7B0" strokeWidth={4} strokeLinecap="round" />
      <Path d="M84 214 H96 M158 214 H172" stroke="#1E1E1E" strokeWidth={3} strokeLinecap="round" />
      <ProfileEye x={92} y={16} r={2} />
    </G>
  );
}

function EmuChick() {
  return (
    <G>
      <Ellipse cx="116" cy="156" rx="30" ry="20" fill="#8A7048" {...edge('#5C4830', 0.8)} />
      <Path d="M100 148 C92 120 98 90 110 72" stroke="#C4A574" strokeWidth={9} strokeLinecap="round" />
      <Path d="M98 130 L110 126 M100 110 L112 106 M104 90 L114 88" stroke="#F4E6C8" strokeWidth={2.2} />
      <Circle cx="112" cy="64" r="9" fill="#C4A574" {...edge('#5C4830', 0.6)} />
      <Path d="M118 64 L134 68 L118 72 Z" fill="#8A5A30" />
      <Path d="M104 172 L94 212 M132 174 L146 212" stroke="#8A7048" strokeWidth={4.2} strokeLinecap="round" />
      <ProfileEye x={114} y={62} r={2.2} />
    </G>
  );
}

function Emu() {
  return (
    <G>
      <Ellipse cx="122" cy="156" rx="36" ry="22" fill="#5C4632" {...edge('#3A2C1C', 0.7)} />
      <Path d="M108 146 C96 120 100 78 118 48" stroke="#5C4632" strokeWidth={12} strokeLinecap="round" />
      <Path d="M112 48 C120 28 142 36 136 58 C128 44 116 46 112 58 Z" fill="#3E6F8A" {...edge('#1E3E52', 0.7)} />
      <Path d="M136 48 L154 52 L136 58 Z" fill="#8A5A30" />
      <Path d="M104 174 L90 214 M140 176 L160 214" stroke="#5C4632" strokeWidth={5} strokeLinecap="round" />
      <Path d="M84 214 H100 M154 214 H172" stroke="#2A2018" strokeWidth={3} />
      <ProfileEye x={124} y={42} r={2.2} />
    </G>
  );
}

function GeckoHatchling() {
  return (
    <G>
      <Path d="M120 150 C150 146 162 168 140 176 C156 164 148 150 128 150 Z" fill="#E3B84A" {...edge('#A88428', 0.7)} />
      <Ellipse cx="100" cy="156" rx="28" ry="12" fill="#E8C45A" {...edge('#A88428', 0.8)} />
      <Path d="M86 150 H118" stroke="#3A342C" strokeWidth={3} />
      <Path d="M90 158 H116" stroke="#3A342C" strokeWidth={2} />
      <Circle cx="70" cy="146" r="11" fill="#F0D070" {...edge('#A88428', 0.7)} />
      <Path d="M60 146 L46 144 L60 152 Z" fill="#C9A15A" />
      <Path d="M86 166 L80 186 M108 166 L116 186" stroke="#E3B84A" strokeWidth={3.2} strokeLinecap="round" />
      <ProfileEye x={68} y={144} r={2.6} />
    </G>
  );
}

function LeopardGecko() {
  return (
    <G>
      <Path d="M128 148 C168 140 176 170 146 180 C168 164 158 148 134 150 Z" fill="#E3B84A" {...edge('#A88428', 0.8)} />
      <Ellipse cx="104" cy="156" rx="32" ry="14" fill="#F0D070" {...edge('#A88428', 0.8)} />
      <Circle cx="78" cy="168" r="2" fill="#3A342C" />
      <Circle cx="96" cy="150" r="2.2" fill="#3A342C" />
      <Circle cx="118" cy="164" r="1.8" fill="#3A342C" />
      <Circle cx="136" cy="156" r="2" fill="#3A342C" />
      <Circle cx="68" cy="142" r="12" fill="#F2D478" {...edge('#A88428', 0.7)} />
      <Path d="M58 142 L40 138 L58 150 Z" fill="#C9A15A" />
      <Path d="M84 168 L76 196 M112 170 L122 198" stroke="#E3B84A" strokeWidth={3.4} strokeLinecap="round" />
      <ProfileEye x={66} y={140} r={3} />
    </G>
  );
}

function ChameleonHatchling() {
  return (
    <G>
      <Ellipse cx="108" cy="156" rx="26" ry="12" fill="#3E9A62" {...edge('#1F5A38', 0.8)} />
      <Path d="M92 146 C84 124 98 112 112 122 C104 108 88 116 92 140 Z" fill="#4EAA70" {...edge('#1F5A38', 0.7)} />
      <Circle cx="118" cy="128" r="7" fill="#2E8B57" {...edge('#1F5A38', 0.6)} />
      <Path d="M132 158 C156 166 160 188 140 190 C154 176 148 164 132 162 Z" fill="#3E9A62" {...edge('#1F5A38', 0.6)} />
      <ProfileEye x={120} y={126} r={2.4} />
    </G>
  );
}

function VeiledChameleon() {
  return (
    <G>
      <Ellipse cx="108" cy="158" rx="30" ry="14" fill="#2E8B57" {...edge('#145232', 0.8)} />
      <Path d="M90 146 C78 100 108 72 124 108 C112 78 86 92 90 136 Z" fill="#3E9A62" {...edge('#145232', 0.8)} />
      <Path d="M108 96 C118 86 132 96 124 112" stroke="#E2C15A" strokeWidth={3} fill="none" />
      <Circle cx="128" cy="118" r="9" fill="#1F7A4D" {...edge('#145232', 0.6)} />
      <Path d="M136 162 C168 150 176 186 148 196 C170 176 160 156 140 164 Z" fill="#2E8B57" {...edge('#145232', 0.7)} />
      <Path d="M96 170 L88 194 M120 172 L128 196" stroke="#2E8B57" strokeWidth={3.2} strokeLinecap="round" />
      <ProfileEye x={130} y={116} r={3.2} />
    </G>
  );
}

function PythonHatchling() {
  return (
    <G>
      <Path
        d="M118 120 C146 118 154 146 136 160 C154 168 146 198 112 196 C78 194 70 166 92 154 C74 146 80 120 118 120 Z"
        fill="#C6A15A"
        {...edge('#6A5030', 0.8)}
      />
      <Path d="M108 136 C124 140 128 156 112 158" stroke="#3A2C18" strokeWidth={3} fill="none" />
      <Path d="M100 168 C116 172 118 184 104 184" stroke="#3A2C18" strokeWidth={2.4} fill="none" />
      <Circle cx="124" cy="128" r="8" fill="#D4B56A" {...edge('#6A5030', 0.6)} />
      <Path d="M130 126 L144 124 L130 134 Z" fill="#E7D3A4" />
      <ProfileEye x={122} y={126} r={2} />
    </G>
  );
}

function BallPython() {
  return (
    <G>
      <Path
        d="M124 96 C162 100 170 140 146 160 C172 172 158 210 112 208 C62 206 48 164 78 146 C52 132 70 92 124 96 Z"
        fill="#C6A15A"
        {...edge('#5A4020', 0.8)}
      />
      <Path d="M112 118 C136 126 140 148 116 152" stroke="#3A2C18" strokeWidth={4} fill="none" />
      <Path d="M96 168 C122 176 124 196 100 196" stroke="#3A2C18" strokeWidth={3.2} fill="none" />
      <Circle cx="136" cy="108" r="10" fill="#D4B56A" {...edge('#5A4020', 0.7)} />
      <Path d="M144 106 L164 102 L144 116 Z" fill="#E7D3A4" />
      <Circle cx="140" cy="112" r="1.4" fill="#3A2C18" />
      <ProfileEye x={132} y={106} r={2.2} />
    </G>
  );
}

function TurtleHatchling() {
  return (
    <G>
      <Ellipse cx="112" cy="156" rx="32" ry="20" fill="#3D6B62" {...edge('#1E3E38', 0.8)} />
      <Ellipse cx="112" cy="156" rx="16" ry="10" fill="none" stroke="#1E3E38" strokeWidth={1.2} />
      <Path d="M96 150 H128 M104 160 H120" stroke="#1E3E38" strokeWidth={1} />
      <Ellipse cx="74" cy="148" rx="10" ry="7" fill="#4A7A70" {...edge('#1E3E38', 0.6)} />
      <Path d="M86 168 C64 186 78 198 96 184" stroke="#3D6B62" strokeWidth={7} strokeLinecap="round" fill="none" />
      <Path d="M136 168 C160 186 148 198 128 184" stroke="#3D6B62" strokeWidth={7} strokeLinecap="round" fill="none" />
      <ProfileEye x={72} y={146} r={2} />
    </G>
  );
}

function GreenTurtle() {
  return (
    <G>
      <Ellipse cx="116" cy="156" rx="42" ry="26" fill="#2F6F66" {...edge('#163E38', 0.8)} />
      <Path d="M88 146 H146 M96 156 H138 M104 166 H132" stroke="#163E38" strokeWidth={1.2} />
      <Path d="M100 140 V172 M124 138 V174" stroke="#163E38" strokeWidth={1.1} />
      <Ellipse cx="64" cy="146" rx="12" ry="8" fill="#3D8F86" {...edge('#163E38', 0.7)} />
      <Path d="M78 160 C40 186 58 208 92 186" stroke="#2F6F66" strokeWidth={10} strokeLinecap="round" fill="none" />
      <Path d="M148 160 C186 184 170 208 140 186" stroke="#2F6F66" strokeWidth={10} strokeLinecap="round" fill="none" />
      <Path d="M58 148 L42 146 L56 154 Z" fill="#C9A36A" />
      <ProfileEye x={62} y={144} r={2.2} />
    </G>
  );
}

function CrocHatchling() {
  return (
    <G>
      <Ellipse cx="108" cy="156" rx="28" ry="12" fill="#5C6B48" {...edge('#2A3824', 0.8)} />
      <Path d="M82 150 L36 144 L34 154 L82 158 Z" fill="#6A7A54" {...edge('#2A3824', 0.7)} />
      <Path d="M42 148 L46 152 M52 146 L56 152 M62 146 L66 152" stroke="#F4EDE3" strokeWidth={1} />
      <Path d="M134 158 C158 166 164 188 146 192" stroke="#5C6B48" strokeWidth={8} strokeLinecap="round" fill="none" />
      <Path d="M96 166 L92 186 M112 168 L114 188" stroke="#5C6B48" strokeWidth={3} strokeLinecap="round" />
      <ProfileEye x={52} y={148} r={2} />
    </G>
  );
}

function SaltwaterCrocodile() {
  return (
    <G>
      <Ellipse cx="112" cy="154" rx="36" ry="16" fill="#3E5C48" {...edge('#1A2C22', 0.8)} />
      <Path d="M84 146 L18 136 L14 150 L84 158 Z" fill="#4E6C54" {...edge('#1A2C22', 0.8)} />
      <Path d="M28 142 L34 150 M42 140 L48 150 M56 140 L62 150 M70 142 L74 150" stroke="#F4EDE3" strokeWidth={1.3} />
      <Path d="M140 158 C176 170 184 198 156 204" stroke="#3E5C48" strokeWidth={12} strokeLinecap="round" fill="none" />
      <Path d="M96 168 L88 196 M118 170 L122 198 M140 168 L150 192" stroke="#3E5C48" strokeWidth={4} strokeLinecap="round" />
      <Path d="M70 138 L78 130 L88 140 L98 128 L108 140" fill="#2A4034" />
      <ProfileEye x={40} y={142} r={2.2} />
    </G>
  );
}

function PlatypusNestling() {
  return (
    <G>
      <Ellipse cx="112" cy="160" rx="28" ry="16" fill="#8A7460" {...edge('#5C4638', 0.8)} />
      <Ellipse cx="78" cy="154" rx="16" ry="7" fill="#C4A574" {...edge('#8A6840', 0.7)} />
      <Path d="M136 156 L160 150 L162 168 L136 166 Z" fill="#6A5848" {...edge('#3E3228', 0.6)} />
      <Path d="M100 174 L96 196 M124 176 L130 198" stroke="#8A7460" strokeWidth={3.4} strokeLinecap="round" />
      <ProfileEye x={92} y={152} r={2} />
    </G>
  );
}

function Platypus() {
  return (
    <G>
      <Ellipse cx="112" cy="158" rx="36" ry="18" fill="#6A5848" {...edge('#3E3228', 0.8)} />
      <Ellipse cx="64" cy="150" rx="22" ry="8" fill="#C4A574" {...edge('#8A6840', 0.8)} />
      <Path d="M70 146 C78 140 90 146 84 154" stroke="#8A6840" strokeWidth={1} fill="none" />
      <Path d="M142 152 L184 142 L188 170 L142 166 Z" fill="#4A3C32" {...edge('#2A221C', 0.7)} />
      <Path d="M96 174 C80 196 96 204 104 186" stroke="#5C4A3C" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M124 176 C140 198 124 206 116 188" stroke="#5C4A3C" strokeWidth={5} strokeLinecap="round" fill="none" />
      <ProfileEye x={86} y={150} r={2.2} />
    </G>
  );
}
