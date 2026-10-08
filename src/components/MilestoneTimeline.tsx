import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { formatBiologicalDay, formatLocaleDate, useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import type { TranslationKey } from '@/i18n/en';
import type { TranslateFn } from '@/i18n/translate';

export interface MilestoneTimelineProps {
  milestones: readonly JournalMilestone[];
  onSelect: (milestone: JournalMilestone) => void;
}

export function MilestoneTimeline({ milestones, onSelect }: MilestoneTimelineProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const [hintId, setHintId] = useState<string | null>(null);
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: palette.text }]}>{t('journal.timeline')}</Text>
      {milestones.map((entry, index) => {
        const next = milestones[index + 1];
        const topColor = entry.status === 'upcoming' ? palette.border : palette.optimal;
        const bottomColor = !next || next.status === 'upcoming' ? palette.border : palette.optimal;
        const statusLabel = t(statusKey(entry.status));
        const dayText = dayLabel(entry, t);
        const date = formatLocaleDate(entry.unlockEpoch);
        const dateText =
          entry.status === 'upcoming' ? t('journal.expectedOn', { date }) : t('journal.unlockedOn', { date });
        const title = entry.title;
        const tooltip = tooltipFor(entry, t);
        const openable = entry.status !== 'upcoming';

        return (
          <View key={entry.id} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.stem,
                  { backgroundColor: index === 0 ? 'transparent' : topColor },
                ]}
              />
              <View style={styles.nodeSlot}>
                {entry.status === 'active' ? (
                  <PulsingHalo color={palette.action} reduceMotion={reduceMotion} />
                ) : null}
                <View
                  style={[
                    styles.node,
                    entry.status === 'completed'
                      ? { backgroundColor: palette.optimal }
                      : entry.status === 'active'
                        ? { backgroundColor: palette.action }
                        : {
                            backgroundColor: palette.surface,
                            borderWidth: 1.5,
                            borderColor: palette.border,
                          },
                  ]}>
                  {entry.status === 'completed' ? (
                    <Text style={[styles.check, { color: palette.actionText }]}>✓</Text>
                  ) : null}
                </View>
              </View>
              <View
                style={[
                  styles.stem,
                  styles.stemFlex,
                  { backgroundColor: index === milestones.length - 1 ? 'transparent' : bottomColor },
                ]}
              />
            </View>

            <View style={styles.cardColumn}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${dayText}. ${title}. ${statusLabel}. ${dateText}`}
                accessibilityHint={openable ? undefined : tooltip}
                accessibilityState={{ selected: entry.status === 'active' }}
                onPress={() => {
                  if (!openable) {
                    setHintId(entry.id);
                    return;
                  }
                  setHintId(null);
                  void triggerImpact(ImpactFeedbackStyle.Light);
                  onSelect(entry);
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor:
                      entry.status === 'active' ? hexToRgba(palette.action, 0.1) : palette.surface,
                    borderColor: entry.status === 'active' ? palette.action : palette.border,
                    opacity: entry.status === 'upcoming' ? 0.72 : pressed ? 0.9 : 1,
                  },
                ]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.day, { color: palette.textMuted }]}>{dayText}</Text>
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: hexToRgba(statusColor(entry.status, palette), 0.14) },
                    ]}>
                    <Text style={[styles.pillLabel, { color: statusColor(entry.status, palette) }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
                <Text style={[styles.date, { color: palette.textMuted }]}>{dateText}</Text>
              </Pressable>
              {hintId === entry.id ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.hint, { color: palette.textMuted, fontFamily: Fonts.serif }]}>
                  {tooltip}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

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

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function statusColor(status: JournalMilestoneStatus, palette: NestPaletteTokens): string {
  if (status === 'completed') {
    return palette.optimal;
  }
  if (status === 'active') {
    return palette.action;
  }
  return palette.neutral;
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

function tooltipFor(entry: JournalMilestone, t: TranslateFn): string {
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
  section: {
    gap: 0,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rail: {
    width: 28,
    alignItems: 'center',
  },
  stem: {
    width: 2,
    height: 12,
  },
  stemFlex: {
    flex: 1,
    height: undefined,
    minHeight: 12,
  },
  nodeSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  node: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  cardColumn: {
    flex: 1,
    paddingBottom: Spacing.two,
    gap: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  day: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
});
