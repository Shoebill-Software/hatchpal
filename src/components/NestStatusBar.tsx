import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '@/hooks/use-color-scheme';

type NestStatusBarProps = {
  /** Candling and other dark chambers stay light-on-dark regardless of the system theme. */
  variant?: 'theme' | 'light';
};

/**
 * Picks status bar icon color from the nest background.
 * Light paper uses dark icons. Dark nests and the candling chamber use light icons.
 */
export function NestStatusBar({ variant = 'theme' }: NestStatusBarProps) {
  const scheme = useColorScheme();
  const style = variant === 'light' || scheme === 'dark' ? 'light' : 'dark';
  return <StatusBar style={style} />;
}
