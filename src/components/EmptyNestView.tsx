import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { EGG_OUTLINE } from '@/components/EggContainer';
import { useNestPalette } from '@/constants/nest';
import { Fonts, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

const AMBER = '#E7B15A';
const MUTED = '#8E8E93';

const MOTES = [
  { x: -104, y: -78, size: 3.2, delay: 0, drift: 9 },
  { x: 98, y: -92, size: 2.2, delay: 420, drift: 7 },
  { x: -86, y: 28, size: 2.4, delay: 860, drift: 11 },
  { x: 108, y: 12, size: 3, delay: 240, drift: 8 },
  { x: -16, y: -118, size: 1.8, delay: 1100, drift: 6 },
  { x: 36, y: 64, size: 2, delay: 640, drift: 10 },
] as const;

export function EmptyNestView() {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const routed = useRef(false);

  const chooseEgg = useCallback(() => {
    if (routed.current) {
      return;
    }
    routed.current = true;
    void triggerImpact(ImpactFeedbackStyle.Medium);
    router.push('/adopt');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      routed.current = false;
    }, [])
  );

  return (
    <View style={styles.root}>
      <View style={[styles.hero, compact ? styles.heroCompact : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nest.cradleLabel')}
          accessibilityHint={t('nest.cradleHint')}
          onPress={chooseEgg}
          style={styles.cradleHit}>
          <BreathingAura />
          <View pointerEvents="none" style={styles.motes}>
            {MOTES.map((mote) => (
              <LightMote key={`${mote.x}-${mote.y}`} {...mote} />
            ))}
          </View>
          <CradleMark />
          <Spark />
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text
          maxFontSizeMultiplier={1.15}
          style={[styles.eyebrow, { color: palette.warning }]}>
          {t('nest.emptyEyebrow')}
        </Text>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          maxFontSizeMultiplier={1.15}
          style={[styles.title, { color: palette.text, fontFamily: Fonts?.serif }]}>
          {t('nest.emptyTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.15} style={styles.body}>
          {t('nest.emptyBody')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nest.adoptEgg')}
          accessibilityHint={t('nest.cradleHint')}
          onPress={chooseEgg}
          style={({ pressed }) => [
            styles.cta,
            {
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}>
          <Text maxFontSizeMultiplier={1.15} style={styles.ctaLabel}>
            {t('nest.adoptEgg')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function BreathingAura() {
  const reduceMotion = useReduceMotion();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const scale = useSharedValue(1);
  const opacity = useSharedValue(dark ? 0.82 : 0.7);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = dark ? 0.78 : 0.62;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 2900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.52, { duration: 2900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [dark, opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const peak = dark ? 0.5 : 0.34;

  return (
    <Animated.View pointerEvents="none" style={[styles.aura, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 280 312">
        <Defs>
          <RadialGradient id="sanctuaryAura" cx="140" cy="156" r="128" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={AMBER} stopOpacity={peak} />
            <Stop offset="38%" stopColor="#C4783A" stopOpacity={peak * 0.34} />
            <Stop offset="70%" stopColor="#C4783A" stopOpacity={peak * 0.08} />
            <Stop offset="100%" stopColor="#C4783A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="140" cy="158" rx="124" ry="112" fill="url(#sanctuaryAura)" />
      </Svg>
    </Animated.View>
  );
}

function CradleMark() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const stroke = dark ? 'rgba(230, 215, 196, 0.78)' : 'rgba(62, 48, 36, 0.62)';
  const soft = dark ? 'rgba(230, 215, 196, 0.28)' : 'rgba(62, 48, 36, 0.22)';
  const bowl = dark ? 'rgba(230, 215, 196, 0.07)' : 'rgba(44, 36, 28, 0.05)';
  const yolk = dark ? 'rgba(231, 177, 90, 0.14)' : 'rgba(196, 120, 58, 0.1)';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 280 312">
      <Ellipse cx="140" cy="248" rx="78" ry="15" fill={bowl} stroke={soft} strokeWidth={1.2} />
      <Path
        d="M58 232 C84 268 196 268 222 232"
        stroke={stroke}
        strokeWidth={1.45}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={EGG_OUTLINE} transform="translate(42 32)" fill={yolk} />
      <Path
        d={EGG_OUTLINE}
        transform="translate(42 32)"
        fill="none"
        stroke={stroke}
        strokeWidth={1.35}
        strokeDasharray="3.2 6.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Spark() {
  const reduceMotion = useReduceMotion();
  const glow = useSharedValue(0.55);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(glow);
      cancelAnimation(scale);
      glow.value = 0.8;
      scale.value = 1;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.86, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(glow);
      cancelAnimation(scale);
    };
  }, [glow, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.spark, style]}>
      <View style={styles.sparkCore} />
    </Animated.View>
  );
}

function LightMote({
  x,
  y,
  size,
  delay,
  drift,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  drift: number;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.28);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      cancelAnimation(shift);
      opacity.value = 0.4;
      shift.value = 0;
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.12, { duration: 1900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    shift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(drift, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
          withTiming(-drift * 0.55, { duration: 3400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(shift);
    };
  }, [delay, drift, opacity, reduceMotion, shift]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: shift.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mote,
        {
          width: size,
          height: size,
          marginLeft: x,
          marginTop: y,
          borderRadius: size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  hero: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 280 / 312,
    maxHeight: 312,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCompact: {
    maxHeight: 236,
  },
  cradleHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motes: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mote: {
    position: 'absolute',
    left: '50%',
    top: '48%',
    backgroundColor: AMBER,
  },
  spark: {
    position: 'absolute',
    left: '50%',
    top: '47.4%',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    backgroundColor: 'rgba(240, 194, 122, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkCore: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F6D7A2',
  },
  copy: {
    flexShrink: 0,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.two,
  },
  cta: {
    minHeight: 52,
    minWidth: 196,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A241E',
    borderWidth: 1,
    borderColor: 'rgba(212, 164, 92, 0.55)',
    boxShadow: '0 0 22px rgba(231, 177, 90, 0.28)',
  },
  ctaLabel: {
    color: '#F6EFE4',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
