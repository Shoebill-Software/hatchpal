import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useNestPalette } from '@/constants/nest';
import { useTranslation } from '@/i18n';

export default function AppTabs() {
  const palette = useNestPalette();
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={palette.background}
      indicatorColor={palette.surface}
      iconColor={{ default: palette.textMuted, selected: palette.action }}
      labelStyle={{
        default: { color: palette.textMuted },
        selected: { color: palette.text },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav.nest')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('nav.journal')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
