import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPOTLIGHT_MOVE_MS, type NestTutorialStep, type PipMood } from '@/constants/tutorial';
import { Fonts } from '@/constants/theme';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { Pip } from './Pip';
import { placeTutorialCard, type SpotlightHole } from './spotlightGeometry';
import { useTypewriter } from './useTypewriter';

const MOVE = { duration: SPOTLIGHT_MOVE_MS, easing: Easing.out(Easing.cubic) };

export type TutorialTooltipProps = {
  step: NestTutorialStep;
  index: number;
  total: number;
  title: string;
  body: string;
  mood: PipMood;
  /** The step is waiting for the player to try the highlighted control. */
  waiting: boolean;
  /** Taps so far toward a counted action, such as the hello lullaby. */
  progress?: { done: number; total: number };
  hole: SpotlightHole | null;
  screenWidth: number;
  screenHeight: number;
  /** Space the floating tab bar covers at the bottom of the screen. */
  bottomClearance: number;
  reduceMotion: boolean;
  onSkip: () => void;
  onNext: () => void;
};

export function TutorialTooltip({
  step,
  index,
  total,
  title,
  body,
  mood,
  waiting,
  progress,
  hole,
  screenWidth,
  screenHeight,
  bottomClearance,
  reduceMotion,
  onSkip,
  onNext,
}: TutorialTooltipProps) {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isLast = index >= total - 1;
  const [cardHeight, setCardHeight] = useState(200);
  const typed = useTypewriter(body, { instant: reduceMotion });
  const placement = placeTutorialCard({
    hole,
    screenWidth,
    screenHeight,
    cardHeight,
    insetTop: insets.top,
    insetBottom: Math.max(insets.bottom, bottomClearance),
    insetLeft: insets.left,
    insetRight: insets.right,
  });

  const top = useSharedValue(placement.top);
  const left = useSharedValue(placement.left);
  const cardWidth = useSharedValue(placement.width);
  const opacity = useSharedValue(0);
  const placed = useRef(false);
  const [hopKey, setHopKey] = useState(0);

  useEffect(() => {
    const duration = reduceMotion || !placed.current ? 0 : MOVE.duration;
    top.value = withTiming(placement.top, { duration, easing: MOVE.easing });
    left.value = withTiming(placement.left, { duration, easing: MOVE.easing });
    cardWidth.value = withTiming(placement.width, { duration, easing: MOVE.easing });
    opacity.value = withTiming(1, { duration: reduceMotion ? 0 : 240 });
    placed.current = true;
  }, [cardWidth, left, opacity, placement.left, placement.top, placement.width, reduceMotion, top]);

  useEffect(() => {
    setHopKey((key) => key + 1);
  }, [body]);

  const position = useAnimatedStyle(() => ({
    top: top.value,
    left: left.value,
    width: cardWidth.value,
    opacity: opacity.value,
  }));

  const advance = () => {
    if (!typed.done) {
      typed.finish();
      return;
    }
    void triggerImpact(ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <Animated.View
      pointerEvents={waiting ? 'box-none' : 'auto'}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        if (height > 1) {
          setCardHeight((current) => (Math.abs(current - height) > 0.5 ? height : current));
        }
      }}
      style={[styles.card, position, { backgroundColor: palette.surface, borderColor: hexToRgba(step.rim, 0.55) }]}>
      {placement.showCaret ? (
        <Caret placement={placement.placement} left={placement.caretLeft} fill={palette.surface} border={hexToRgba(step.rim, 0.55)} />
      ) : null}
      <Pressable
        accessible={false}
        pointerEvents={waiting ? 'none' : 'auto'}
        onPress={typed.done ? undefined : typed.finish}
        style={styles.content}>
        <View style={styles.speaker}>
          <View style={[styles.avatar, { backgroundColor: hexToRgba(step.rim, 0.16) }]}>
            <Pip
              size={62}
              mood={mood}
              talking={!typed.done}
              reduceMotion={reduceMotion}
              hopKey={hopKey}
              accessibilityLabel={t('welcome.pipA11y')}
            />
          </View>
          <View style={styles.copy}>
            <Text maxFontSizeMultiplier={1.25} style={[styles.title, { color: palette.text, fontFamily: Fonts.serif }]}>
              {title}
            </Text>
            <View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.body, styles.ghost]} accessibilityElementsHidden>
                {body}
              </Text>
              <Text
                accessibilityLabel={body}
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={1.3}
                style={[styles.body, styles.typed, { color: palette.textMuted }]}>
                {typed.shown}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View pointerEvents="box-none" style={styles.footer}>
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={t('tutorial.step', { current: index + 1, total })}
          style={styles.dots}>
          {Array.from({ length: total }, (_, dot) => (
            <View
              key={dot}
              style={[
                styles.dot,
                dot === index ? styles.dotActive : null,
                { backgroundColor: dot <= index ? step.rim : palette.border },
              ]}
            />
          ))}
        </View>
        {isLast ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tutorial.skip')}
            onPress={onSkip}
            hitSlop={10}
            style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.6 : 1 }]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.skipLabel, { color: palette.textMuted }]}>
              {t('tutorial.skip')}
            </Text>
          </Pressable>
        )}
        {waiting ? (
          <YourTurn tint={step.rim} progress={progress} reduceMotion={reduceMotion} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLast ? t('tutorial.done') : t('tutorial.next')}
            onPress={advance}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.pillLabel, { color: palette.actionText }]}>
              {isLast ? t('tutorial.done') : t('tutorial.next')}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function YourTurn({
  tint,
  progress,
  reduceMotion,
}: {
  tint: string;
  progress?: { done: number; total: number };
  reduceMotion: boolean;
}) {
  const { t } = useTranslation();
  const palette = useNestPalette();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(glow);
      glow.value = 1;
      return;
    }
    glow.value = withRepeat(withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
    return () => {
      cancelAnimation(glow);
    };
  }, [glow, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityLabel={t('tutorial.tryIt')}
      style={[styles.turn, { borderColor: tint, backgroundColor: hexToRgba(tint, 0.14) }, style]}>
      <Text maxFontSizeMultiplier={1.2} style={[styles.turnLabel, { color: palette.text }]}>
        {t('tutorial.tryIt')}
      </Text>
      {progress ? (
        <View style={styles.turnDots}>
          {Array.from({ length: progress.total }, (_, dot) => (
            <View
              key={dot}
              style={[styles.turnDot, { borderColor: tint, backgroundColor: dot < progress.done ? tint : 'transparent' }]}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function Caret({
  placement,
  left,
  fill,
  border,
}: {
  placement: 'above' | 'below';
  left: number;
  fill: string;
  border: string;
}) {
  const pointingUp = placement === 'below';
  return (
    <View pointerEvents="none" style={[styles.caretHost, pointingUp ? styles.caretHostUp : styles.caretHostDown, { left }]}>
      <View
        style={[
          styles.caret,
          pointingUp ? styles.pointUp : styles.pointDown,
          pointingUp ? { borderBottomColor: border } : { borderTopColor: border },
        ]}
      />
      <View
        style={[
          styles.caret,
          styles.caretFill,
          pointingUp ? styles.pointUp : styles.pointDown,
          pointingUp ? { borderBottomColor: fill } : { borderTopColor: fill },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  speaker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  ghost: {
    opacity: 0,
  },
  typed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
  },
  skip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  turn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  turnDots: {
    flexDirection: 'row',
    gap: 4,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  caretHost: {
    position: 'absolute',
    width: 16,
    height: 10,
    zIndex: 2,
  },
  caretHostUp: {
    top: -9,
  },
  caretHostDown: {
    bottom: -9,
  },
  caret: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  caretFill: {
    borderLeftWidth: 7,
    borderRightWidth: 7,
  },
  pointUp: {
    borderBottomWidth: 9,
  },
  pointDown: {
    top: 1,
    borderTopWidth: 9,
  },
});
