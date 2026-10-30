import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTutorialAnchor } from '@/components/tutorial/TutorialAnchor';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import { NEST_ANCHOR } from '@/constants/tutorial';
import { LULLABY_TAPS, type ActiveWish } from '@/domain/nestCare';
import type { NestWeather } from '@/domain/nestWeather';
import type { SpeciesConfig } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { formatDuration, getElapsedSpan, useTranslation } from '@/i18n';
import type { TranslateFn } from '@/i18n/translate';

const HEART = '#E07A8D';
/** Reserved above the egg so a wish never shoves the shell down. */
export const WISH_SLOT_HEIGHT = 38;

const WEATHER_LOOK: Record<NestWeather, { symbol: SymbolViewProps['name']; glyph: string; color: string }> = {
  mild: { symbol: { ios: 'cloud.sun.fill', android: 'partly_cloudy_day', web: 'partly_cloudy_day' }, glyph: '⛅', color: '#C9A15A' },
  cold_snap: { symbol: { ios: 'snowflake', android: 'ac_unit', web: 'ac_unit' }, glyph: '❄', color: '#6FA3CC' },
  balmy: { symbol: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' }, glyph: '☀', color: '#E89B3A' },
  dry_spell: { symbol: { ios: 'wind', android: 'air', web: 'air' }, glyph: '〰', color: '#B8956A' },
  muggy: { symbol: { ios: 'cloud.fog.fill', android: 'foggy', web: 'foggy' }, glyph: '☁', color: '#7E9FB0' },
};

/** Today's nest weather and the hearts earned from granted wishes. */
export function NestAlmanac({ weather, hearts, heartPulse }: { weather: NestWeather; hearts: number; heartPulse: number }) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const weatherAnchor = useTutorialAnchor(NEST_ANCHOR.almanacWeather);
  const heartsAnchor = useTutorialAnchor(NEST_ANCHOR.almanacHearts);
  const bump = useSharedValue(1);
  const look = WEATHER_LOOK[weather];
  const name = t(`weather.${weather}`);
  const effect = t(`weather.effect.${weather}`);

  useEffect(() => {
    if (heartPulse <= 0 || reduceMotion) {
      return;
    }
    bump.value = withSequence(withTiming(1.35, { duration: 160 }), withSpring(1, { damping: 7, stiffness: 220 }));
  }, [bump, heartPulse, reduceMotion]);

  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <View style={styles.almanac}>
      <View
        ref={weatherAnchor.ref}
        collapsable={false}
        onLayout={weatherAnchor.onLayout}
        accessible
        accessibilityLabel={t('weather.a11y', { weather: name, effect })}
        style={[styles.chip, styles.weatherChip, { borderColor: palette.border, backgroundColor: hexToRgba(look.color, 0.1) }]}>
        <View style={styles.weatherLead}>
          <SymbolView
            name={look.symbol}
            size={14}
            tintColor={look.color}
            fallback={<Text style={[styles.glyph, { color: look.color }]}>{look.glyph}</Text>}
          />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.chipLabel, { color: palette.text }]}>
            {name}
          </Text>
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.chipDetail, { color: palette.textMuted }]}>
          {effect}
        </Text>
      </View>
      <View
        ref={heartsAnchor.ref}
        collapsable={false}
        onLayout={heartsAnchor.onLayout}
        accessible
        accessibilityLabel={t('hearts.a11y', { count: hearts })}
        style={[styles.chip, styles.heartChip, { borderColor: palette.border, backgroundColor: hexToRgba(HEART, 0.1) }]}>
        <Animated.View style={bumpStyle}>
          <SymbolView
            name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
            size={13}
            tintColor={HEART}
            fallback={<Text style={[styles.glyph, { color: HEART }]}>♥</Text>}
          />
        </Animated.View>
        <Text maxFontSizeMultiplier={1.15} style={[styles.chipLabel, styles.count, { color: palette.text }]}>
          {hearts}
        </Text>
      </View>
    </View>
  );
}

/** The egg's current wish, floating above the shell. Keeps its slot so the egg never jumps. */
export function WishBubble({
  wish,
  species,
  nowEpoch,
  lullabyTaps,
  cradleId,
}: {
  wish: ActiveWish | null;
  species: SpeciesConfig;
  nowEpoch: number;
  lullabyTaps: number;
  cradleId: string;
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const float = useSharedValue(0);

  const wishKey = wish ? `${cradleId}-${wish.index}-${wish.kind}` : null;
  useEffect(() => {
    if (!wishKey || reduceMotion) {
      float.value = 0;
      return;
    }
    float.value = withSequence(withTiming(-4, { duration: 220 }), withSpring(0, { damping: 8, stiffness: 180 }));
  }, [float, reduceMotion, wishKey]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  if (!wish) {
    return <View style={styles.wishSlot} />;
  }
  const text = t(`wish.${wish.kind}`, {
    temp: species.temperatureTargetCelsius.toFixed(1),
    humidity: Math.round(species.humidityTargetPct),
  });
  const remaining = formatDuration(getElapsedSpan(nowEpoch, wish.endsAt), t);
  const compact = compactWishTime(nowEpoch, wish.endsAt, t);

  return (
    <View style={styles.wishSlot}>
      <Animated.View
        key={`${cradleId}-${wish.index}-${wish.kind}`}
        entering={reduceMotion ? undefined : FadeIn.duration(320)}
        exiting={reduceMotion ? undefined : FadeOut.duration(220)}
        accessible
        accessibilityLabel={t('wish.a11y', { wish: text, time: remaining })}
        style={[styles.wish, { backgroundColor: palette.surface, borderColor: hexToRgba(HEART, 0.45) }, floatStyle]}>
        <Text style={[styles.wishHeart, { color: HEART }]}>♥</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.15}
          style={[styles.wishText, { color: palette.text }]}>
          {text}
        </Text>
        {wish.kind === 'lullaby' ? (
          <View style={styles.tapDots}>
            {Array.from({ length: LULLABY_TAPS }, (_, dot) => (
              <View
                key={dot}
                style={[styles.tapDot, { borderColor: HEART, backgroundColor: dot < lullabyTaps ? HEART : 'transparent' }]}
              />
            ))}
          </View>
        ) : (
          <Text maxFontSizeMultiplier={1.1} style={[styles.wishTime, { color: palette.textMuted }]}>
            {compact}
          </Text>
        )}
        <View style={[styles.wishTail, { backgroundColor: palette.surface, borderColor: hexToRgba(HEART, 0.45) }]} />
      </Animated.View>
    </View>
  );
}

/** Hearts that float up from the egg when a wish is granted. */
export function HeartBurst({ pulse }: { pulse: number }) {
  const reduceMotion = useReduceMotion();
  if (pulse <= 0) {
    return null;
  }
  return (
    <View pointerEvents="none" style={styles.burst}>
      {HEART_FLIGHTS.map((flight, index) => (
        <FloatingHeart key={`${pulse}-${index}`} flight={flight} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

const HEART_FLIGHTS = [
  { x: -46, rise: 120, delay: 0, size: 22 },
  { x: 8, rise: 150, delay: 90, size: 28 },
  { x: 52, rise: 112, delay: 160, size: 20 },
  { x: -18, rise: 170, delay: 240, size: 16 },
  { x: 30, rise: 138, delay: 320, size: 18 },
];

function FloatingHeart({ flight, reduceMotion }: { flight: (typeof HEART_FLIGHTS)[number]; reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withTiming(1, { duration: reduceMotion ? 700 : 1300 });
    }, flight.delay);
    return () => clearTimeout(timer);
  }, [flight.delay, progress, reduceMotion]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p <= 0 ? 0 : p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.55) / 0.45),
      transform: reduceMotion
        ? [{ scale: 0.6 + 0.4 * Math.min(1, p * 3) }]
        : [
            { translateX: flight.x * p + Math.sin(p * Math.PI * 3) * 8 },
            { translateY: -flight.rise * p },
            { scale: 0.4 + 0.6 * Math.min(1, p * 3) },
          ],
    };
  });

  return <Animated.Text style={[styles.flyingHeart, { fontSize: flight.size, color: HEART }, style]}>♥</Animated.Text>;
}

function compactWishTime(nowEpoch: number, endsAt: number, t: TranslateFn): string {
  const span = getElapsedSpan(nowEpoch, endsAt);
  if (span.unit === 'now') {
    return t('wish.timeNow');
  }
  if (span.unit === 'minute') {
    return t('wish.minutesCompact', { count: span.count });
  }
  if (span.unit === 'hour') {
    return t('wish.hoursCompact', { count: span.count });
  }
  return t('wish.daysCompact', { count: span.count });
}

const styles = StyleSheet.create({
  almanac: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexShrink: 1,
  },
  weatherChip: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    borderRadius: 16,
    paddingVertical: 5,
    maxWidth: '78%',
  },
  weatherLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartChip: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  glyph: {
    fontSize: 12,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chipDetail: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  count: {
    fontVariant: ['tabular-nums'],
  },
  wishSlot: {
    height: WISH_SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  wish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  wishHeart: {
    fontSize: 13,
  },
  wishText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  wishTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  tapDots: {
    flexDirection: 'row',
    gap: 4,
  },
  tapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  wishTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  burst: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  flyingHeart: {
    position: 'absolute',
    fontWeight: '700',
  },
});
