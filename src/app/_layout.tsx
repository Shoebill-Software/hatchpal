import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HATCHERY_PALETTE } from '@/components/adoptionAtmosphere';
import { NestStatusBar } from '@/components/NestStatusBar';
import { SettingsMenuProvider } from '@/components/SettingsMenu';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLaunchStoresReady } from '@/hooks/useLaunchStoresReady';
import { I18nProvider, useTranslation } from '@/i18n';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 720,
  fade: true,
});

const OBSIDIAN = '#0E0E10';
const PAPER = '#F3EDE3';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const canvas = colorScheme === 'dark' ? OBSIDIAN : PAPER;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: canvas }}>
      <I18nProvider>
        <RootNavigator />
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const dark = colorScheme === 'dark';
  const ready = useLaunchStoresReady();
  const canvas = dark ? OBSIDIAN : PAPER;
  const field = HATCHERY_PALETTE[dark ? 'dark' : 'light'].ground;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(canvas).catch(() => undefined);
  }, [canvas]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [ready]);

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <SettingsMenuProvider>
      <NestStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: canvas },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="cradle/[petId]"
          options={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: canvas },
          }}
        />
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
            headerShown: false,
            title: t('nav.adoption'),
            presentation: 'fullScreenModal',
            animation: 'fade',
            animationDuration: 560,
            gestureEnabled: true,
            contentStyle: { backgroundColor: field },
          }}
        />
        <Stack.Screen
          name="showcase"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
            animationDuration: 520,
            gestureEnabled: true,
            contentStyle: { backgroundColor: field },
          }}
        />
      </Stack>
      </SettingsMenuProvider>
    </ThemeProvider>
  );
}
