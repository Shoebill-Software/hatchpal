import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="candling"
          options={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#070504' },
          }}
        />
        <Stack.Screen
          name="adopt"
          options={{
            headerShown: true,
            title: 'Adoption',
            presentation: 'modal',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
