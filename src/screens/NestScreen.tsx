import { useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChangeEggDialog } from '@/components/ChangeEggDialog';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsModal } from '@/components/SettingsModal';
import { EggContainer, type EggContainerHandle } from '@/components/EggContainer';
import { HatchingCeremony } from '@/components/HatchingCeremony';
import { HatchlingContainer } from '@/components/HatchlingContainer';
import { MetricCard } from '@/components/MetricCard';
import { useNestPalette } from '@/constants/nest';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { resolveHatchEpoch } from '@/domain/timeEngine';
import { useActivePet } from '@/hooks/useActivePet';
import { useNestPipAudio } from '@/hooks/useSoundEffects';
import {
  formatAgo,
  formatBiologicalWeight,
  formatCarePhrase,
  formatLocaleDate,
  formatPostHatchAge,
  formatTurnPhrase,
  getElapsedSpan,
  lifeStageBadgeKey,
  lifeStageLabelKey,
  localizeCopy,
  useTranslation,
} from '@/i18n';
import type { TranslateFn } from '@/i18n/translate';
import type { BiologicalWeight } from '@/i18n/format';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import { canTurnEgg, speciesRequiresTurning } from '@/utils/eggCare';

export default function NestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { t, locale } = useTranslation();
  const eggRef = useRef<EggContainerHandle>(null);
  const [changeEggVisible, setChangeEggVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const {
    pet,
    species,
    snapshot,
    isClockTampered,
    hasHydrated,
    nowEpoch,
    abandonActivePet,
    recordInteraction,
    markHatched,
  } = useActivePet();
  useNestPipAudio(Boolean(snapshot?.isPipped), snapshot?.currentMilestone.stage ?? null);

  if (!hasHydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
      </View>
    );
  }

  if (!pet || !species || !snapshot) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <NestStatusBar />
        <NestTopBar onOpenSettings={() => setSettingsVisible(true)} />
        <View
          style={[
            styles.flex,
            styles.center,
            {
              paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
              paddingHorizontal: Spacing.four,
            },
          ]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>{t('nest.emptyTitle')}</Text>
          <Text style={[styles.emptyBody, { color: palette.textMuted }]}>{t('nest.emptyBody')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/adopt')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
            ]}>
            <Text style={[styles.primaryButtonLabel, { color: palette.actionText }]}>{t('nest.adoptEgg')}</Text>
          </Pressable>
        </View>
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </View>
    );
  }

  const hatched = pet.isHatched;
  const incubationDay = Math.min(snapshot.ageDays, species.incubationDays);
  const progressPct = Math.round((hatched ? snapshot.maturationProgress : snapshot.progress) * 100);
  const turningAllowed = canTurnEgg(snapshot, species);
  const showTurnAction = speciesRequiresTurning(species);
  const heartDetected = snapshot.currentHeartRate > 0;
  const hasTurned = pet.lastTurnedEpoch > pet.laidAtEpoch;
  const turnSpan = getElapsedSpan(pet.lastTurnedEpoch, nowEpoch);
  const turnPhrase = !turningAllowed ? t('turn.lockdown') : formatTurnPhrase(hasTurned, turnSpan, t);
  const badgeLabel = !showTurnAction
    ? t('turn.noTurningBadge')
    : !turningAllowed
      ? t('turn.lockdownBadge')
      : null;
  const eggHint = !showTurnAction ? t('turn.noTurningHint') : turnPhrase;
  const commonName = localizeCopy(species.commonName, locale);
  const stageLabel = t(lifeStageLabelKey(snapshot.lifeStage));
  const milestoneTitle = hatched ? stageLabel : localizeCopy(snapshot.currentMilestone.title, locale);
  const hatchLabel = formatLocaleDate(resolveHatchEpoch(pet, species), locale);
  const mistSpan = getElapsedSpan(pet.lastMistedEpoch, nowEpoch);
  const incubationStatus = snapshot.isReadyToHatch ? 'optimal' : isClockTampered ? 'warning' : 'optimal';
  const weight = formatBiologicalWeight(snapshot.currentWeightGrams, locale);
  const hatchMass = formatBiologicalWeight(species.hatchWeightGrams, locale);
  const adultMass = formatBiologicalWeight(species.adultWeightGrams, locale);
  const weightUnit = t(weight.unit === 'kg' ? 'weight.kilograms' : 'weight.grams');
  const daysLeft = snapshot.daysUntilAdult;
  const fedPhrase = formatCarePhrase(
    'feed',
    pet.lastFedEpoch != null,
    getElapsedSpan(pet.lastFedEpoch ?? nowEpoch, nowEpoch),
    t
  );
  const weighPhrase = formatCarePhrase(
    'weigh',
    pet.lastWeighedEpoch != null,
    getElapsedSpan(pet.lastWeighedEpoch ?? nowEpoch, nowEpoch),
    t
  );
  const changeLabel = hatched ? t('nest.changeCompanion') : t('nest.changeEgg');

  const confirmChangeEgg = () => {
    setChangeEggVisible(false);
    abandonActivePet();
    router.push({ pathname: '/adopt', params: { replacing: '1' } });
  };

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <NestStatusBar />
      <NestTopBar onOpenSettings={() => setSettingsVisible(true)} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.two,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {isClockTampered ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.banner,
              { backgroundColor: palette.banner, borderColor: palette.bannerBorder },
            ]}>
            <Text style={[styles.bannerTitle, { color: palette.bannerText }]}>{t('clock.paused')}</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.nickname, { color: palette.text }]}>{pet.nickname}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={changeLabel}
              onPress={() => setChangeEggVisible(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.changeEggButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.changeEggLabel, { color: palette.textMuted }]}>{changeLabel}</Text>
            </Pressable>
          </View>
          <Text style={[styles.scientific, { color: palette.textMuted }]}>{species.scientificName}</Text>
          <Text style={[styles.milestone, { color: palette.text }]}>{milestoneTitle}</Text>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progressPct }}
            accessibilityLabel={
              hatched
                ? t('nest.maturationA11y', { percent: progressPct })
                : t('nest.incubationA11y', { percent: progressPct })
            }
            style={[styles.progressTrack, { backgroundColor: palette.progressTrack }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%`, backgroundColor: palette.progressFill },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: palette.textMuted }]}>
            {hatched
              ? t('nest.maturationPercent', { percent: progressPct })
              : t('nest.incubationPercent', { percent: progressPct })}
          </Text>
        </View>

        {hatched ? (
          <HatchlingContainer
            speciesId={species.id}
            maturationProgress={snapshot.maturationProgress}
            accessibilityLabel={t('hatchling.a11y', { name: pet.nickname, stage: stageLabel })}
            hint={t('care.chirpHint')}
            scaleLabel={t('care.growthScale', {
              hatch: massLabel(hatchMass, t),
              adult: massLabel(adultMass, t),
            })}
            onPet={() => {
              recordInteraction('pet');
            }}
          />
        ) : (
          <EggContainer
            ref={eggRef}
            snapshot={snapshot}
            species={species}
            healthMultiplier={pet.healthMultiplier}
            canTurn={turningAllowed}
            hint={eggHint}
            badgeLabel={badgeLabel}
            accessibilityLabel={t('egg.a11y', { name: commonName, status: eggHint })}
            accessibilityHint={turningAllowed ? t('turn.tapHint') : t('turn.lockedHint')}
            onTurnEgg={() => {
              recordInteraction('turn_egg');
            }}
          />
        )}

        {hatched ? (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <MetricCard
                label={t('metric.age')}
                value={formatPostHatchAge(snapshot.postHatchAgeDays, t)}
                status="optimal"
              />
              <MetricCard
                label={t('metric.currentWeight')}
                value={weight.value}
                unit={weightUnit}
                status="optimal"
              />
            </View>
            <View style={styles.gridRow}>
              <MetricCard
                label={t('metric.lifeStage')}
                value={stageLabel}
                badgeLabel={t(lifeStageBadgeKey(snapshot.lifeStage))}
                status={snapshot.lifeStage === 'adult' ? 'optimal' : 'neutral'}
              />
              <MetricCard
                label={t('metric.daysToMaturity')}
                value={daysLeft === 0 ? t('metric.mature') : daysLeft}
                unit={daysLeft === 0 ? undefined : t(daysLeft === 1 ? 'metric.dayUnit' : 'metric.daysUnit')}
                status={daysLeft === 0 ? 'optimal' : 'neutral'}
              />
            </View>
          </View>
        ) : (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <MetricCard
                label={t('metric.incubationDay')}
                value={t('metric.dayOf', { day: incubationDay, total: species.incubationDays })}
                status={incubationStatus}
              />
              <MetricCard
                label={t('metric.heartRate')}
                value={heartDetected ? snapshot.currentHeartRate : t('metric.undetected')}
                unit={heartDetected ? t('common.bpm') : undefined}
                status={heartDetected ? 'optimal' : 'neutral'}
              />
            </View>
            <View style={styles.gridRow}>
              <MetricCard
                label={t('metric.temperature')}
                value={species.temperatureTargetCelsius.toFixed(1)}
                unit="°C"
                status="optimal"
              />
              <MetricCard
                label={t('metric.humidity')}
                value={species.humidityTargetPct}
                unit="%"
                status="optimal"
              />
            </View>
            <MetricCard
              label={t('metric.estimatedHatch')}
              value={hatchLabel}
              status={snapshot.isReadyToHatch ? 'optimal' : 'neutral'}
            />
          </View>
        )}

        <View style={styles.actions}>
          {hatched ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={fedPhrase}
                onPress={() => {
                  recordInteraction('feed');
                  void triggerImpact(ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1 },
                ]}>
                <Text style={[styles.actionLabel, { color: palette.actionText }]}>{t('care.feed')}</Text>
                <Text style={[styles.actionMeta, { color: palette.actionText }]}>{fedPhrase}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={weighPhrase}
                onPress={() => {
                  recordInteraction('weigh');
                  void triggerImpact(ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: palette.secondaryAction, opacity: pressed ? 0.88 : 1 },
                ]}>
                <Text style={[styles.actionLabel, { color: palette.actionText }]}>{t('care.weigh')}</Text>
                <Text style={[styles.actionMeta, { color: palette.actionText }]}>{weighPhrase}</Text>
              </Pressable>
            </>
          ) : showTurnAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !turningAllowed }}
              accessibilityHint={turnPhrase}
              disabled={!turningAllowed}
              onPress={() => eggRef.current?.turn()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: turningAllowed ? palette.action : palette.actionDisabled,
                  opacity: pressed && turningAllowed ? 0.88 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.actionLabel,
                  { color: turningAllowed ? palette.actionText : palette.actionDisabledText },
                ]}>
                {t('turn.action')}
              </Text>
              <Text
                style={[
                  styles.actionMeta,
                  { color: turningAllowed ? palette.actionText : palette.actionDisabledText },
                ]}>
                {turnPhrase}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                recordInteraction('mist_nest');
                void triggerImpact(ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.secondaryAction, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.actionLabel, { color: palette.actionText }]}>{t('nest.mistNest')}</Text>
              <Text style={[styles.actionMeta, { color: palette.actionText }]}>
                {t('nest.lastMist', { time: formatAgo(mistSpan, t) })}
              </Text>
            </Pressable>
          )}

          {hatched ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('nest.candleEgg')}
              accessibilityHint={t('nest.candleHint')}
              onPress={() => router.push('/candling')}
              style={({ pressed }) => [
                styles.candlingButton,
                { borderColor: palette.border, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Text style={[styles.candlingLabel, { color: palette.text }]}>{t('nest.candleEgg')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <HatchingCeremony
        visible={snapshot.isReadyToHatch && !pet.isHatched}
        nickname={pet.nickname}
        speciesId={species.id}
        onComplete={() => {
          markHatched();
        }}
      />

      <ChangeEggDialog
        visible={changeEggVisible}
        onKeepCurrent={() => setChangeEggVisible(false)}
        onConfirm={confirmChangeEgg}
      />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

function NestTopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
      <Text style={[styles.emptyKicker, { color: palette.textMuted }]}>{t('common.hatchpal')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.open')}
        onPress={onOpenSettings}
        hitSlop={8}
        style={({ pressed }) => [
          styles.settingsButton,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            opacity: pressed ? 0.72 : 1,
          },
        ]}>
        <SymbolView
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={20}
          tintColor={palette.text}
          fallback={<Text style={[styles.settingsGlyph, { color: palette.text }]}>⚙</Text>}
        />
      </Pressable>
    </View>
  );
}

function massLabel(weight: BiologicalWeight, translate: TranslateFn): string {
  const unit = translate(weight.unit === 'kg' ? 'weight.kilograms' : 'weight.grams');
  return `${weight.value} ${unit}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  header: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nickname: {
    flex: 1,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  changeEggButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
  },
  changeEggLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  milestone: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: Spacing.two,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    gap: Spacing.two,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionMeta: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.88,
  },
  candlingButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candlingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 220,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyKicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
});
