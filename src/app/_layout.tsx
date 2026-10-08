import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NestStatusBar } from '@/components/NestStatusBar';
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
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: OBSIDIAN }}>
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
      <NestStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: canvas },
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
            headerShown: false,
            title: t('nav.adoption'),
            presentation: 'fullScreenModal',
            animation: 'fade',
            animationDuration: 560,
            gestureEnabled: true,
            contentStyle: { backgroundColor: '#0C0A09' },
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
            contentStyle: { backgroundColor: '#0C0A09' },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
