import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useNestPalette } from '@/constants/nest';
import {
  HUMIDITY_TOLERANCE_PCT,
  TEMPERATURE_TOLERANCE_CELSIUS,
  type ClimateReading,
} from '@/domain/climateEngine';
import type { SpeciesConfig } from '@/domain/types';
import { useTranslation } from '@/i18n';

const SWEET = '#3EAD78';
const ATTENTION = '#E2B15C';

export interface ClimateControlsProps {
  species: SpeciesConfig;
  climate: ClimateReading;
  onWarm: () => void;
  onMist: () => void;
}

export function ClimateControls({ species, climate, onWarm, onMist }: ClimateControlsProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const temperature = climate.temperatureCelsius.toFixed(1);
  const humidity = String(Math.round(climate.humidityPct));
  const warmthSweet = climate.temperatureStatus === 'optimal';
  const mistSweet = climate.humidityStatus === 'optimal';
  const tempLow = (species.temperatureTargetCelsius - TEMPERATURE_TOLERANCE_CELSIUS).toFixed(1);
  const tempHigh = (species.temperatureTargetCelsius + TEMPERATURE_TOLERANCE_CELSIUS).toFixed(1);
  const humidityLow = Math.round(species.humidityTargetPct - HUMIDITY_TOLERANCE_PCT);
  const humidityHigh = Math.round(species.humidityTargetPct + HUMIDITY_TOLERANCE_PCT);
  const ink = palette.text;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nest.warmNest')}
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
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nest.mistNest')}
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
      </Pressable>
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 36,
  },
  control: {
    alignItems: 'center',
    gap: 5,
    minWidth: 64,
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
