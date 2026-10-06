import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { NestStatusBar } from '@/components/NestStatusBar';
import { I18nProvider, useTranslation } from '@/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <I18nProvider>
      <RootNavigator />
    </I18nProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    const background = dark ? '#161310' : '#F3EDE3';
    void SystemUI.setBackgroundColorAsync(background).catch(() => undefined);
  }, [dark]);

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <NestStatusBar />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: dark ? '#161310' : '#F3EDE3' },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="candling"
          options={{
            headerShown: false,
            title: t('nav.candling'),
            animation: 'fade',
            contentStyle: { backgroundColor: '#070504' },
          }}
        />
        <Stack.Screen
          name="adopt"
          options={{
            headerShown: true,
            title: t('nav.adoption'),
            presentation: 'modal',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
