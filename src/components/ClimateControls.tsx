import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { TutorialAnchor } from '@/components/tutorial/TutorialAnchor';

import { hexToRgba, useNestPalette } from '@/constants/nest';
import {
  HUMIDITY_TOLERANCE_PCT,
  TEMPERATURE_TOLERANCE_CELSIUS,
  type ClimateReading,
  type HumidityStatus,
  type TemperatureStatus,
} from '@/domain/climateEngine';
import type { SpeciesConfig } from '@/domain/types';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';

const TEMPERATURE_SPAN = 6;
const HUMIDITY_SPAN = 20;

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

export interface ClimateControlsProps {
  species: SpeciesConfig;
  climate: ClimateReading;
  onWarm: () => void;
  onMist: () => void;
}

export function describeClimate(
  climate: ClimateReading,
  species: SpeciesConfig,
  t: TranslateFn
): string | null {
  const temp = species.temperatureTargetCelsius.toFixed(1);
  const humidity = String(Math.round(species.humidityTargetPct));
  if (climate.temper === 'on_strike') {
    return t('climate.strike', { temp, humidity });
  }
  if (climate.temper === 'fussy') {
    return t('climate.fussy');
  }
  if (climate.temper === 'chilly') {
    return t(climate.temperatureStatus === 'too_warm' ? 'climate.flushed' : 'climate.chilly', { temp });
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

export function ClimateControls({ species, climate, onWarm, onMist }: ClimateControlsProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const temperature = climate.temperatureCelsius.toFixed(1);
  const humidity = String(Math.round(climate.humidityPct));
  const warmthSweet = climate.temperatureStatus === 'optimal';
  const mistSweet = climate.humidityStatus === 'optimal';
  const tempTarget = species.temperatureTargetCelsius.toFixed(1);
  const humidityTarget = String(Math.round(species.humidityTargetPct));
  const tempLow = (species.temperatureTargetCelsius - TEMPERATURE_TOLERANCE_CELSIUS).toFixed(1);
  const tempHigh = (species.temperatureTargetCelsius + TEMPERATURE_TOLERANCE_CELSIUS).toFixed(1);
  const humidityLow = Math.round(species.humidityTargetPct - HUMIDITY_TOLERANCE_PCT);
  const humidityHigh = Math.round(species.humidityTargetPct + HUMIDITY_TOLERANCE_PCT);
  const aside = describeClimate(climate, species, t);
  const ink = palette.text;
  const asideColor = climate.temper === 'content' ? palette.textMuted : palette.warning;

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <TutorialAnchor targetId="warm_control" style={styles.anchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('climate.a11y.temperature', {
              value: temperature,
              status: t(TEMPERATURE_STATUS_KEY[climate.temperatureStatus]),
              target: tempTarget,
            })}
            accessibilityHint={t('climate.sweetSpot', { low: tempLow, high: tempHigh })}
            onPress={onWarm}
            style={({ pressed }) => [styles.control, { opacity: pressed ? 0.62 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <View style={[styles.glyph, { borderColor: palette.border }]}>
            <SunGlyph color={ink} />
          </View>
          <View style={styles.readout}>
            <View style={[styles.dot, { backgroundColor: warmthSweet ? SWEET : ATTENTION }]} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
              style={[styles.value, { color: palette.textMuted }]}>
              {temperature}°C
            </Text>
          </View>
          <ComfortMark
            value={climate.temperatureCelsius}
            target={species.temperatureTargetCelsius}
            tolerance={TEMPERATURE_TOLERANCE_CELSIUS}
            span={TEMPERATURE_SPAN}
            sweet={warmthSweet}
            label={`${tempTarget}°`}
          />
          </Pressable>
        </TutorialAnchor>

        <TutorialAnchor targetId="mist_control" style={styles.anchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('climate.a11y.humidity', {
              value: humidity,
              status: t(HUMIDITY_STATUS_KEY[climate.humidityStatus]),
              target: humidityTarget,
            })}
            accessibilityHint={t('climate.sweetSpot', { low: String(humidityLow), high: String(humidityHigh) })}
            onPress={onMist}
            style={({ pressed }) => [styles.control, { opacity: pressed ? 0.62 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <View style={[styles.glyph, { borderColor: palette.border }]}>
            <DropGlyph color={ink} />
          </View>
          <View style={styles.readout}>
            <View style={[styles.dot, { backgroundColor: mistSweet ? SWEET : ATTENTION }]} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
              style={[styles.value, { color: palette.textMuted }]}>
              {humidity}%
            </Text>
          </View>
          <ComfortMark
            value={climate.humidityPct}
            target={species.humidityTargetPct}
            tolerance={HUMIDITY_TOLERANCE_PCT}
            span={HUMIDITY_SPAN}
            sweet={mistSweet}
            label={`${humidityTarget}%`}
          />
          </Pressable>
        </TutorialAnchor>
      </View>
      {aside ? (
        <Text
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={1.3}
          style={[styles.aside, { color: asideColor }]}>
          {aside}
        </Text>
      ) : null}
    </View>
  );
}

function ComfortMark({
  value,
  target,
  tolerance,
  span,
  sweet,
  label,
}: {
  value: number;
  target: number;
  tolerance: number;
  span: number;
  sweet: boolean;
  label: string;
}) {
  const palette = useNestPalette();
  const unit = gaugeUnit(value, target, span);
  const bandWidth = Math.min(1, tolerance / span);
  const bandLeft = 0.5 - bandWidth / 2;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.mark}>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.band,
            {
              left: `${bandLeft * 100}%`,
              width: `${bandWidth * 100}%`,
              backgroundColor: hexToRgba(palette.optimal, sweet ? 0.9 : 0.45),
            },
          ]}
        />
        <View
          style={[
            styles.needle,
            {
              left: `${unit * 100}%`,
              backgroundColor: sweet ? palette.optimal : palette.warning,
            },
          ]}
        />
      </View>
      <Text style={[styles.markLabel, { color: palette.textMuted, opacity: sweet ? 0.85 : 1 }]}>{label}</Text>
    </View>
  );
}

function gaugeUnit(value: number, target: number, span: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || span <= 0) {
    return 0.5;
  }
  const delta = Math.min(span, Math.max(-span, value - target));
  return (delta + span) / (2 * span);
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 36,
  },
  anchor: {
    alignSelf: 'flex-start',
  },
  control: {
    alignItems: 'center',
    gap: 5,
    minWidth: 72,
  },
  mark: {
    width: 56,
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  track: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'visible',
  },
  band: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 2,
  },
  needle: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 9,
    marginLeft: -1,
    borderRadius: 1,
  },
  markLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  aside: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 280,
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
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
