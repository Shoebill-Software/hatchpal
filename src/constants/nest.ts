import { useColorScheme } from '@/hooks/use-color-scheme';

export const NestPalette = {
  light: {
    background: '#F3EDE3',
    surface: '#FFF9F1',
    border: '#E4D4C0',
    text: '#2C241C',
    textMuted: '#6F6458',
    optimal: '#2F7A4A',
    warning: '#C46A1C',
    neutral: '#7A7168',
    action: '#7A3E1D',
    actionText: '#FFF8F0',
    actionDisabled: '#C9BBAE',
    actionDisabledText: '#7A7168',
    progressTrack: '#E6D7C6',
    progressFill: '#C47A2A',
    banner: '#F6E2C4',
    bannerBorder: '#E0C088',
    bannerText: '#7A4A12',
    secondaryAction: '#3F5C4A',
  },
  dark: {
    background: '#161310',
    surface: '#241E19',
    border: '#3C332B',
    text: '#F4EDE3',
    textMuted: '#B4A89C',
    optimal: '#5BBF7A',
    warning: '#E0A15A',
    neutral: '#9A9086',
    action: '#C4783A',
    actionText: '#1A1410',
    actionDisabled: '#4A4038',
    actionDisabledText: '#9A9086',
    progressTrack: '#3A322B',
    progressFill: '#D0893C',
    banner: '#3A2A18',
    bannerBorder: '#6A4A22',
    bannerText: '#F0C48A',
    secondaryAction: '#6FA888',
  },
} as const;

export type NestPaletteTokens = (typeof NestPalette)[keyof typeof NestPalette];

export function useNestPalette(): NestPaletteTokens {
  const scheme = useColorScheme();
  return NestPalette[scheme === 'dark' ? 'dark' : 'light'];
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
