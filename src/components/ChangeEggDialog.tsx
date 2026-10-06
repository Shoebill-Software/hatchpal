import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export interface ChangeEggDialogProps {
  visible: boolean;
  onKeepCurrent: () => void;
  onConfirm: () => void;
}

export function ChangeEggDialog({ visible, onKeepCurrent, onConfirm }: ChangeEggDialogProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepCurrent}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>{t('changeEgg.title')}</Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>{t('changeEgg.body')}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onKeepCurrent}
            style={({ pressed }) => [
              styles.keepButton,
              { backgroundColor: palette.action, opacity: pressed ? 0.88 : 1 },
            ]}>
            <Text style={[styles.keepLabel, { color: palette.actionText }]}>{t('changeEgg.keep')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmButton,
              { borderColor: palette.warning, opacity: pressed ? 0.82 : 1 },
            ]}>
            <Text style={[styles.confirmLabel, { color: palette.warning }]}>{t('changeEgg.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 12, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  keepButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  keepLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
