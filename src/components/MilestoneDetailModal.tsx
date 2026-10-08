import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MilestoneDiagram } from '@/components/MilestoneDiagram';
import { hexToRgba, useNestPalette } from '@/constants/nest';
import { Fonts, Spacing } from '@/constants/theme';
import type { JournalMilestone } from '@/domain/milestones';
import type { AudioMilestoneTrigger, CandlingFeatures, DevelopmentStage, SpeciesId } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { formatBiologicalDay, formatWholePercent, useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import type { SoundEffectId } from '@/services/soundCues';

export interface MilestoneDetailModalProps {
  milestone: JournalMilestone | null;
  speciesId: SpeciesId;
  visible: boolean;
  onClose: () => void;
}

export function MilestoneDetailModal({ milestone, speciesId, visible, onClose }: MilestoneDetailModalProps) {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const { play } = useSoundEffects();

  const soundId = milestone ? soundForTrigger(milestone.audioTrigger) : null;
  const dayText =
    milestone == null
      ? ''
      : milestone.postHatchDay == null
        ? t('journal.day', { day: formatBiologicalDay(milestone.day) })
        : t('journal.postHatchDay', { day: formatBiologicalDay(milestone.postHatchDay) });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('journal.close')}
          onPress={onClose}
          style={styles.dismiss}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: palette.background,
              maxHeight: height * 0.92,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
          {milestone ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              bounces>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={[styles.day, { color: palette.textMuted }]}>{dayText}</Text>
                  <View style={[styles.phase, { backgroundColor: hexToRgba(palette.action, 0.12) }]}>
                    <Text style={[styles.phaseLabel, { color: palette.action }]}>
                      {t(phaseKey(milestone.stage))}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('journal.close')}
                  hitSlop={8}
                  onPress={onClose}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[styles.close, { color: palette.action }]}>{t('journal.close')}</Text>
                </Pressable>
              </View>

              <Text style={[styles.title, { color: palette.text }]}>
                {milestone.title}
              </Text>

              <MilestoneDiagram
                stage={milestone.stage}
                candling={milestone.candling}
                speciesId={speciesId}
                duringIncubation={milestone.duringIncubation}
              />
              <Text style={[styles.diagramCaption, { color: palette.textMuted }]}>{t('journal.diagram')}</Text>

              <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
                {t('journal.scientificObservation')}
              </Text>
              <Text selectable style={[styles.body, { color: palette.text, fontFamily: Fonts.serif }]}>
                {milestone.scientificSummary}
              </Text>

              {milestone.duringIncubation && milestone.candling ? (
                <CandlingReadout candling={milestone.candling} />
              ) : null}

              {soundId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('journal.replaySound')}
                  onPress={() => {
                    void triggerImpact(ImpactFeedbackStyle.Light);
                    play(soundId);
                  }}
                  style={({ pressed }) => [
                    styles.soundButton,
                    { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
                  ]}>
                  <Text style={[styles.soundLabel, { color: palette.actionText }]}>{t('journal.replaySound')}</Text>
                </Pressable>
              ) : (
                <Text style={[styles.noSample, { color: palette.textMuted }]}>{t('journal.noSample')}</Text>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function CandlingReadout({ candling }: { candling: CandlingFeatures }) {
  const palette = useNestPalette();
  const { t } = useTranslation();

  const rows: ReadonlyArray<{ label: string; value: string }> = [
    {
      label: t('journal.vessels'),
      value: candling.bloodVesselsVisible ? t('journal.vesselsYes') : t('journal.vesselsNo'),
    },
    {
      label: t('journal.eyePigment'),
      value: candling.eyeSpotVisible ? t('journal.eyeYes') : t('journal.eyeNo'),
    },
    {
      label: t('journal.silhouette'),
      value: t('journal.percentValue', { percent: formatWholePercent(candling.embryoSilhouettePct) }),
    },
    {
      label: t('journal.airCell'),
      value: t('journal.percentValue', { percent: formatWholePercent(candling.airCellPct) }),
    },
    {
      label: t('journal.movement'),
      value: candling.movementDetectable ? t('journal.movementYes') : t('journal.movementNo'),
    },
  ];

  return (
    <View style={styles.readout}>
      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('journal.candlingReadout')}</Text>
      {rows.map((row) => (
        <View
          key={row.label}
          style={[styles.readoutRow, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.readoutLabel, { color: palette.textMuted }]}>{row.label}</Text>
          <Text style={[styles.readoutValue, { color: palette.text }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function phaseKey(stage: DevelopmentStage): TranslationKey {
  switch (stage) {
    case 'cleavage':
      return 'journal.phase.cleavage';
    case 'vascular':
      return 'journal.phase.vascular';
    case 'organogenesis':
      return 'journal.phase.organogenesis';
    case 'internal_pip':
      return 'journal.phase.internal_pip';
    case 'external_pip':
      return 'journal.phase.external_pip';
    case 'hatchling':
      return 'journal.phase.hatchling';
    case 'juvenile':
      return 'journal.phase.juvenile';
    case 'adult':
      return 'journal.phase.adult';
    default: {
      const unreachable: never = stage;
      return unreachable;
    }
  }
}

function soundForTrigger(trigger: AudioMilestoneTrigger): SoundEffectId | null {
  switch (trigger) {
    case 'heartbeat':
      return 'heartbeat';
    case 'embryo_movement':
      return 'tap';
    case 'internal_chirp':
      return 'internal_peep';
    case 'shell_pip':
      return 'shell_crack';
    case 'hatch_call':
      return 'hatch_call';
    case 'silent':
      return null;
    default: {
      const unreachable: never = trigger;
      return unreachable;
    }
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 16, 12, 0.46)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.two,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  day: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  phase: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    fontSize: 15,
    fontWeight: '700',
    paddingTop: 2,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  diagramCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.one,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  readout: {
    gap: 8,
  },
  readoutRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  readoutLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  readoutValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  soundButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  soundLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  noSample: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: Spacing.one,
  },
});
