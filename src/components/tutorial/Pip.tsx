import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import type { PipMood } from '@/constants/tutorial';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FLUFF = '#FFD45C';
const FLUFF_EDGE = '#E2A72E';
const BELLY = '#FFEBA8';
const BEAK = '#F28C28';
const BEAK_SHADE = '#D9691A';
const EYE = '#2B211A';
const CHEEK = '#FF9C7E';
const SHELL = '#FFF8EC';
const SHELL_EDGE = '#D9CBB4';

const EYE_OPEN = 4.6;
const EYE_WOW = 5.8;

export type PipProps = {
  size?: number;
  mood?: PipMood;
  /** Flaps the beak while a line is being typed. */
  talking?: boolean;
  reduceMotion?: boolean;
  /** Bumps when Pip should hop, such as a cheer or a fresh line. */
  hopKey?: number;
  accessibilityLabel?: string;
};

/** Pip, the chick who guides new keepers. Still wears a bit of his own shell. */
export function Pip({
  size = 96,
  mood = 'talk',
  talking = false,
  reduceMotion = false,
  hopKey = 0,
  accessibilityLabel,
}: PipProps) {
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const mouth = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(bob);
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(bob);
    };
  }, [bob, reduceMotion]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) {
          return;
        }
        blink.value = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 110 }));
        schedule();
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => {
      alive = false;
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }, [blink]);

  useEffect(() => {
    if (!talking) {
      cancelAnimation(mouth);
      mouth.value = withTiming(mood === 'wow' ? 0.7 : 0, { duration: 120 });
      return;
    }
    mouth.value = withRepeat(
      withSequence(withTiming(1, { duration: 90 }), withTiming(0.15, { duration: 110 })),
      -1,
      false
    );
    return () => {
      cancelAnimation(mouth);
    };
  }, [mood, mouth, talking]);

  useEffect(() => {
    if (hopKey <= 0) {
      return;
    }
    if (reduceMotion) {
      return;
    }
    hop.value = withSequence(
      withTiming(-14, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 8, stiffness: 240 })
    );
    tilt.value = withSequence(
      withTiming(-8, { duration: 110 }),
      withTiming(7, { duration: 140 }),
      withDelay(40, withSpring(0, { damping: 10, stiffness: 200 }))
    );
  }, [hop, hopKey, reduceMotion, tilt]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hop.value + (bob.value - 0.5) * 3.2 },
      { rotate: `${tilt.value + (bob.value - 0.5) * 2}deg` },
    ],
  }));

  const eyeHeight = mood === 'wow' ? EYE_WOW : EYE_OPEN;
  const leftEyeProps = useAnimatedProps(() => ({ ry: Math.max(0.35, eyeHeight * blink.value) }));
  const rightEyeProps = useAnimatedProps(() => ({ ry: Math.max(0.35, eyeHeight * blink.value) }));
  const jawProps = useAnimatedProps(() => {
    const drop = 1.5 + mouth.value * 6;
    return { d: `M44.5 61 L55.5 61 L50 ${(61 + drop).toFixed(2)} Z` };
  });

  const happyEyes = mood === 'happy';
  const winking = mood === 'wink';

  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityRole={accessibilityLabel != null ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel != null ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Ellipse cx="50" cy="94" rx="22" ry="3.2" fill="#000000" opacity={0.12} />
          <Path d="M41 86 L39 93 M41 86 L43 93 M59 86 L57 93 M59 86 L61 93" stroke={BEAK} strokeWidth={2.4} strokeLinecap="round" />
          <Path
            d="M50 24 C26 24 15 44 15 60 C15 78 31 89 50 89 C69 89 85 78 85 60 C85 44 74 24 50 24 Z"
            fill={FLUFF}
            stroke={FLUFF_EDGE}
            strokeWidth={1.6}
          />
          <Ellipse cx="50" cy="70" rx="20" ry="15" fill={BELLY} />
          <G>
            <Path d="M17 58 C9 60 8 70 14 74 C18 70 20 64 19 58 Z" fill={FLUFF} stroke={FLUFF_EDGE} strokeWidth={1.4} />
            <Path d="M83 58 C91 60 92 70 86 74 C82 70 80 64 81 58 Z" fill={FLUFF} stroke={FLUFF_EDGE} strokeWidth={1.4} />
          </G>
          <Path
            d="M25 36 L31 29 L37 35 L43 27 L50 34 L57 27 L63 35 L69 29 L75 36 C69 21 31 21 25 36 Z"
            fill={SHELL}
            stroke={SHELL_EDGE}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <Path d="M49 22 C47 15 51 11 53 16 C55 11 60 13 56 22" fill={FLUFF} stroke={FLUFF_EDGE} strokeWidth={1.2} />
          <Ellipse cx="31" cy="60" rx="5.4" ry="3.2" fill={CHEEK} opacity={0.6} />
          <Ellipse cx="69" cy="60" rx="5.4" ry="3.2" fill={CHEEK} opacity={0.6} />
          {happyEyes ? (
            <G>
              <Path d="M34 51 Q38 45 42 51" stroke={EYE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
              <Path d="M58 51 Q62 45 66 51" stroke={EYE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
            </G>
          ) : (
            <G>
              {winking ? (
                <Path d="M34 50 Q38 53 42 50" stroke={EYE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
              ) : (
                <AnimatedEllipse cx="38" cy="49" rx={mood === 'wow' ? 4.4 : 3.8} animatedProps={leftEyeProps} fill={EYE} />
              )}
              <AnimatedEllipse cx="62" cy="49" rx={mood === 'wow' ? 4.4 : 3.8} animatedProps={rightEyeProps} fill={EYE} />
              {winking ? null : <Ellipse cx="39.4" cy="47" rx="1.3" ry="1.3" fill="#FFFFFF" />}
              <Ellipse cx="63.4" cy="47" rx="1.3" ry="1.3" fill="#FFFFFF" />
            </G>
          )}
          <AnimatedPath animatedProps={jawProps} fill={BEAK_SHADE} />
          <Path d="M43.5 55.5 C46 53.8 54 53.8 56.5 55.5 L50 62 Z" fill={BEAK} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
