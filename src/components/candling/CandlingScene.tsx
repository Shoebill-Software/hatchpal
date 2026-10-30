import {
  Blur,
  BlurMask,
  Circle,
  Fill,
  Group,
  Oval,
  Paint,
  Path,
  RadialGradient,
  Shader,
  Skia,
  type AnimatedProp,
  type Transforms3d,
} from '@shopify/react-native-skia';

import type { CandlingShellPalette, EggLayout, VesselTree } from '@/components/candlingGeometry';
import type { CandlingAnatomy, CandlingMark } from '@/components/candling/candlingAnatomy';
import { clamp01, type CandlingStageDescriptor } from '@/components/candling/candlingStages';

const CHAMBER = '#070504';
const SPILL = '#FF9440';
const VESSEL = '#86140A';
const VESSEL_HALO = '#D2502C';
const HEART = '#5C0604';
const TISSUE = '#B4481E';
const MEMBRANE = '#7A3816';
const MEMBRANE_SHADOW = '#D08048';
const SHELL_EDGE = '#5E2410';
const PALE = '#FFF4DC';
const CLEAR = 'rgba(255, 255, 255, 0)';

type Rgb = readonly [number, number, number];

/** Light through a clean white shell before the contents absorb any of it. */
const HOT: Rgb = [1, 0.96, 0.86];
const AMBER: Rgb = [1, 0.78, 0.5];
const LIMB: Rgb = [0.62, 0.34, 0.2];

/**
 * Lamp light transmitted by the shell: a broad glow that darkens toward the
 * silhouette, uneven calcium, pigment blotches, and pores that let light through.
 */
const BACKLIGHT = Skia.RuntimeEffect.Make(`
uniform float2 center;
uniform float2 radii;
uniform float3 hot;
uniform float3 amber;
uniform float3 limb;
uniform float3 pigment;
uniform float pigmentAmount;
uniform float pigmentScale;
uniform float blotch;
uniform float pores;
uniform float mottle;
uniform float seed;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  return noise(p) * 0.55 + noise(p * 2.03 + 7.1) * 0.3 + noise(p * 4.07 + 3.3) * 0.15;
}

float spots(float2 p, float density, float size) {
  float2 i = floor(p);
  float2 f = fract(p);
  float best = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float2 g = float2(float(x), float(y));
      float2 cell = i + g;
      float2 o = float2(hash(cell + 17.3), hash(cell + 41.7));
      float r = size * (0.35 + 0.65 * hash(cell + 73.1));
      float d = length(g + o - f);
      float s = (1.0 - smoothstep(r * 0.4, r, d)) * step(hash(cell), density);
      best = max(best, s * (0.55 + 0.45 * hash(cell + 91.9)));
    }
  }
  return best;
}

half4 main(float2 p) {
  float2 q = (p - center) / radii;
  float e = length(q);
  float z = sqrt(max(0.0, 1.0 - min(e * e, 1.0)));
  float3 c = mix(amber, hot, clamp(1.0 - e * e * 0.9, 0.0, 1.0));
  c *= mix(float3(1.0), limb, smoothstep(0.7, 1.02, e));

  float2 t = (p - center) / radii.x / (0.45 + 0.55 * z) + seed;
  float grain = noise(t * 24.0) * 0.6 + noise(t * 61.0) * 0.4;
  float blotch = fbm(t * 3.1);
  c *= 1.0 + (blotch - 0.5) * mottle * 2.2 + (grain - 0.5) * mottle;

  float2 w = t + (float2(noise(t * 2.3), noise(t * 2.3 + 9.2)) - 0.5) * 0.3;
  float flecks = spots(w * pigmentScale, 0.62, 0.62);
  float patches = smoothstep(0.5, 0.76, fbm(w * pigmentScale)) * (0.55 + 0.45 * noise(w * pigmentScale * 5.0));
  float stain = mix(flecks, patches, blotch) * pigmentAmount;
  c = mix(c, c * pigment, stain);
  float pore = spots(t * 34.0, 0.42, 0.22) * pores;
  c = mix(c, max(c, hot), pore * 0.75);
  return half4(half3(c), 1.0);
}
`);

export interface CandlingMotion {
  yolk: AnimatedProp<Transforms3d>;
  embryo: AnimatedProp<Transforms3d>;
  breath: AnimatedProp<Transforms3d>;
  heartCore: AnimatedProp<number>;
  heartGlow: AnimatedProp<number>;
}

export interface CandlingBackdropProps {
  layout: EggLayout;
  anatomy: CandlingAnatomy;
  palette: CandlingShellPalette;
}

export interface CandlingSubjectProps extends CandlingBackdropProps {
  stage: CandlingStageDescriptor;
  crack: { cracks: string; hole: string | null } | null;
  motion: CandlingMotion;
}

/**
 * The egg as a backlit absorber stack. The shell glow is drawn once, then
 * albumen, yolk, blood and body multiply it down, so every layer reads the
 * way it would on a real candler and late eggs keep a glowing, veined rim.
 */
export function CandlingScene(props: CandlingSubjectProps) {
  return (
    <Group>
      <CandlingBackdrop layout={props.layout} anatomy={props.anatomy} palette={props.palette} />
      <CandlingSubject {...props} />
    </Group>
  );
}

/**
 * Everything that holds still: lamp spill, the transmitted shell glow and the
 * vessel fields. Multiply blending commutes, so this can be baked into a
 * texture and the moving absorbers stacked on top without changing the image.
 */
export function CandlingBackdrop({ layout, anatomy, palette }: CandlingBackdropProps) {
  const { cx, cy, rx, ry } = layout;
  const unit = Math.max(rx, 1);
  const tint = shellTint(palette.body);
  const hot = multiply(HOT, tint);
  const amber = multiply(AMBER, tint);
  const vesselWidth = Math.max(0.7, unit * 0.0085);
  const airCenter = { x: cx, y: cy - ry + anatomy.airCell.depth * 0.55 };

  return (
    <Group>
      <Fill color={CHAMBER} />

      <Oval x={cx - rx * 1.9} y={cy - ry * 1.55} width={rx * 3.8} height={ry * 3.1}>
        <RadialGradient
          c={{ x: cx, y: cy }}
          r={rx * 1.9}
          transform={[{ scaleY: (ry * 1.55) / (rx * 1.9) }]}
          origin={{ x: cx, y: cy }}
          colors={['rgba(255, 140, 60, 0.2)', 'rgba(255, 110, 40, 0.07)', 'rgba(255, 110, 40, 0)']}
          positions={[0.3, 0.62, 1]}
        />
      </Oval>
      <Path path={layout.path} color={SPILL} opacity={0.42}>
        <BlurMask blur={unit * 0.14} style="outer" />
      </Path>

      <Group clip={layout.path}>
        <Fill>
          {BACKLIGHT ? (
            <Shader
              source={BACKLIGHT}
              uniforms={{
                center: [cx, cy],
                radii: [rx, ry],
                hot: [...hot],
                amber: [...amber],
                limb: [...LIMB],
                pigment: [...mix([1, 1, 1], rgbOf(palette.speckle), 0.9)],
                pigmentAmount: anatomy.shell.pigment,
                pigmentScale: anatomy.shell.pigmentScale,
                blotch: anatomy.shell.blotch,
                pores: anatomy.shell.pores,
                mottle: anatomy.shell.mottle,
                seed: anatomy.shell.seed,
              }}
            />
          ) : (
            <RadialGradient c={{ x: cx, y: cy }} r={ry} colors={[hexOf(hot), hexOf(amber), '#7A2A10']} />
          )}
        </Fill>

        <Group clip={anatomy.airCell.fill} blendMode="screen">
          <Oval
            x={cx - rx * 0.9}
            y={cy - ry - anatomy.airCell.depth * 0.2}
            width={rx * 1.8}
            height={anatomy.airCell.depth * 1.5}>
            <RadialGradient
              c={airCenter}
              r={rx * 0.9}
              transform={[{ scaleY: (anatomy.airCell.depth * 0.75) / (rx * 0.9) }]}
              origin={airCenter}
              colors={['rgba(255, 246, 222, 0.42)', 'rgba(255, 236, 200, 0.16)', 'rgba(255, 236, 200, 0)']}
              positions={[0, 0.55, 1]}
            />
          </Oval>
        </Group>

        {anatomy.allantois ? (
          <Circle
            cx={anatomy.allantois.cx}
            cy={anatomy.allantois.cy}
            r={anatomy.allantois.r}
            blendMode="multiply"
            opacity={anatomy.allantois.opacity}>
            <RadialGradient
              c={{ x: anatomy.allantois.cx, y: anatomy.allantois.cy }}
              r={anatomy.allantois.r}
              colors={['rgba(236, 118, 80, 0.55)', 'rgba(226, 98, 62, 0.4)', 'rgba(226, 98, 62, 0)']}
              positions={[0, 0.6, 1]}
            />
          </Circle>
        ) : null}

        {anatomy.membraneVessels ? (
          <Group clip={anatomy.airCell.contents}>
            <VesselField
              tree={anatomy.membraneVessels}
              width={vesselWidth * 0.62}
              opacity={anatomy.membraneVessels.opacity * 0.85}
              ring={false}
            />
          </Group>
        ) : null}

        {anatomy.vessels.opacity > 0.02 ? (
          <VesselField tree={anatomy.vessels} width={vesselWidth} opacity={anatomy.vessels.opacity} ring />
        ) : null}

        <Path
          path={layout.path}
          style="stroke"
          strokeWidth={unit * 0.05}
          color={SHELL_EDGE}
          blendMode="multiply"
          opacity={0.6}>
          <BlurMask blur={unit * 0.02} style="normal" />
        </Path>
      </Group>
    </Group>
  );
}

/** The parts that drift, breathe and beat. Drawn every frame over the backdrop. */
export function CandlingSubject({ layout, anatomy, stage, palette, crack, motion }: CandlingSubjectProps) {
  const { cx, cy, rx, ry } = layout;
  const unit = Math.max(rx, 1);
  const lamp = { x: cx, y: cy + ry * 0.1 };
  const interior = rgbOf(palette.interior);
  const yolkTone = rgbOf(palette.yolk);
  const growth = clamp01(stage.embryo);
  const crowding = clamp01(stage.crowding);
  const bodyOpacity = Math.min(0.97, 0.62 + growth * 0.5);
  const bodyTone = hexOf(mix(mix(interior, [0.16, 0.04, 0.02], 0.6), [0, 0, 0], 0.45));
  const crowdDeep = hexOf(mix(interior, [0.42, 0.12, 0.05], 0.5));
  const crowdMid = hexOf(mix([0.8, 0.36, 0.18], interior, 0.2));
  const crowdCenter = { x: anatomy.mass.cx, y: anatomy.mass.cy };
  const crowdCore = 0.22 + crowding * 0.42;

  return (
    <Group clip={layout.path}>
      <Group transform={motion.breath}>
        <Path path={anatomy.airCell.contents} blendMode="multiply">
          <RadialGradient
            c={lamp}
            r={ry * 1.02}
            transform={[{ scaleX: rx / ry }]}
            origin={lamp}
            colors={['#FFF0D2', '#FFC074', '#E4782E', '#9E3612']}
            positions={[0, 0.4, 0.76, 1]}
          />
        </Path>
      </Group>

      <Group transform={motion.yolk} opacity={stage.yolk}>
        <Oval
          x={anatomy.yolk.x}
          y={anatomy.yolk.y}
          width={anatomy.yolk.width}
          height={anatomy.yolk.height}
          blendMode="multiply">
          <RadialGradient
            c={{ x: anatomy.yolk.cx, y: anatomy.yolk.cy }}
            r={anatomy.yolk.width / 2}
            transform={[{ scaleY: anatomy.yolk.height / Math.max(anatomy.yolk.width, 1) }]}
            origin={{ x: anatomy.yolk.cx, y: anatomy.yolk.cy }}
            colors={[
              hexOf(mix([1, 1, 1], yolkTone, 0.42)),
              hexOf(mix([1, 1, 1], yolkTone, 0.55)),
              hexOf(mix([1, 1, 1], yolkTone, 0.72)),
              CLEAR,
            ]}
            positions={[0, 0.62, 0.86, 1]}
          />
        </Oval>
        {anatomy.germinalDisc ? (
          <Group opacity={anatomy.germinalDisc.opacity} blendMode="screen">
            <Circle
              cx={anatomy.germinalDisc.cx}
              cy={anatomy.germinalDisc.cy}
              r={anatomy.germinalDisc.r * 1.6}
              color={PALE}
              opacity={0.22}>
              <BlurMask blur={anatomy.germinalDisc.r * 0.6} style="normal" />
            </Circle>
            <Circle
              cx={anatomy.germinalDisc.cx}
              cy={anatomy.germinalDisc.cy}
              r={anatomy.germinalDisc.r}
              style="stroke"
              strokeWidth={1.2}
              color={PALE}
              opacity={0.45}
            />
            <Circle
              cx={anatomy.germinalDisc.cx}
              cy={anatomy.germinalDisc.cy}
              r={anatomy.germinalDisc.r * 0.3}
              color={PALE}
              opacity={0.6}
            />
          </Group>
        ) : null}
      </Group>

      {anatomy.chalazae ? (
        <Path
          path={anatomy.chalazae.path}
          style="stroke"
          strokeWidth={1.4}
          strokeCap="round"
          color={PALE}
          blendMode="screen"
          opacity={0.16 * anatomy.chalazae.opacity}>
          <BlurMask blur={1.4} style="normal" />
        </Path>
      ) : null}

      {crowding > 0.02 ? (
        <Group transform={motion.breath}>
          <Path
            path={anatomy.airCell.contents}
            blendMode="multiply"
            color={hexOf(mix([1, 1, 1], [0.82, 0.46, 0.3], crowding * 0.5))}
          />
          <Path path={anatomy.airCell.contents} blendMode="multiply" opacity={Math.min(1, 0.35 + crowding)}>
            <RadialGradient
              c={crowdCenter}
              r={ry * (0.86 + crowding * 0.24)}
              transform={[{ scaleX: rx / ry }]}
              origin={crowdCenter}
              colors={[crowdDeep, crowdDeep, crowdMid, CLEAR]}
              positions={[0, crowdCore, Math.min(0.97, crowdCore + 0.3), 1]}
            />
          </Path>
        </Group>
      ) : null}

      <Group transform={motion.embryo}>
        <Group
          layer={
            <Paint blendMode="multiply" opacity={Math.min(0.85, 0.35 + growth * 0.6)}>
              <Blur blur={unit * (0.035 + crowding * 0.05)} />
            </Paint>
          }>
          <EmbryoMass anatomy={anatomy} color={TISSUE} />
        </Group>
        <Group
          layer={
            <Paint blendMode="multiply" opacity={bodyOpacity}>
              <Blur blur={Math.max(0.8, unit * 0.011)} />
            </Paint>
          }>
          <EmbryoMass anatomy={anatomy} color={bodyTone} />
          {anatomy.beak ? <Path path={anatomy.beak} color={bodyTone} /> : null}
          {anatomy.eye ? (
            <Group>
              <Circle cx={anatomy.eye.cx} cy={anatomy.eye.cy} r={anatomy.eye.r} color="#080201" />
              <Circle
                cx={anatomy.eye.cx}
                cy={anatomy.eye.cy}
                r={anatomy.eye.r * 1.45}
                style="stroke"
                strokeWidth={Math.max(0.8, anatomy.eye.r * 0.28)}
                color="#000000"
                opacity={0.45}
              />
            </Group>
          ) : null}
          {anatomy.scutes ? (
            <Path
              path={anatomy.scutes}
              style="stroke"
              strokeWidth={1.25}
              strokeCap="round"
              color="#8A5A3A"
              opacity={0.55}
            />
          ) : null}
        </Group>

        {anatomy.heart ? (
          <Group blendMode="multiply">
            <Circle cx={anatomy.heart.cx} cy={anatomy.heart.cy} r={motion.heartGlow} color={VESSEL_HALO} opacity={0.6}>
              <BlurMask blur={anatomy.heart.r * 0.9} style="normal" />
            </Circle>
            <Circle cx={anatomy.heart.cx} cy={anatomy.heart.cy} r={motion.heartCore} color={HEART}>
              <BlurMask blur={anatomy.heart.r * 0.22} style="normal" />
            </Circle>
          </Group>
        ) : null}
      </Group>

      <Group transform={motion.breath}>
        <Group transform={[{ translateY: unit * 0.022 }]}>
          <Path
            path={anatomy.airCell.membrane}
            style="stroke"
            strokeWidth={unit * (0.05 + stage.airCell * 0.05)}
            strokeCap="round"
            color={MEMBRANE_SHADOW}
            blendMode="multiply"
            opacity={0.5}>
            <BlurMask blur={unit * 0.025} style="normal" />
          </Path>
        </Group>
        <Path
          path={anatomy.airCell.membrane}
          style="stroke"
          strokeWidth={1 + stage.airCell * 1.8}
          strokeCap="round"
          color={MEMBRANE}
          blendMode="multiply"
          opacity={0.55 + stage.airCell * 0.4}>
          <BlurMask blur={0.6} style="normal" />
        </Path>
      </Group>

      {crack ? (
        <Group blendMode="screen">
          <Path
            path={crack.cracks}
            style="stroke"
            strokeWidth={unit * 0.022}
            strokeCap="round"
            strokeJoin="round"
            color="#FF9C48"
            opacity={0.35}>
            <BlurMask blur={unit * 0.014} style="normal" />
          </Path>
          <Path
            path={crack.cracks}
            style="stroke"
            strokeWidth={Math.max(0.8, unit * 0.0055)}
            strokeCap="round"
            strokeJoin="round"
            color="#FFD9A0"
            opacity={0.9}
          />
          {crack.hole ? (
            <Group>
              <Path path={crack.hole} color="#FFB060" opacity={0.45}>
                <BlurMask blur={unit * 0.035} style="normal" />
              </Path>
              <Path path={crack.hole} color="#FFEBC8" />
            </Group>
          ) : null}
        </Group>
      ) : null}
    </Group>
  );
}

function VesselField({
  tree,
  width,
  opacity,
  ring,
}: {
  tree: VesselTree;
  width: number;
  opacity: number;
  ring: boolean;
}) {
  const calibre = (level: number) => width * Math.max(0.55, 2.2 * Math.pow(0.68, level));
  return (
    <Group>
      <Group
        layer={
          <Paint blendMode="multiply" opacity={opacity * 0.55}>
            <Blur blur={width * 2.4} />
          </Paint>
        }>
        {tree.levels.map((path, level) => (
          <Path
            key={`halo-${level}`}
            path={path}
            style="stroke"
            strokeWidth={calibre(level) * 2.6}
            strokeCap="round"
            strokeJoin="round"
            color={VESSEL_HALO}
          />
        ))}
      </Group>
      <Group
        layer={
          <Paint blendMode="multiply" opacity={opacity}>
            <Blur blur={0.45} />
          </Paint>
        }>
        {ring ? (
          <Path path={tree.terminalis} style="stroke" strokeWidth={width * 1.3} color={VESSEL} opacity={0.42} />
        ) : null}
        {tree.levels.map((path, level) => (
          <Path
            key={`core-${level}`}
            path={path}
            style="stroke"
            strokeWidth={calibre(level)}
            strokeCap="round"
            strokeJoin="round"
            color={VESSEL}
          />
        ))}
      </Group>
    </Group>
  );
}

function EmbryoMass({ anatomy, color }: { anatomy: CandlingAnatomy; color: string }) {
  return (
    <Group>
      {anatomy.carapace ? (
        <Oval
          x={anatomy.carapace.x}
          y={anatomy.carapace.y}
          width={anatomy.carapace.width}
          height={anatomy.carapace.height}
          color={color}
          opacity={0.6}
        />
      ) : null}
      <Mark mark={anatomy.body} color={color} />
      {anatomy.head ? <Circle cx={anatomy.head.cx} cy={anatomy.head.cy} r={anatomy.head.r} color={color} /> : null}
      {anatomy.limbs.map((path, index) => (
        <Path key={`limb-${index}`} path={path} color={color} />
      ))}
      {anatomy.crest ? <Path path={anatomy.crest} color={color} /> : null}
      {anatomy.leg ? <Mark mark={anatomy.leg} color={color} /> : null}
      {anatomy.tail ? <Mark mark={anatomy.tail} color={color} /> : null}
    </Group>
  );
}

function Mark({ mark, color }: { mark: CandlingMark; color: string }) {
  if (mark.strokeWidth != null) {
    return (
      <Path
        path={mark.path}
        style="stroke"
        strokeWidth={mark.strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    );
  }
  return <Path path={mark.path} color={color} />;
}

/** Brown and blue shells colour the light that reaches the contents; dark shells pass less of it. */
function shellTint(body: string): Rgb {
  const [r, g, b] = rgbOf(body);
  const peak = Math.max(r, g, b, 0.001);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const hue = mix([1, 1, 1], [r / peak, g / peak, b / peak], 0.55);
  const gain = 0.74 + 0.26 * Math.min(1, luminance / 0.75);
  return [hue[0] * gain, hue[1] * gain, hue[2] * gain];
}

function rgbOf(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/(.)/g, '$1$1') : value.slice(0, 6);
  const parsed = Number.parseInt(full, 16);
  if (!Number.isFinite(parsed)) {
    return [1, 1, 1];
  }
  return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255];
}

function hexOf(color: Rgb): string {
  return `#${color
    .map((channel) =>
      Math.round(clamp01(channel) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function multiply(a: Rgb, b: Rgb): Rgb {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}
