import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { NestStatusBar } from '@/components/NestStatusBar';
import { Fonts } from '@/constants/theme';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import type { PipMood } from '@/constants/tutorial';
import { getSpeciesConfig } from '@/data/species';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  triggerImpact,
  triggerNotification,
} from '@/services/hapticFeedback';

import { Pip } from './Pip';
import { useTypewriter } from './useTypewriter';

/** What the last line offers: adopting a first egg, touring the nest, or just closing. */
export type WelcomeMode = 'adopt' | 'meet' | 'close';

const CRACK_TAPS = 3;
const SHELL = '#FFF6E6';
const SHELL_EDGE = '#D9C6A5';
const SPECKLE = '#E6CFA8';
const CRACK = '#8A6F4E';
const EGG_W = 150;
const EGG_H = 188;
const PIP_SIZE = 156;

const EGG_WHOLE = 'M60 8 C30 8 14 56 14 86 C14 120 34 142 60 142 C86 142 106 120 106 86 C106 56 90 8 60 8 Z';
const EGG_TOP =
  'M14 86 C14 56 30 8 60 8 C90 8 106 56 106 86 L98 78 L88 88 L78 77 L68 89 L58 77 L48 88 L38 77 L28 88 L20 79 Z';
const EGG_BOTTOM =
  'M14 86 L20 79 L28 88 L38 77 L48 88 L58 77 L68 89 L78 77 L88 88 L98 78 L106 86 C106 120 86 142 60 142 C34 142 14 120 14 86 Z';
const CRACKS = ['M66 30 L60 40 L67 48', 'M66 30 L60 40 L67 48 L58 58 L64 66 M60 40 L52 44'];
const HIGHLIGHT = 'M44 30 C36 50 34 70 42 92';
/** The lid and the cup meet here. Texture below this line belongs to the cup. */
const SPLIT_Y = 86;
const SPECKLES = [
  { cx: 78, cy: 56, rx: 4, ry: 2.8 },
  { cx: 50, cy: 104, rx: 3.4, ry: 2.4 },
  { cx: 82, cy: 112, rx: 3, ry: 2 },
] as const;

type EggPart = 'whole' | 'top' | 'bottom';

const FEATHERS = Array.from({ length: 12 }, (_, index) => ({
  angle: -Math.PI / 2 + ((index - 5.5) / 6) * Math.PI * 0.9,
  distance: 90 + ((index * 37) % 5) * 16,
  spin: ((index * 53) % 7) * 40 - 120,
  delay: (index % 4) * 30,
}));

type Line = { key: TranslationKey; mood: PipMood; extra?: 'species' | 'jobs' };

export type WelcomeIntroProps = {
  visible: boolean;
  mode: WelcomeMode;
  nickname?: string;
  onFinish: (mode: WelcomeMode) => void;
  onSkip: () => void;
};

export function WelcomeIntro({ visible, mode, nickname, onFinish, onSkip }: WelcomeIntroProps) {
  const reduceMotion = useReduceMotion();
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType={reduceMotion ? 'none' : 'fade'}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onSkip}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible ? (
          <WelcomeStage mode={mode} nickname={nickname} reduceMotion={reduceMotion} onFinish={onFinish} onSkip={onSkip} />
        ) : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function WelcomeStage({
  mode,
  nickname,
  reduceMotion,
  onFinish,
  onSkip,
}: {
  mode: WelcomeMode;
  nickname?: string;
  reduceMotion: boolean;
  onFinish: (mode: WelcomeMode) => void;
  onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const skipTop = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0) + 12;
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { play } = useSoundEffects();
  const [taps, setTaps] = useState(0);
  const [hatched, setHatched] = useState(false);
  const [talking, setTalking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const wobble = useSharedValue(0);
  const squash = useSharedValue(1);
  const lid = useSharedValue(0);
  const rise = useSharedValue(0);
  const burst = useSharedValue(0);

  const lines = useMemo<Line[]>(() => {
    const base: Line[] = [
      { key: 'welcome.line1', mood: 'happy' },
      { key: 'welcome.line2', mood: 'wow', extra: 'species' },
      { key: 'welcome.line3', mood: 'talk', extra: 'jobs' },
      { key: 'welcome.line4', mood: 'wink' },
    ];
    if (mode === 'adopt') {
      base.push({ key: 'welcome.lineAdopt', mood: 'happy' });
    } else if (mode === 'meet') {
      base.push({ key: 'welcome.lineMeet', mood: 'happy' });
    }
    return base;
  }, [mode]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (hatched || reduceMotion) {
      cancelAnimation(wobble);
      return;
    }
    wobble.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 110 }),
        withTiming(5, { duration: 140 }),
        withTiming(-3, { duration: 120 }),
        withTiming(0, { duration: 120 }),
        withDelay(1300, withTiming(0, { duration: 1 }))
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(wobble);
    };
  }, [hatched, reduceMotion, wobble]);

  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };

  const tapEgg = () => {
    if (hatched) {
      return;
    }
    const next = taps + 1;
    setTaps(next);
    squash.value = withSequence(withTiming(0.94, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 300 }));
    if (!reduceMotion) {
      wobble.value = withSequence(
        withTiming(-9, { duration: 60 }),
        withTiming(9, { duration: 90 }),
        withTiming(-4, { duration: 80 }),
        withTiming(0, { duration: 90 })
      );
    }
    if (next < CRACK_TAPS) {
      play('tap');
      void triggerImpact(next === 1 ? ImpactFeedbackStyle.Light : ImpactFeedbackStyle.Medium);
      return;
    }
    play('shell_crack');
    void triggerImpact(ImpactFeedbackStyle.Heavy);
    setHatched(true);
    if (reduceMotion) {
      lid.value = 1;
      rise.value = 1;
    } else {
      lid.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
      rise.value = withDelay(120, withSpring(1, { damping: 9, stiffness: 140 }));
      burst.value = withDelay(60, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    }
    later(260, () => {
      play('pip_peep');
      void triggerNotification(NotificationFeedbackType.Success);
    });
    later(reduceMotion ? 300 : 1150, () => setTalking(true));
  };

  const advance = () => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    if (lineIndex < lines.length - 1) {
      setLineIndex(lineIndex + 1);
      return;
    }
    onFinish(mode);
  };

  const eggStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }, { scaleY: squash.value }, { scaleX: 2 - squash.value }],
  }));
  const lidStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lid.value, [0, 0.7, 1], [1, 1, 0]),
    transform: [
      { translateX: lid.value * 70 },
      { translateY: interpolate(lid.value, [0, 0.4, 1], [0, -80, -40]) },
      { rotate: `${lid.value * 70}deg` },
    ],
  }));
  const pipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rise.value, [0, 0.15], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(rise.value, [0, 1], [70, 0]) }, { scale: interpolate(rise.value, [0, 1], [0.5, 1]) }],
  }));

  const line = lines[lineIndex] ?? lines[0];
  const isFinal = lineIndex >= lines.length - 1;
  const lineText = line ? t(line.key, { name: nickname ?? '' }) : '';
  const cta = mode === 'adopt' ? t('welcome.ctaAdopt') : mode === 'meet' ? t('welcome.ctaMeet') : t('tutorial.done');

  return (
    <View style={[styles.fill, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
        <View style={[styles.topRow, { paddingTop: skipTop }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('welcome.skip')}
            onPress={onSkip}
            hitSlop={12}
            style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.55 : 1 }]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.skipLabel, { color: palette.textMuted }]}>
              {t('welcome.skip')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Glow color="#FFC85C" />
          <View style={styles.nest}>
            {FEATHERS.map((feather, index) => (
              <Feather key={index} feather={feather} progress={burst} />
            ))}
            {hatched ? (
              <Animated.View pointerEvents="none" style={[styles.shellBack, eggStyle]}>
                <EggSvg path={EGG_BOTTOM} clipId="pip-egg-cup" part="bottom" />
              </Animated.View>
            ) : null}
            {hatched ? (
              <Animated.View style={[styles.pip, pipStyle]}>
                <Pip
                  size={PIP_SIZE}
                  mood={talking ? line?.mood ?? 'happy' : 'wow'}
                  talking={typing}
                  reduceMotion={reduceMotion}
                  hopKey={talking ? lineIndex + 1 : 0}
                  accessibilityLabel={t('welcome.pipA11y')}
                />
              </Animated.View>
            ) : null}
            <Pressable
              accessible={!hatched}
              accessibilityRole="button"
              accessibilityLabel={t('welcome.tapEgg')}
              onPress={tapEgg}
              disabled={hatched}
              style={styles.eggHit}>
              <Animated.View style={[styles.egg, eggStyle]}>
                {hatched ? (
                  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lidStyle]}>
                    <EggSvg path={EGG_TOP} clipId="pip-egg-lid" part="top" />
                  </Animated.View>
                ) : (
                  <EggSvg
                    path={EGG_WHOLE}
                    clipId="pip-egg-whole"
                    part="whole"
                    crack={taps > 0 ? CRACKS[Math.min(taps, CRACKS.length) - 1] : undefined}
                  />
                )}
              </Animated.View>
            </Pressable>
          </View>
        </View>

        <View style={styles.dialogue}>
          {talking && line ? (
            <SpeechBubble
              key={lineIndex}
              text={lineText}
              extra={line.extra}
              reduceMotion={reduceMotion}
              isFinal={isFinal}
              cta={cta}
              onAdvance={advance}
              onTyping={setTyping}
              index={lineIndex}
              total={lines.length}
            />
          ) : hatched ? null : (
            <Animated.Text
              key={taps === 0 ? 'prompt' : 'more'}
              entering={reduceMotion ? undefined : FadeIn.duration(260)}
              maxFontSizeMultiplier={1.3}
              style={[styles.prompt, { color: palette.text, fontFamily: Fonts.serif }]}>
              {taps === 0 ? t('welcome.tapEgg') : t('welcome.tapMore')}
            </Animated.Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function SpeechBubble({
  text,
  extra,
  reduceMotion,
  isFinal,
  cta,
  onAdvance,
  onTyping,
  index,
  total,
}: {
  text: string;
  extra?: Line['extra'];
  reduceMotion: boolean;
  isFinal: boolean;
  cta: string;
  onAdvance: () => void;
  onTyping: (typing: boolean) => void;
  index: number;
  total: number;
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const typed = useTypewriter(text, { instant: reduceMotion });

  useEffect(() => {
    onTyping(!typed.done);
  }, [onTyping, typed.done]);

  const press = () => {
    if (!typed.done) {
      typed.finish();
      return;
    }
    onAdvance();
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(280)}
      style={[styles.bubble, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.bubbleTail, { backgroundColor: palette.surface, borderColor: palette.border }]} />
      <Pressable accessible={false} onPress={typed.done ? undefined : typed.finish}>
        <View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.line, styles.ghost]} accessibilityElementsHidden>
            {text}
          </Text>
          <Text
            accessibilityLabel={text}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.3}
            style={[styles.line, styles.typed, { color: palette.text }]}>
            {typed.shown}
          </Text>
        </View>
      </Pressable>
      {extra === 'species' ? <SpeciesChips visible={typed.done} reduceMotion={reduceMotion} /> : null}
      {extra === 'jobs' ? <JobTiles visible={typed.done} reduceMotion={reduceMotion} /> : null}
      <View style={styles.bubbleFooter}>
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, dot) => (
            <View
              key={dot}
              style={[styles.dot, dot === index ? styles.dotActive : null, { backgroundColor: dot <= index ? '#E2A72E' : palette.border }]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFinal ? cta : t('welcome.next')}
          onPress={press}
          style={({ pressed }) => [
            styles.pill,
            isFinal ? styles.pillFinal : null,
            { backgroundColor: palette.action, opacity: typed.done ? (pressed ? 0.86 : 1) : 0.5, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.pillLabel, { color: palette.actionText }]}>
            {isFinal ? cta : t('welcome.next')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function SpeciesChips({ visible, reduceMotion }: { visible: boolean; reduceMotion: boolean }) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  if (!visible) {
    return <View style={styles.extraSlot} />;
  }
  const chips: { name: TranslationKey; id: string }[] = [
    { name: 'welcome.chick', id: 'silkie_chicken' },
    { name: 'welcome.gecko', id: 'leopard_gecko' },
    { name: 'welcome.croc', id: 'saltwater_crocodile' },
  ];
  return (
    <View style={[styles.extraSlot, styles.chips]}>
      {chips.map((chip, index) => (
        <Animated.View
          key={chip.id}
          entering={reduceMotion ? undefined : FadeInDown.delay(index * 90).duration(240)}
          style={[styles.chip, { borderColor: palette.border, backgroundColor: hexToRgba('#E2A72E', 0.1) }]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.chipLabel, { color: palette.text }]}>
            {t('welcome.chip', { name: t(chip.name), days: getSpeciesConfig(chip.id).incubationDays })}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const JOBS: { label: TranslationKey; symbol: SymbolViewProps['name']; glyph: string; color: string }[] = [
  { label: 'welcome.icon.warmth', symbol: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' }, glyph: '☀', color: '#F2A33A' },
  { label: 'welcome.icon.mist', symbol: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }, glyph: '💧', color: '#5FA8CC' },
  { label: 'welcome.icon.wishes', symbol: { ios: 'heart.fill', android: 'favorite', web: 'favorite' }, glyph: '♥', color: '#E07A8D' },
  {
    label: 'welcome.icon.candling',
    symbol: { ios: 'flashlight.on.fill', android: 'flashlight_on', web: 'flashlight_on' },
    glyph: '🔦',
    color: '#C9962E',
  },
];

function JobTiles({ visible, reduceMotion }: { visible: boolean; reduceMotion: boolean }) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  if (!visible) {
    return <View style={styles.extraSlot} />;
  }
  return (
    <View style={[styles.extraSlot, styles.jobs]}>
      {JOBS.map((job, index) => (
        <Animated.View
          key={job.label}
          entering={reduceMotion ? undefined : FadeInDown.delay(index * 80).duration(240)}
          style={styles.job}>
          <View style={[styles.jobIcon, { backgroundColor: hexToRgba(job.color, 0.16) }]}>
            <SymbolView
              name={job.symbol}
              size={20}
              tintColor={job.color}
              fallback={<Text style={{ color: job.color, fontSize: 16 }}>{job.glyph}</Text>}
            />
          </View>
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.jobLabel, { color: palette.textMuted }]}>
            {t(job.label)}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

function EggSvg({
  path,
  clipId,
  part,
  crack,
}: {
  path: string;
  clipId: string;
  part: EggPart;
  crack?: string;
}) {
  const speckles = SPECKLES.filter((speckle) => {
    if (part === 'top') {
      return speckle.cy < SPLIT_Y;
    }
    if (part === 'bottom') {
      return speckle.cy >= SPLIT_Y;
    }
    return true;
  });

  return (
    <Svg width={EGG_W} height={EGG_H} viewBox="0 0 120 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={path} />
        </ClipPath>
      </Defs>
      <Path d={path} fill={SHELL} stroke={SHELL_EDGE} strokeWidth={1.6} strokeLinejoin="round" />
      <G clipPath={`url(#${clipId})`}>
        {part === 'bottom' ? null : (
          <Path d={HIGHLIGHT} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.6} fill="none" />
        )}
        {speckles.map((speckle) => (
          <Ellipse key={`${speckle.cx}-${speckle.cy}`} cx={speckle.cx} cy={speckle.cy} rx={speckle.rx} ry={speckle.ry} fill={SPECKLE} />
        ))}
      </G>
      {crack ? <Path d={crack} stroke={CRACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
    </Svg>
  );
}

function Feather({ feather, progress }: { feather: (typeof FEATHERS)[number]; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    if (p <= 0) {
      return { opacity: 0 };
    }
    const x = Math.cos(feather.angle) * feather.distance * p;
    const y = Math.sin(feather.angle) * feather.distance * p + 120 * p * p;
    return {
      opacity: interpolate(p, [0, 0.1, 0.7, 1], [0, 1, 1, 0]),
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${feather.spin * p}deg` }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.feather, style]} />;
}

function Glow({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={styles.glow}>
      <Svg width={340} height={340}>
        <Defs>
          <RadialGradient id="welcome-glow" cx="170" cy="170" r="170" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={color} stopOpacity={0.42} />
            <Stop offset="60%" stopColor={color} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="170" cy="170" rx="170" ry="170" fill="url(#welcome-glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  skip: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
  },
  nest: {
    width: EGG_W,
    height: EGG_H + 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  shellBack: {
    position: 'absolute',
    bottom: 0,
    width: EGG_W,
    height: EGG_H,
    zIndex: 1,
  },
  pip: {
    position: 'absolute',
    bottom: EGG_H * 0.32,
    width: PIP_SIZE,
    height: PIP_SIZE,
    zIndex: 2,
  },
  eggHit: {
    width: EGG_W,
    height: EGG_H,
    zIndex: 3,
  },
  egg: {
    width: EGG_W,
    height: EGG_H,
  },
  feather: {
    position: 'absolute',
    bottom: EGG_H * 0.5,
    width: 12,
    height: 7,
    borderRadius: 6,
    backgroundColor: '#FFD45C',
  },
  dialogue: {
    minHeight: 260,
    paddingHorizontal: 20,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  prompt: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: 24,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  bubbleTail: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  line: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
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
  extraSlot: {
    minHeight: 64,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  jobs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  job: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  jobIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
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
  pill: {
    minHeight: 46,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFinal: {
    paddingHorizontal: 28,
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
