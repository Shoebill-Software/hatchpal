import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { hexToRgba, useNestPalette, type NestPaletteTokens } from '@/constants/nest';
import { Fonts, Spacing } from '@/constants/theme';
import type { JournalMilestone, JournalMilestoneStatus } from '@/domain/milestones';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { formatBiologicalDay, formatLocaleDate, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

export interface MilestoneTimelineProps {
  milestones: readonly JournalMilestone[];
  /** Later phases will not be kept. Upcoming rows say so instead of naming an expected date. */
  closed?: boolean;
  onSelect: (milestone: JournalMilestone) => void;
}

export function MilestoneTimeline({ milestones, closed = false, onSelect }: MilestoneTimelineProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const [hintId, setHintId] = useState<string | null>(null);
  const reduceMotion = useReduceMotion();
  const shell = milestones.filter((entry) => entry.duringIncubation);
  const growth = milestones.filter((entry) => !entry.duringIncubation);
  const chapters = [
    shell.length > 0 ? { id: 'shell', title: t('journal.shellChapter'), entries: shell } : null,
    growth.length > 0 ? { id: 'growth', title: t('journal.growthChapter'), entries: growth } : null,
  ].filter((chapter) => chapter != null);

  if (chapters.length === 0) {
    return null;
  }

  return (
    <View style={styles.chapters}>
      {chapters.map((chapter) => (
        <View key={chapter.id} style={styles.chapter}>
          <Text accessibilityRole="header" style={[styles.heading, { color: palette.textMuted }]}>
            {chapter.title}
          </Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {chapter.entries.map((entry, index) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                index={index}
                last={index === chapter.entries.length - 1}
                hinted={hintId === entry.id}
                closed={closed}
                reduceMotion={reduceMotion}
                onPress={() => {
                  if (entry.status === 'upcoming') {
                    setHintId(entry.id);
                    void triggerImpact(ImpactFeedbackStyle.Light);
                    return;
                  }
                  setHintId(null);
                  onSelect(entry);
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TimelineEntry({
  entry,
  index,
  last,
  hinted,
  closed,
  reduceMotion,
  onPress,
}: {
  entry: JournalMilestone;
  index: number;
  last: boolean;
  hinted: boolean;
  closed: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const openable = entry.status !== 'upcoming';
  const dayText = dayLabel(entry, t);
  const date = formatLocaleDate(entry.unlockEpoch);
  const unreached = closed && entry.status === 'upcoming';
  const dateText = unreached
    ? ''
    : entry.status === 'upcoming'
      ? t('journal.expectedOn', { date })
      : t('journal.unlockedOn', { date });
  const statusLabel = unreached ? t('journal.notReached') : t(statusKey(entry.status));
  const meta = entry.status === 'active' ? `${statusLabel} · ${dateText}` : dateText || statusLabel;
  const line = hexToRgba(palette.text, 0.18);
  const lineTop = index === 0 ? DOT_CENTER : 0;
  const lineHeight = last ? (index === 0 ? 0 : DOT_CENTER) : undefined;

  return (
    <View
      style={[
        styles.entry,
        !last ? { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
        entry.status === 'active' ? { backgroundColor: hexToRgba(palette.action, 0.07) } : null,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[dayText, entry.title, statusLabel, dateText].filter((part) => part.length > 0).join('. ')}
        accessibilityHint={openable ? undefined : tooltipFor(entry, t, closed)}
        accessibilityState={{ selected: entry.status === 'active' }}
        onPress={onPress}
        style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.72 : 1 }]}>
        <View
          style={[
            styles.accent,
            { backgroundColor: entry.status === 'active' ? palette.action : 'transparent' },
          ]}
        />
        <View style={styles.hitBody}>
          <View style={styles.dayCol}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              maxFontSizeMultiplier={1.3}
              style={[
                styles.dayNum,
                {
                  color: entry.status === 'upcoming' ? palette.textMuted : palette.text,
                  fontFamily: Fonts?.serif,
                },
              ]}>
              {formatBiologicalDay(entry.postHatchDay ?? entry.day)}
            </Text>
          </View>
          <View style={styles.rail}>
            <View
              style={[
                styles.line,
                {
                  backgroundColor: line,
                  top: lineTop,
                  height: lineHeight,
                  bottom: last ? undefined : 0,
                },
              ]}
            />
            <View style={styles.dotWrap}>
              {entry.status === 'active' ? (
                <PulsingHalo color={palette.action} reduceMotion={reduceMotion} />
              ) : null}
              <View style={[styles.dot, dotStyle(entry.status, palette)]} />
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.entryTitle, { color: palette.text, fontFamily: Fonts?.serif }]}>{entry.title}</Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>{meta}</Text>
          </View>
        </View>
      </Pressable>
      {hinted ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.hint, { color: palette.textMuted, fontFamily: Fonts?.serif }]}>
          {tooltipFor(entry, t, closed)}
        </Text>
      ) : null}
    </View>
  );
}

const DOT_CENTER = 18;

function PulsingHalo({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0.35);

  useEffect(() => {
    cancelAnimation(opacity);
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.halo, { backgroundColor: hexToRgba(color, 0.28) }, animated]}
    />
  );
}

function dotStyle(status: JournalMilestoneStatus, palette: NestPaletteTokens) {
  if (status === 'completed') {
    return { backgroundColor: palette.optimal, borderWidth: 0 };
  }
  if (status === 'active') {
    return { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.action, borderWidth: 0 };
  }
  return {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
  };
}

function statusKey(status: JournalMilestoneStatus): TranslationKey {
  if (status === 'completed') {
    return 'journal.completed';
  }
  if (status === 'active') {
    return 'journal.inProgress';
  }
  return 'journal.upcoming';
}

function dayLabel(entry: JournalMilestone, t: TranslateFn): string {
  if (entry.postHatchDay == null) {
    return t('journal.day', { day: formatBiologicalDay(entry.day) });
  }
  return t('journal.postHatchDay', { day: formatBiologicalDay(entry.postHatchDay) });
}

function tooltipFor(entry: JournalMilestone, t: TranslateFn, closed: boolean): string {
  if (closed && entry.status === 'upcoming') {
    return t('journal.closedHint');
  }
  const date = formatLocaleDate(entry.unlockEpoch);
  if (entry.postHatchDay == null) {
    return t('journal.lockedTooltip', { day: formatBiologicalDay(entry.day), date });
  }
  return t('journal.lockedTooltipPost', {
    day: formatBiologicalDay(entry.postHatchDay),
    date,
  });
}

const styles = StyleSheet.create({
  chapters: {
    gap: Spacing.four,
  },
  chapter: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  entry: {
    backgroundColor: 'transparent',
  },
  hit: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
  },
  accent: {
    width: 3,
  },
  hitBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: Spacing.three,
    paddingBottom: 12,
  },
  dayCol: {
    width: 58,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  dayNum: {
    width: '100%',
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rail: {
    width: 18,
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    width: 1.5,
    left: 8.25,
  },
  dotWrap: {
    marginTop: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    paddingTop: 7,
    gap: 2,
  },
  entryTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
