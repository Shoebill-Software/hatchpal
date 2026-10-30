import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { TutorialAnchor } from '@/components/tutorial/TutorialAnchor';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import { NEST_ANCHOR } from '@/constants/tutorial';
import {
  HUMIDITY_TOLERANCE_PCT,
  requiresMoistureCare,
  TEMPERATURE_TOLERANCE_CELSIUS,
  type ClimateReading,
  type HumidityStatus,
  type TemperatureStatus,
} from '@/domain/climateEngine';
import {
  BROOD_PERFECT_CELSIUS,
  broodCeiling,
  broodStep,
  mistPerfectBand,
  prefersDryNest,
} from '@/domain/nestCare';
import type { SpeciesConfig } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';
import { ImpactFeedbackStyle, triggerImpact, triggerSelection } from '@/services/hapticFeedback';

const TEMPERATURE_STATUS_KEY: Record<TemperatureStatus, TranslationKey> = {
  optimal: 'climate.optimal',
  too_cold: 'climate.tooCold',
  too_warm: 'climate.tooWarm',
};

const HUMIDITY_STATUS_KEY: Record<HumidityStatus, TranslationKey> = {
  optimal: 'climate.optimal',
  dry: 'climate.dry',
  humid: 'climate.humid',
};

const SWEET = '#3EAD78';
const ATTENTION = '#E2B15C';
const EMBER = '#F2A33A';
const DEW = '#6FB3D2';

/** Dial span below and above the target. The top end is the brood ceiling. */
const TEMPERATURE_BELOW = 5;
const HUMIDITY_BELOW = 20;
const HUMIDITY_ABOVE = 12;
/** A press shorter than this reads as a tap, which shows the hold hint instead of brooding. */
const MIN_BROOD_MS = 220;
const TICK_CELSIUS = 0.2;
const TICK_MIN_GAP_MS = 45;
const SOAK_MS = 900;

const DIAL = 72;
const DIAL_CENTER = DIAL / 2;
const DIAL_RADIUS = 31;
const DIAL_START_DEG = 150;
const DIAL_SWEEP_DEG = 240;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type CareNoticeTone = 'great' | 'good' | 'warn' | 'info';

export type CareNotice = { id: number; text: string; tone: CareNoticeTone };

export interface ClimateControlsProps {
  species: SpeciesConfig;
  climate: ClimateReading;
  /** Replaces the climate aside while it is showing. */
  notice: CareNotice | null;
  /** True while spritzes are still soaking in. */
  soaking: boolean;
  onBroodStart: () => void;
  onBroodEnd: (startCelsius: number, endCelsius: number) => void;
  /** A press too short to brood. The parent should stop anything it started. */
  onBroodTooShort: () => void;
  onSpritz: () => void;
}

export function describeClimate(
  climate: ClimateReading,
  species: SpeciesConfig,
  t: TranslateFn
): string | null {
  const temp = species.temperatureTargetCelsius.toFixed(1);
  const humidity = String(Math.round(species.humidityTargetPct));
  const moistureMatters = requiresMoistureCare(species);
  if (climate.temper === 'on_strike') {
    return moistureMatters
      ? t('climate.strike', { temp, humidity })
      : t('climate.strikeDry', { temp });
  }
  if (climate.temper === 'fussy') {
    return t('climate.fussy');
  }
  if (climate.temper === 'chilly') {
    return moistureMatters
      ? t(climate.temperatureStatus === 'too_warm' ? 'climate.flushed' : 'climate.chilly', { temp })
      : t('climate.dryChilly', { temp });
  }
  if (climate.temper === 'parched') {
    return t(climate.humidityStatus === 'humid' ? 'climate.soggy' : 'climate.parched', { humidity });
  }
  if (climate.inSweetSpot) {
    return null;
  }
  const warmthOff = climate.temperatureStatus !== 'optimal';
  const moistureOff = climate.humidityStatus !== 'optimal';
  if (warmthOff && moistureOff) {
    return t('climate.driftBoth', { temp, humidity });
  }
  if (warmthOff) {
    return t('climate.driftWarmth', { temp });
  }
  return t('climate.driftMoisture', { humidity });
}

type DialScale = { min: number; max: number };

function temperatureScale(species: SpeciesConfig): DialScale {
  return { min: species.temperatureTargetCelsius - TEMPERATURE_BELOW, max: broodCeiling(species) };
}

function humidityScale(species: SpeciesConfig): DialScale {
  return {
    min: Math.max(0, species.humidityTargetPct - HUMIDITY_BELOW),
    max: Math.min(100, species.humidityTargetPct + HUMIDITY_ABOVE),
  };
}

function toUnit(value: number, scale: DialScale): number {
  if (!Number.isFinite(value) || scale.max <= scale.min) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, (value - scale.min) / (scale.max - scale.min)));
}

type BroodHold = {
  start: number;
  current: number;
  pressedAt: number;
  lastFrame: number;
  lastTick: number;
  inPerfect: boolean;
  frame: number | null;
};

export function ClimateControls({
  species,
  climate,
  notice,
  soaking,
  onBroodStart,
  onBroodEnd,
  onBroodTooShort,
  onSpritz,
}: ClimateControlsProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const target = species.temperatureTargetCelsius;
  const tempScale = temperatureScale(species);
  const mistScale = humidityScale(species);

  const [liveCelsius, setLiveCelsius] = useState<number | null>(null);
  const hold = useRef<BroodHold | null>(null);
  const climateRef = useRef(climate);
  climateRef.current = climate;
  const tempUnit = useSharedValue(toUnit(climate.temperatureCelsius, tempScale));
  const mistUnit = useSharedValue(toUnit(climate.humidityPct, mistScale));
  const shownHumidity = useSoakedValue(climate.humidityPct, reduceMotion ? 0 : SOAK_MS);

  const brooding = liveCelsius != null;
  const shownCelsius = liveCelsius ?? climate.temperatureCelsius;

  useEffect(() => {
    if (hold.current) {
      return;
    }
    tempUnit.value = withTiming(toUnit(climate.temperatureCelsius, tempScale), { duration: 380 });
  }, [brooding, climate.temperatureCelsius, tempScale.max, tempScale.min, tempUnit]);

  useEffect(() => {
    mistUnit.value = withTiming(toUnit(climate.humidityPct, mistScale), {
      duration: reduceMotion ? 0 : SOAK_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [climate.humidityPct, mistScale.max, mistScale.min, mistUnit, reduceMotion]);

  const stopFrames = useCallback(() => {
    const current = hold.current;
    if (current?.frame != null) {
      cancelAnimationFrame(current.frame);
    }
  }, []);

  useEffect(() => stopFrames, [stopFrames]);

  useEffect(() => {
    setLiveCelsius(null);
    return () => {
      stopFrames();
      hold.current = null;
    };
  }, [species.id, stopFrames]);

  const tick = useCallback(
    (now: number) => {
      const current = hold.current;
      if (!current) {
        return;
      }
      const next = broodStep(current.current, species, now - current.pressedAt, now - current.lastFrame);
      current.lastFrame = now;
      if (
        Math.floor(next / TICK_CELSIUS) !== Math.floor(current.current / TICK_CELSIUS) &&
        now - current.lastTick >= TICK_MIN_GAP_MS
      ) {
        current.lastTick = now;
        void triggerSelection();
      }
      const inPerfect = Math.abs(next - target) <= BROOD_PERFECT_CELSIUS;
      if (inPerfect && !current.inPerfect) {
        void triggerImpact(ImpactFeedbackStyle.Medium);
      }
      current.inPerfect = inPerfect;
      current.current = next;
      tempUnit.value = toUnit(next, tempScale);
      setLiveCelsius((shown) => (shown != null && Math.abs(shown - next) < 0.05 ? shown : next));
      current.frame = requestAnimationFrame(tick);
    },
    [species, target, tempScale, tempUnit]
  );

  const beginBrood = () => {
    stopFrames();
    const now = Date.now();
    const start = climateRef.current.temperatureCelsius;
    hold.current = {
      start,
      current: start,
      pressedAt: now,
      lastFrame: now,
      lastTick: now,
      inPerfect: Math.abs(start - target) <= BROOD_PERFECT_CELSIUS,
      frame: null,
    };
    setLiveCelsius(start);
    void triggerImpact(ImpactFeedbackStyle.Light);
    onBroodStart();
    hold.current.frame = requestAnimationFrame(() => tick(Date.now()));
  };

  const endBrood = () => {
    const current = hold.current;
    if (!current) {
      return;
    }
    stopFrames();
    hold.current = null;
    setLiveCelsius(null);
    if (Date.now() - current.pressedAt < MIN_BROOD_MS) {
      onBroodTooShort();
      return;
    }
    onBroodEnd(current.start, current.current);
  };

  const warmthSweet = Math.abs(shownCelsius - target) <= TEMPERATURE_TOLERANCE_CELSIUS;
  const mistSweet = climate.humidityStatus === 'optimal';
  const dryNest = prefersDryNest(species);
  const perfectMist = mistPerfectBand(species);
  const humidityTarget = species.humidityTargetPct;
  const aside = describeClimate(climate, species, t);
  const line = notice?.text ?? aside;
  const lineColor = notice
    ? noticeColor(notice.tone, palette)
    : climate.temper === 'content'
      ? palette.textMuted
      : palette.warning;

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <TutorialAnchor targetId={NEST_ANCHOR.warmControl} style={styles.anchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('climate.a11y.temperature', {
              value: shownCelsius.toFixed(1),
              status: t(TEMPERATURE_STATUS_KEY[climate.temperatureStatus]),
              target: target.toFixed(1),
            })}
            accessibilityHint={t('care.holdToBrood')}
            accessibilityActions={[{ name: 'activate', label: t('care.broodAction') }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'activate') {
                onBroodEnd(climateRef.current.temperatureCelsius, target);
              }
            }}
            onPressIn={beginBrood}
            onPressOut={endBrood}
            style={({ pressed }) => [styles.control, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <CareDial
              unit={tempUnit}
              band={[
                toUnit(target - TEMPERATURE_TOLERANCE_CELSIUS, tempScale),
                toUnit(target + TEMPERATURE_TOLERANCE_CELSIUS, tempScale),
              ]}
              perfect={[
                toUnit(target - BROOD_PERFECT_CELSIUS, tempScale),
                toUnit(target + BROOD_PERFECT_CELSIUS, tempScale),
              ]}
              tint={EMBER}
              sweet={warmthSweet}
              active={brooding}>
              <SunGlyph color={brooding ? EMBER : palette.text} />
            </CareDial>
            <Readout
              sweet={warmthSweet}
              value={`${shownCelsius.toFixed(1)}°C`}
              color={brooding ? palette.text : palette.textMuted}
            />
            <Caption text={brooding ? t('care.releaseInGreen') : t('care.holdToBrood')} highlight={brooding} />
          </Pressable>
        </TutorialAnchor>

        <TutorialAnchor targetId={NEST_ANCHOR.mistControl} style={styles.anchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: dryNest }}
            accessibilityLabel={t('climate.a11y.humidity', {
              value: String(Math.round(climate.humidityPct)),
              status: t(HUMIDITY_STATUS_KEY[climate.humidityStatus]),
              target: String(Math.round(humidityTarget)),
            })}
            accessibilityHint={dryNest ? t('care.prefersDry') : t('care.tapToSpritz')}
            disabled={dryNest}
            onPress={dryNest ? undefined : onSpritz}
            style={({ pressed }) => [
              styles.control,
              dryNest ? styles.controlDisabled : null,
              { transform: [{ scale: !dryNest && pressed ? 0.93 : 1 }] },
            ]}>
            <CareDial
              unit={mistUnit}
              band={[
                toUnit(humidityTarget - HUMIDITY_TOLERANCE_PCT, mistScale),
                toUnit(humidityTarget + HUMIDITY_TOLERANCE_PCT, mistScale),
              ]}
              perfect={[toUnit(humidityTarget - perfectMist, mistScale), toUnit(humidityTarget + perfectMist, mistScale)]}
              tint={DEW}
              sweet={mistSweet}
              active={soaking}>
              <DropGlyph color={soaking ? DEW : palette.text} />
            </CareDial>
            <Readout sweet={mistSweet} value={`${Math.round(shownHumidity)}%`} color={palette.textMuted} />
            <Caption
              text={soaking ? t('care.soaking') : dryNest ? t('care.prefersDry') : t('care.tapToSpritz')}
              highlight={soaking}
            />
          </Pressable>
        </TutorialAnchor>
      </View>
      <View style={styles.lineSlot}>
        {line ? (
          <Animated.Text
            key={notice ? `notice-${notice.id}` : `aside-${line}`}
            entering={reduceMotion ? undefined : FadeIn.duration(220)}
            exiting={reduceMotion ? undefined : FadeOut.duration(160)}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.3}
            numberOfLines={2}
            style={[styles.aside, notice ? styles.notice : null, { color: lineColor }]}>
            {line}
          </Animated.Text>
        ) : null}
      </View>
    </View>
  );
}

function noticeColor(tone: CareNoticeTone, palette: ReturnType<typeof useNestPalette>): string {
  switch (tone) {
    case 'great':
      return palette.optimal;
    case 'good':
      return palette.text;
    case 'warn':
      return palette.warning;
    case 'info':
      return palette.textMuted;
  }
}

/** Eases a displayed number toward `value`, so a spritz visibly soaks in. */
function useSoakedValue(value: number, durationMs: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (durationMs <= 0 || Math.abs(value - from) < 0.4) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const startedAt = Date.now();
    let frame: number | null = null;
    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (value - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [durationMs, value]);

  return shown;
}

function dialPoint(unit: number, radius = DIAL_RADIUS): { x: number; y: number } {
  const angle = ((DIAL_START_DEG + DIAL_SWEEP_DEG * unit) * Math.PI) / 180;
  return { x: DIAL_CENTER + radius * Math.cos(angle), y: DIAL_CENTER + radius * Math.sin(angle) };
}

function dialArc(fromUnit: number, toUnitValue: number): string {
  const from = Math.min(1, Math.max(0, fromUnit));
  const to = Math.min(1, Math.max(from + 0.004, toUnitValue));
  const start = dialPoint(from);
  const end = dialPoint(to);
  const large = (to - from) * DIAL_SWEEP_DEG > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function CareDial({
  unit,
  band,
  perfect,
  tint,
  sweet,
  active,
  children,
}: {
  unit: SharedValue<number>;
  band: [number, number];
  perfect: [number, number];
  tint: string;
  sweet: boolean;
  active: boolean;
  children: ReactNode;
}) {
  const palette = useNestPalette();
  const needleProps = useAnimatedProps(() => {
    const angle = ((DIAL_START_DEG + DIAL_SWEEP_DEG * unit.value) * Math.PI) / 180;
    return {
      cx: DIAL_CENTER + DIAL_RADIUS * Math.cos(angle),
      cy: DIAL_CENTER + DIAL_RADIUS * Math.sin(angle),
    };
  });

  return (
    <View style={styles.dial}>
      <Svg width={DIAL} height={DIAL} style={StyleSheet.absoluteFill}>
        <Path d={dialArc(0, 1)} stroke={palette.border} strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path
          d={dialArc(band[0], band[1])}
          stroke={hexToRgba(palette.optimal, sweet ? 0.7 : 0.42)}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <Path d={dialArc(perfect[0], perfect[1])} stroke={palette.optimal} strokeWidth={6} strokeLinecap="round" fill="none" />
        <AnimatedCircle
          animatedProps={needleProps}
          r={5}
          fill={sweet ? palette.optimal : tint}
          stroke={palette.background}
          strokeWidth={2}
        />
      </Svg>
      <View
        style={[
          styles.glyph,
          {
            borderColor: active ? tint : palette.border,
            backgroundColor: active ? hexToRgba(tint, 0.16) : 'transparent',
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

function Readout({ sweet, value, color }: { sweet: boolean; value: string; color: string }) {
  return (
    <View style={styles.readout}>
      <View style={[styles.dot, { backgroundColor: sweet ? SWEET : ATTENTION }]} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
        style={[styles.value, { color }]}>
        {value}
      </Text>
    </View>
  );
}

function Caption({ text, highlight }: { text: string; highlight: boolean }) {
  const palette = useNestPalette();
  return (
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.15}
      style={[styles.caption, { color: highlight ? palette.text : palette.textMuted, opacity: highlight ? 1 : 0.8 }]}>
      {text}
    </Text>
  );
}

function SunGlyph({ color }: { color: string }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    const inner = 6.4;
    const outer = 9.2;
    return `M ${(12 + Math.cos(rad) * inner).toFixed(2)} ${(12 + Math.sin(rad) * inner).toFixed(2)} L ${(12 + Math.cos(rad) * outer).toFixed(2)} ${(12 + Math.sin(rad) * outer).toFixed(2)}`;
  });

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="3.3" stroke={color} strokeWidth={1.35} fill="none" />
      {rays.map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={1.35} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

function DropGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 3.4 C12 3.4 6.4 10.2 6.4 14.4 C6.4 17.8 8.9 20.4 12 20.4 C15.1 20.4 17.6 17.8 17.6 14.4 C17.6 10.2 12 3.4 12 3.4 Z"
        stroke={color}
        strokeWidth={1.35}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 40,
  },
  anchor: {
    alignSelf: 'flex-start',
  },
  control: {
    alignItems: 'center',
    gap: 3,
    minWidth: 92,
  },
  controlDisabled: {
    opacity: 0.45,
  },
  dial: {
    width: DIAL,
    height: DIAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  value: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lineSlot: {
    minHeight: 32,
    justifyContent: 'center',
  },
  aside: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 300,
  },
  notice: {
    fontStyle: 'normal',
    fontWeight: '600',
  },
});
