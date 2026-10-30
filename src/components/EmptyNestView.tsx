import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { WaitingCradle } from '@/components/WaitingCradle';
import { CRADLE_FRAME } from '@/components/waitingCradleArt';
import { useNestPalette } from '@/constants/nest';
import { Fonts, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';

const MUTED = '#8E8E93';

export function EmptyNestView() {
  const router = useRouter();
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const routed = useRef(false);

  const chooseEgg = useCallback(() => {
    if (routed.current) {
      return;
    }
    routed.current = true;
    void triggerImpact(ImpactFeedbackStyle.Medium);
    router.push('/adopt');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      routed.current = false;
    }, [])
  );

  return (
    <View style={styles.root}>
      <View style={[styles.hero, compact ? styles.heroCompact : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nest.cradleLabel')}
          accessibilityHint={t('nest.cradleHint')}
          onPress={chooseEgg}
          style={({ pressed }) => [styles.cradleHit, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
          <WaitingCradle />
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={1.15} style={[styles.eyebrow, { color: palette.warning }]}>
          {t('nest.emptyEyebrow')}
        </Text>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          maxFontSizeMultiplier={1.15}
          style={[styles.title, { color: palette.text, fontFamily: Fonts?.serif }]}>
          {t('nest.emptyTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.15} style={styles.body}>
          {t('nest.emptyBody')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nest.adoptEgg')}
          accessibilityHint={t('nest.cradleHint')}
          onPress={chooseEgg}
          style={({ pressed }) => [
            styles.cta,
            {
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}>
          <Text maxFontSizeMultiplier={1.15} style={styles.ctaLabel}>
            {t('nest.adoptEgg')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  hero: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: CRADLE_FRAME.width / CRADLE_FRAME.height,
    maxHeight: 440,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCompact: {
    maxHeight: 300,
  },
  cradleHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flexShrink: 0,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.two,
  },
  cta: {
    minHeight: 52,
    minWidth: 196,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A241E',
    borderWidth: 1,
    borderColor: 'rgba(212, 164, 92, 0.55)',
    boxShadow: '0 0 22px rgba(231, 177, 90, 0.28)',
  },
  ctaLabel: {
    color: '#F6EFE4',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
