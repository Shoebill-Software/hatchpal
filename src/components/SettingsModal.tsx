import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NestStatusBar } from '@/components/NestStatusBar';
import { useNestPalette, type NestPaletteTokens } from '@/constants/nest';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';
import { playSoundEffect } from '@/services/audio';
import { ImpactFeedbackStyle, triggerImpact } from '@/services/hapticFeedback';
import {
  readNotificationPermission,
  requestNotificationPermissions,
  type OsNotificationPermission,
} from '@/services/notifications';
import { usePetStore } from '@/store/usePetStore';
import { usePreferencesStore, type AppearancePreference } from '@/store/usePreferencesStore';

const REPOSITORY_URL = 'https://github.com/Shoebill-Software/hatchpal';
const PYTHON_SILHOUETTE_URL =
  'https://www.phylopic.org/images/0376a292-2e17-4978-b859-6fbf9bea6c67';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

function readAppVersion(): string {
  const configured = Constants.expoConfig?.version;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  if (typeof Constants.nativeAppVersion === 'string' && Constants.nativeAppVersion.length > 0) {
    return Constants.nativeAppVersion;
  }
  return '1.0.0';
}

function permissionKey(permission: OsNotificationPermission): TranslationKey {
  switch (permission) {
    case 'granted':
      return 'settings.permission.granted';
    case 'denied':
      return 'settings.permission.denied';
    case 'undetermined':
      return 'settings.permission.undetermined';
    case 'unavailable':
      return 'settings.permission.unavailable';
  }
}

async function openExternal(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      // A missing browser must not trap the settings sheet.
    }
  }
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const palette = useNestPalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, setPermission] = useState<OsNotificationPermission>('undetermined');
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

  const appearance = usePreferencesStore((state) => state.appearance);
  const soundEnabled = usePreferencesStore((state) => state.soundEnabled);
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const setAppearance = usePreferencesStore((state) => state.setAppearance);
  const setSoundEnabled = usePreferencesStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = usePreferencesStore((state) => state.setHapticsEnabled);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const creatureName = usePetStore((state) => {
    if (!state.activePetId) {
      return null;
    }
    const nickname = state.pets[state.activePetId]?.nickname;
    return nickname && nickname.trim().length > 0 ? nickname : null;
  });
  const abandonActivePet = usePetStore((state) => state.abandonActivePet);
  const incubating = usePetStore((state) => {
    if (!state.activePetId) {
      return false;
    }
    const pet = state.pets[state.activePetId];
    return pet != null && !pet.isHatched;
  });
  const resetTutorial = usePreferencesStore((state) => state.resetTutorial);
  const suspendNestTutorial = usePreferencesStore((state) => state.suspendNestTutorial);

  useEffect(() => {
    if (!visible) {
      setResetStep(0);
      return;
    }
    let active = true;
    void readNotificationPermission().then((next) => {
      if (active) {
        setPermission(next);
      }
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const closeSettings = () => {
    setResetStep(0);
    onClose();
  };

  const onNotificationsChange = (enabled: boolean) => {
    void (async () => {
      await setNotificationsEnabled(enabled);
      if (enabled) {
        await requestNotificationPermissions();
        void triggerImpact(ImpactFeedbackStyle.Light);
      }
      setPermission(await readNotificationPermission());
    })();
  };

  const eraseCreature = () => {
    abandonActivePet();
    setResetStep(0);
    onClose();
  };

  const replayTutorial = () => {
    if (!incubating) {
      return;
    }
    resetTutorial();
    if (usePreferencesStore.getState().isTutorialActive) {
      suspendNestTutorial();
    }
    void triggerImpact(ImpactFeedbackStyle.Light);
    closeSettings();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSettings}
        statusBarTranslucent>
        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          <NestStatusBar />
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top, Spacing.three), borderBottomColor: palette.border },
            ]}>
            <Text style={[styles.title, { color: palette.text }]}>{t('settings.title')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.close')}
              onPress={closeSettings}
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.closeLabel, { color: palette.action }]}>{t('settings.close')}</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, Spacing.four) + Spacing.three },
            ]}
            showsVerticalScrollIndicator={false}>
            <Section title={t('settings.appearanceTitle')}>
              <Text style={[styles.hint, { color: palette.textMuted }]}>{t('settings.appearanceHint')}</Text>
              <AppearancePicker
                value={appearance}
                onChange={(next) => {
                  setAppearance(next);
                  void triggerImpact(ImpactFeedbackStyle.Light);
                }}
              />
            </Section>

            <Section title={t('settings.sensoryTitle')}>
              <ToggleRow
                label={t('settings.sound')}
                hint={t('settings.soundHint')}
                value={soundEnabled}
                onValueChange={(enabled) => {
                  setSoundEnabled(enabled);
                  if (enabled) {
                    void playSoundEffect('tap');
                  }
                }}
              />
              <ToggleRow
                label={t('settings.haptics')}
                hint={t('settings.hapticsHint')}
                value={hapticsEnabled}
                onValueChange={(enabled) => {
                  setHapticsEnabled(enabled);
                  if (enabled) {
                    void triggerImpact(ImpactFeedbackStyle.Light);
                  }
                }}
              />
            </Section>

            <Section title={t('settings.notificationsTitle')}>
              <ToggleRow
                label={t('settings.notifications')}
                hint={t('settings.notificationsHint')}
                value={notificationsEnabled}
                onValueChange={onNotificationsChange}
              />
              <Text style={[styles.permission, { color: palette.textMuted }]}>{t(permissionKey(permission))}</Text>
            </Section>

            <Section title={t('settings.guideTitle')}>
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                {incubating ? t('settings.replayTutorialHint') : t('settings.replayTutorialNeedsEgg')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings.replayTutorial')}
                accessibilityState={{ disabled: !incubating }}
                disabled={!incubating}
                onPress={replayTutorial}
                style={({ pressed }) => [
                  styles.replayButton,
                  {
                    borderColor: palette.action,
                    opacity: !incubating ? 0.45 : pressed ? 0.82 : 1,
                  },
                ]}>
                <Text style={[styles.replayLabel, { color: palette.action }]}>{t('settings.replayTutorial')}</Text>
              </Pressable>
            </Section>

            <Section title={t('settings.aboutTitle')}>
              <Text style={[styles.body, { color: palette.text }]}>
                {t('settings.version', { version: readAppVersion() })}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void openExternal(REPOSITORY_URL);
                }}
                style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.linkLabel, { color: palette.action }]}>{t('settings.github')}</Text>
              </Pressable>
              <Text selectable style={[styles.hint, { color: palette.textMuted }]}>
                {t('settings.attribution')}
              </Text>
              <Text selectable style={[styles.hint, { color: palette.textMuted }]}>
                {t('settings.silhouettes')}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void openExternal(PYTHON_SILHOUETTE_URL);
                }}
                style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.linkLabel, { color: palette.action }]}>{t('settings.silhouettesLink')}</Text>
              </Pressable>
            </Section>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.warning }]}>{t('settings.dangerTitle')}</Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.warning },
                ]}>
                <Text style={[styles.body, { color: palette.text }]}>{t('settings.reset')}</Text>
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  {creatureName ? t('settings.resetHint') : t('settings.resetEmpty')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: creatureName == null }}
                  disabled={creatureName == null}
                  onPress={() => setResetStep(1)}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    {
                      borderColor: palette.warning,
                      opacity: creatureName == null ? 0.45 : pressed ? 0.82 : 1,
                    },
                  ]}>
                  <Text style={[styles.dangerLabel, { color: palette.warning }]}>{t('settings.reset')}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={visible && resetStep > 0}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (resetStep === 2) {
            setResetStep(1);
            return;
          }
          setResetStep(0);
        }}>
        <View style={styles.backdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.confirmCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.confirmTitle, { color: palette.text }]}>
              {resetStep === 2 ? t('settings.resetStep2Title') : t('settings.resetStep1Title')}
            </Text>
            <Text style={[styles.hint, { color: palette.textMuted }]}>
              {resetStep === 2
                ? t('settings.resetStep2Body')
                : t('settings.resetStep1Body', { name: creatureName ?? '' })}
            </Text>
            {resetStep === 2 ? (
              <Pressable
                accessibilityRole="button"
                onPress={eraseCreature}
                style={({ pressed }) => [
                  styles.eraseButton,
                  { backgroundColor: palette.warning, opacity: pressed ? 0.86 : 1 },
                ]}>
                <Text style={[styles.eraseLabel, { color: palette.actionText }]}>{t('settings.resetConfirm')}</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setResetStep(2)}
                style={({ pressed }) => [
                  styles.eraseButton,
                  { backgroundColor: palette.warning, opacity: pressed ? 0.86 : 1 },
                ]}>
                <Text style={[styles.eraseLabel, { color: palette.actionText }]}>{t('settings.resetContinue')}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (resetStep === 2) {
                  setResetStep(1);
                  return;
                }
                setResetStep(0);
              }}
              style={({ pressed }) => [styles.keepButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.keepLabel, { color: palette.text }]}>
                {resetStep === 2 ? t('settings.resetBack') : t('settings.resetCancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function AppearancePicker({
  value,
  onChange,
}: {
  value: AppearancePreference;
  onChange: (appearance: AppearancePreference) => void;
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const options: { id: AppearancePreference; label: string }[] = [
    { id: 'system', label: t('settings.appearance.system') },
    { id: 'light', label: t('settings.appearance.light') },
    { id: 'dark', label: t('settings.appearance.dark') },
  ];

  return (
    <View accessibilityRole="radiogroup" style={[styles.segment, { borderColor: palette.border, backgroundColor: palette.background }]}>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.segmentItem,
              {
                backgroundColor: selected ? palette.action : 'transparent',
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <Text style={[styles.segmentLabel, { color: selected ? palette.actionText : palette.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const palette = useNestPalette();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const palette = useNestPalette();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={[styles.body, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: palette.action }}
        thumbColor={switchThumb(palette, value)}
        ios_backgroundColor={palette.border}
      />
    </View>
  );
}

function switchThumb(palette: NestPaletteTokens, value: boolean): string {
  return value ? palette.actionText : palette.surface;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  closeLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  permission: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  replayButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  replayLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 12, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  confirmTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  eraseButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraseLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  keepButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
