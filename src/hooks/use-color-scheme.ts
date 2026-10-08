import { useAppColorScheme } from '@/theme/colorScheme';

export function useColorScheme(): 'light' | 'dark' {
  return useAppColorScheme();
}
