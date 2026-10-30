import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hexToRgba, useNestPalette } from '@/constants/nest';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTranslation } from '@/i18n';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import { usePreferencesStore } from '@/store/usePreferencesStore';

import { Pip } from './Pip';
import { useTypewriter } from './useTypewriter';

const RIM = '#E2A72E';

/** Pip's one-time hatchery tip, shown after the welcome on the first visit to adoption. */
export function PipTip() {
  const hasSeenWelcome = usePreferencesStore((state) => state.hasSeenWelcome);
  const hasSeenTip = usePreferencesStore((state) => state.hasSeenAdoptionTip);
  if (!hasSeenWelcome || hasSeenTip) {
    return null;
  }
  return <PipTipCard />;
}

function PipTipCard() {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const markSeen = usePreferencesStore((state) => state.markAdoptionTipSeen);
  const body = t('adoptionTip.body');
  const typed = useTypewriter(body, { instant: reduceMotion });

  const dismiss = () => {
    void triggerImpact(ImpactFeedbackStyle.Light);
    markSeen();
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(650).duration(320)}
      exiting={reduceMotion ? undefined : FadeOut.duration(180)}
      style={[
        styles.card,
        { top: Math.max(insets.top, 12) + 104, backgroundColor: palette.surface, borderColor: hexToRgba(RIM, 0.55) },
      ]}>
      <View style={[styles.avatar, { backgroundColor: hexToRgba(RIM, 0.16) }]}>
        <Pip size={50} mood="wink" talking={!typed.done} reduceMotion={reduceMotion} accessibilityLabel={t('welcome.pipA11y')} />
      </View>
      <Pressable accessible={false} onPress={typed.done ? undefined : typed.finish} style={styles.copy}>
        <View>
          <Text maxFontSizeMultiplier={1.25} style={[styles.body, styles.ghost]} accessibilityElementsHidden>
            {body}
          </Text>
          <Text
            accessibilityLabel={body}
            maxFontSizeMultiplier={1.25}
            style={[styles.body, styles.typed, { color: palette.text }]}>
            {typed.shown}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('adoptionTip.ok')}
          onPress={dismiss}
          hitSlop={8}
          style={({ pressed }) => [styles.ok, { backgroundColor: palette.action, opacity: pressed ? 0.85 : 1 }]}>
          <Text maxFontSizeMultiplier={1.15} style={[styles.okLabel, { color: palette.actionText }]}>
            {t('adoptionTip.ok')}
          </Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 460,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    zIndex: 50,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
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
  ok: {
    alignSelf: 'flex-end',
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 999,
    justifyContent: 'center',
  },
  okLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
