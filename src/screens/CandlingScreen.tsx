import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
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

import { CandlingView } from '@/components/CandlingView';
import { Spacing } from '@/constants/theme';
import { useActivePet } from '@/hooks/useActivePet';
import { heartbeatIntervalMs } from '@/hooks/hapticHeartbeat';
import { useCandlingTouch, type CandlingLightMode } from '@/hooks/useCandlingTouch';
import { useHapticHeartbeat } from '@/hooks/useHapticHeartbeat';

const CHAMBER = '#070504';
const CHAMBER_PANEL = '#120E0B';
const GOLD = '#E0C48A';
const PAPER = '#F4EDE3';
const MUTED = '#B4A89C';

export default function CandlingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pet, species, snapshot, hasHydrated, isClockTampered } = useActivePet();
  const [lightMode, setLightMode] = useState<CandlingLightMode>('manual');

  const touch = useCandlingTouch({
    mode: lightMode,
    onTouchBegin: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const bpm = snapshot?.currentHeartRate ?? 0;
  const candlingActive = Boolean(snapshot) && touch.isIlluminated && bpm > 0;

  useHapticHeartbeat({
    bpm,
    active: candlingActive,
    pulseImmediately: lightMode === 'fixed',
  });

  const goToNest = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  if (!hasHydrated) {
    return <View style={styles.flex} />;
  }

  if (!pet || !species || !snapshot) {
    return <Redirect href="/" />;
  }

  const heartLabel = bpm > 0 ? `${bpm} BPM` : 'kein Puls';

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zurück zum Nest"
          onPress={goToNest}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Nest</Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.nickname} numberOfLines={1}>
            {pet.nickname}
          </Text>
          <Text style={styles.milestone} numberOfLines={2}>
            {snapshot.currentMilestone.title}
          </Text>
        </View>

        <HeartbeatBadge bpm={bpm} active={candlingActive} label={heartLabel} />
      </View>

      {isClockTampered ? (
        <View accessibilityRole="alert" style={styles.banner}>
          <Text style={styles.bannerTitle}>Biologische Zeit angehalten</Text>
          <Text style={styles.bannerBody}>
            Die Gerätezeit liegt hinter dem letzten verifizierten Zeitstempel. Das Wachstum bleibt
            eingefroren, bis die reale Zeit aufholt.
          </Text>
        </View>
      ) : null}

      <CandlingView
        snapshot={snapshot}
        species={species}
        lightX={touch.lightX}
        lightY={touch.lightY}
        isLightActive={touch.isIlluminated}
        glow={touch.glow}
        eggCx={touch.eggCx}
        eggCy={touch.eggCy}
        eggRx={touch.eggRx}
        eggRy={touch.eggRy}
        layout={touch.layout}
        gesture={touch.gesture}
        onLayout={touch.handleLayout}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View style={styles.modeRow}>
          <ModeChip
            label="Fingerlicht"
            selected={lightMode === 'manual'}
            onPress={() => setLightMode('manual')}
          />
          <ModeChip
            label="Hintergrundlicht"
            selected={lightMode === 'fixed'}
            onPress={() => setLightMode('fixed')}
          />
        </View>
        <Text style={styles.labKicker}>Labor-Notiz</Text>
        <Text style={styles.labBody}>{snapshot.currentMilestone.scientificSummary}</Text>
        <Text style={styles.hint}>
          {lightMode === 'fixed'
            ? 'Fixiertes Licht im Eizentrum. Der Puls folgt der embryonalen Herzfrequenz.'
            : touch.isIlluminated
              ? 'Lichtkegel folgt dem Finger. Loslassen dunkelt die Kammer wieder ab.'
              : 'Finger auf das Ei legen, um Schale und Embryo zu durchleuchten.'}
        </Text>
      </View>
    </View>
  );
}

function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipIdle,
        { opacity: pressed ? 0.82 : 1 },
      ]}>
      <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : styles.chipLabelIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

function HeartbeatBadge({
  bpm,
  active,
  label,
}: {
  bpm: number;
  active: boolean;
  label: string;
}) {
  const pulse = useSharedValue(1);
  const intervalMs = useMemo(() => heartbeatIntervalMs(bpm), [bpm]);

  useEffect(() => {
    if (!active || intervalMs == null) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    const attack = Math.min(90, intervalMs * 0.22);
    const release = Math.min(160, intervalMs * 0.3);
    const rest = Math.max(40, intervalMs - attack - release);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: attack, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: release, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: rest })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [active, intervalMs, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.55 + (pulse.value - 1) * 1.4,
  }));

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Herzfrequenz ${label}`}
      style={styles.bpmBadge}>
      <Animated.View style={[styles.bpmDot, !active || bpm <= 0 ? styles.bpmDotIdle : null, dotStyle]} />
      <Text style={styles.bpmLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: CHAMBER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingRight: Spacing.two,
  },
  backChevron: {
    color: GOLD,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    color: PAPER,
    fontSize: 18,
    fontWeight: '700',
  },
  milestone: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  bpmBadge: {
    minHeight: 44,
    minWidth: 86,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A322B',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#14100C',
  },
  bpmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E06060',
  },
  bpmDotIdle: {
    backgroundColor: '#6A5A52',
  },
  bpmLabel: {
    color: PAPER,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  banner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6A4A22',
    backgroundColor: '#2A1C10',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 4,
  },
  bannerTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
  },
  bannerBody: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: CHAMBER_PANEL,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2420',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#C4783A',
    borderColor: '#C4783A',
  },
  chipIdle: {
    backgroundColor: 'transparent',
    borderColor: '#3A322B',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipLabelSelected: {
    color: '#1A1410',
  },
  chipLabelIdle: {
    color: MUTED,
  },
  labKicker: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  labBody: {
    color: PAPER,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  hint: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
