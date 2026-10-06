import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { NestStatusBar } from '@/components/NestStatusBar';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import { Spacing } from '@/constants/theme';
import { useActivePet } from '@/hooks/useActivePet';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { localizeCopy, useTranslation } from '@/i18n';
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
  const { t, locale } = useTranslation();
  const { pet, species, snapshot, hasHydrated, isClockTampered } = useActivePet();
  const [lightMode, setLightMode] = useState<CandlingLightMode>('manual');

  const touch = useCandlingTouch({
    mode: lightMode,
    onTouchBegin: () => {
      void triggerImpact(ImpactFeedbackStyle.Light);
    },
  });

  const bpm = snapshot?.currentHeartRate ?? 0;
  const candlingActive = Boolean(snapshot) && touch.isIlluminated && bpm > 0;
  const { play } = useSoundEffects();
  const playHeartbeat = useCallback(() => {
    play('heartbeat');
  }, [play]);

  useHapticHeartbeat({
    bpm,
    active: candlingActive,
    pulseImmediately: lightMode === 'fixed',
    onPulse: playHeartbeat,
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

  if (!pet || !species || !snapshot || pet.isHatched) {
    return <Redirect href="/" />;
  }

  const heartLabel = bpm > 0 ? `${bpm} ${t('common.bpm')}` : t('metric.undetected');
  const milestoneTitle = localizeCopy(snapshot.currentMilestone.title, locale);
  const summary = localizeCopy(snapshot.currentMilestone.scientificSummary, locale);
  const lightModeLabel = lightMode === 'fixed' ? t('candling.backlight') : t('candling.fingerLight');

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <NestStatusBar variant="light" />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('candling.backToNest')}
          onPress={goToNest}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>{t('nav.nest')}</Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.nickname} numberOfLines={1}>
            {pet.nickname}
          </Text>
          <Text style={styles.milestone} numberOfLines={2}>
            {milestoneTitle}
          </Text>
        </View>

        <HeartbeatBadge bpm={bpm} active={candlingActive} label={heartLabel} />
      </View>

      {isClockTampered ? (
        <View accessibilityRole="alert" style={styles.banner}>
          <Text style={styles.bannerTitle}>{t('clock.paused')}</Text>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('candling.toggleLight')}
          onPress={() => setLightMode((mode) => (mode === 'manual' ? 'fixed' : 'manual'))}
          style={({ pressed }) => [styles.toggleButton, { opacity: pressed ? 0.84 : 1 }]}>
          <Text style={styles.toggleLabel}>{t('candling.toggleLight')}</Text>
          <Text style={styles.toggleMeta}>{t('candling.lightMode', { mode: lightModeLabel })}</Text>
        </Pressable>
        <Text style={styles.labKicker}>{t('candling.labNote')}</Text>
        <Text style={styles.labBody}>{summary}</Text>
        <Text style={styles.hint}>
          {lightMode === 'fixed'
            ? t('candling.hintFixed')
            : touch.isIlluminated
              ? t('candling.hintFollowing')
              : t('candling.hintIdle')}
        </Text>
      </View>
    </View>
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
  const { t } = useTranslation();
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
      accessibilityLabel={t('candling.heartA11y', { label })}
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
    lineHeight: 18,
    fontWeight: '800',
  },
  footer: {
    backgroundColor: CHAMBER_PANEL,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2420',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  toggleButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#C4783A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  toggleLabel: {
    color: '#1A1410',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleMeta: {
    color: '#3A2A1C',
    fontSize: 12,
    fontWeight: '600',
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
