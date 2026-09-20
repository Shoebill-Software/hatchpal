import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EggContainer, type EggContainerHandle } from '@/components/EggContainer';
import { MetricCard } from '@/components/MetricCard';
import { useNestPalette } from '@/constants/nest';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useActivePet } from '@/hooks/useActivePet';
import { canTurnEgg, speciesRequiresTurning, turnCareStatus } from '@/utils/eggCare';
import { formatElapsedAgo } from '@/utils/formatRelativeTime';

export default function NestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const eggRef = useRef<EggContainerHandle>(null);
  const { pet, species, snapshot, isClockTampered, hasHydrated, nowEpoch, recordInteraction } =
    useActivePet();

  if (!hasHydrated) {
    return <View style={[styles.flex, { backgroundColor: palette.background }]} />;
  }

  if (!pet || !species || !snapshot) {
    return (
      <View
        style={[
          styles.flex,
          styles.center,
          {
            backgroundColor: palette.background,
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
            paddingHorizontal: Spacing.four,
          },
        ]}>
        <Text style={[styles.emptyKicker, { color: palette.textMuted }]}>HatchPal</Text>
        <Text style={[styles.emptyTitle, { color: palette.text }]}>Your nest is empty</Text>
        <Text style={[styles.emptyBody, { color: palette.textMuted }]}>
          Adopt a starter egg to follow incubation, turning, and nest climate in genuine 1:1 real
          time — nothing here requires a network connection.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/adopt')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
          ]}>
          <Text style={[styles.primaryButtonLabel, { color: palette.actionText }]}>Adopt an egg</Text>
        </Pressable>
      </View>
    );
  }

  const incubationDay = Math.min(snapshot.ageDays, species.incubationDays);
  const progressPct = Math.round(snapshot.progress * 100);
  const turningAllowed = canTurnEgg(snapshot, species);
  const showTurnAction = speciesRequiresTurning(species);
  const heartDetected = snapshot.currentHeartRate > 0;
  const turnStatus = turnCareStatus(pet.lastTurnedEpoch, nowEpoch, turningAllowed);
  const elapsedSinceTurn = formatElapsedAgo(pet.lastTurnedEpoch, nowEpoch);
  const turnSubtitle = !turningAllowed
    ? pet.isHatched
      ? 'Hatch complete'
      : `Lockdown · day ${species.turningRequiredUntilDay}+`
    : turnStatus === 'warning'
      ? `Due · last turn ${elapsedSinceTurn}`
      : `Last turn ${elapsedSinceTurn}`;

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
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
            <Text style={[styles.bannerTitle, { color: palette.bannerText }]}>
              Biological time paused
            </Text>
            <Text style={[styles.bannerBody, { color: palette.bannerText }]}>
              The device clock is behind the last verified timestamp. Growth stays frozen — nothing
              is lost — until real-world time catches up.
            </Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={[styles.nickname, { color: palette.text }]}>{pet.nickname}</Text>
          <Text style={[styles.scientific, { color: palette.textMuted }]}>
            {species.scientificName}
          </Text>
          <Text style={[styles.milestone, { color: palette.text }]}>
            {snapshot.currentMilestone.title}
          </Text>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progressPct }}
            accessibilityLabel={`Incubation ${progressPct} percent complete`}
            style={[styles.progressTrack, { backgroundColor: palette.progressTrack }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%`, backgroundColor: palette.progressFill },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: palette.textMuted }]}>
            Incubation {progressPct}%
          </Text>
        </View>

        <EggContainer
          ref={eggRef}
          snapshot={snapshot}
          species={species}
          healthMultiplier={pet.healthMultiplier}
          onTurnEgg={() => {
            recordInteraction('turn_egg');
          }}
        />

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <MetricCard
              label="Incubation Day"
              value={`Day ${incubationDay} of ${species.incubationDays}`}
              status={snapshot.isReadyToHatch ? 'optimal' : isClockTampered ? 'warning' : 'optimal'}
            />
            <MetricCard
              label="Embryo Heart Rate"
              value={heartDetected ? snapshot.currentHeartRate : 'None detected'}
              unit={heartDetected ? 'BPM' : undefined}
              status={heartDetected ? 'optimal' : 'neutral'}
            />
          </View>
          <View style={styles.gridRow}>
            <MetricCard
              label="Nest Temperature"
              value={species.temperatureTargetCelsius.toFixed(1)}
              unit="°C"
              status="optimal"
            />
            <MetricCard
              label="Relative Humidity"
              value={species.humidityTargetPct}
              unit="%"
              status="optimal"
            />
          </View>
        </View>

        <View style={styles.actions}>
          {showTurnAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !turningAllowed }}
              accessibilityHint={turnSubtitle}
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
                Turn Egg
              </Text>
              <Text
                style={[
                  styles.actionMeta,
                  { color: turningAllowed ? palette.actionText : palette.actionDisabledText },
                ]}>
                {turnSubtitle}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                recordInteraction('mist_nest');
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.secondaryAction, opacity: pressed ? 0.88 : 1 },
              ]}>
              <Text style={[styles.actionLabel, { color: palette.actionText }]}>Mist Nest</Text>
              <Text style={[styles.actionMeta, { color: palette.actionText }]}>
                Last mist {formatElapsedAgo(pet.lastMistedEpoch, nowEpoch)}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ei durchleuchten"
            accessibilityHint="Öffnet die Durchleuchtungskammer"
            onPress={() => router.push('/candling')}
            style={({ pressed }) => [
              styles.candlingButton,
              { borderColor: palette.border, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Text style={[styles.candlingLabel, { color: palette.text }]}>Ei durchleuchten</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
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
  header: {
    gap: 6,
  },
  nickname: {
    fontSize: 32,
    lineHeight: 38,
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
    fontWeight: '700',
  },
  bannerBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
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
