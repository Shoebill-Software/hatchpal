import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  NEST_TUTORIAL_STEP_COUNT,
  NEST_TUTORIAL_STEPS,
  SPOTLIGHT_MOVE_MS,
  clampTutorialStep,
} from '@/constants/tutorial';
import { Fonts } from '@/constants/theme';
import { useNestPalette } from '@/constants/nest';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

import { placeTutorialCard, type SpotlightHole } from './spotlightGeometry';

const MOVE = { duration: SPOTLIGHT_MOVE_MS, easing: Easing.out(Easing.cubic) };

export type TutorialTooltipProps = {
  stepIndex: number;
  hole: SpotlightHole | null;
  screenWidth: number;
  screenHeight: number;
  reduceMotion: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function TutorialTooltip({
  stepIndex,
  hole,
  screenWidth,
  screenHeight,
  reduceMotion,
  onSkip,
  onBack,
  onNext,
  onComplete,
}: TutorialTooltipProps) {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const index = clampTutorialStep(stepIndex);
  const step = NEST_TUTORIAL_STEPS[index] ?? NEST_TUTORIAL_STEPS[0];
  const isLast = index >= NEST_TUTORIAL_STEP_COUNT - 1;
  const canGoBack = index > 0;
  const [contentHeight, setContentHeight] = useState(280);
  const maxCardHeight = Math.max(200, screenHeight - insets.top - insets.bottom - 24);
  const cardHeight = Math.min(Math.max(contentHeight, 160), maxCardHeight);
  const placement = placeTutorialCard({
    hole,
    screenWidth,
    screenHeight,
    cardHeight,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    insetLeft: insets.left,
    insetRight: insets.right,
  });

  const top = useSharedValue(placement.top);
  const left = useSharedValue(placement.left);
  const cardWidth = useSharedValue(placement.width);
  const opacity = useSharedValue(0);
  const copy = useSharedValue(1);
  const placed = useRef(false);

  useEffect(() => {
    const duration = reduceMotion || !placed.current ? 0 : MOVE.duration;
    const easing = MOVE.easing;
    top.value = withTiming(placement.top, { duration, easing });
    left.value = withTiming(placement.left, { duration, easing });
    cardWidth.value = withTiming(placement.width, { duration, easing });
    opacity.value = withTiming(1, { duration: reduceMotion ? 0 : 220 });
    placed.current = true;
  }, [cardWidth, left, opacity, placement.left, placement.top, placement.width, reduceMotion, top]);

  useEffect(() => {
    if (reduceMotion) {
      copy.value = 1;
      return;
    }
    copy.value = withSequence(withTiming(0.2, { duration: 90 }), withTiming(1, { duration: 240 }));
  }, [copy, index, reduceMotion]);

  const position = useAnimatedStyle(() => ({
    top: top.value,
    left: left.value,
    width: cardWidth.value,
    opacity: opacity.value,
  }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));

  const rememberContentHeight = (height: number) => {
    if (height < 1) {
      return;
    }
    setContentHeight((current) => (height > current + 0.5 ? height : current));
  };

  useEffect(() => {
    setContentHeight(280);
  }, [index]);

  const advance = () => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    if (isLast) {
      onComplete();
      return;
    }
    onNext();
  };

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.card,
        position,
        {
          maxHeight: maxCardHeight,
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}>
      {placement.showCaret ? (
        <Caret placement={placement.placement} left={placement.caretLeft} fill={palette.surface} border={palette.border} />
      ) : null}
      <ScrollView
        bounces={contentHeight > maxCardHeight}
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, { maxHeight: cardHeight }]}
        onContentSizeChange={(_width, height) => {
          rememberContentHeight(height);
        }}>
        <View style={styles.copyBlock}>
        <View style={styles.header}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.step, { color: palette.textMuted }]}
            accessibilityLiveRegion="polite">
            {t('tutorial.step', { current: index + 1, total: NEST_TUTORIAL_STEP_COUNT })}
          </Text>
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
        </View>

        <Animated.View style={copyStyle}>
          <Text maxFontSizeMultiplier={1.25} style={[styles.title, { color: palette.text, fontFamily: Fonts.serif }]}>
            {t(step.titleKey)}
          </Text>
          <Text maxFontSizeMultiplier={1.35} style={[styles.body, { color: palette.textMuted }]}>
            {t(step.bodyKey)}
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tutorial.back')}
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }]}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.textLabel, { color: palette.text }]}>
                {t('tutorial.back')}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          {isLast ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tutorial.next')}
              onPress={advance}
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.pillLabel, { color: palette.actionText }]}>
                {t('tutorial.next')}
              </Text>
            </Pressable>
          )}
        </View>
        {isLast ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tutorial.begin')}
            onPress={advance}
            style={({ pressed }) => [
              styles.begin,
              { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.beginLabel, { color: palette.actionText }]}>
              {t('tutorial.begin')}
            </Text>
          </Pressable>
        ) : null}
        </View>
      </ScrollView>
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
  scroll: {
    flexGrow: 0,
  },
  copyBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 32,
  },
  step: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
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
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
  },
  body: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 12,
  },
  textLabel: {
    fontSize: 15,
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
  begin: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  beginLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
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
