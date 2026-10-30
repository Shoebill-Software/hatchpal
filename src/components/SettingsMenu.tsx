import { SymbolView } from 'expo-symbols';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsModal } from '@/components/SettingsModal';
import { useNestPalette } from '@/constants/nest';
import { useTranslation } from '@/i18n';

interface SettingsHostClaim {
  id: number;
  release: () => void;
}

interface SettingsMenuContextValue {
  visible: boolean;
  open: () => void;
  close: () => void;
  topHostId: number | null;
  claimHost: () => SettingsHostClaim;
}

const SettingsMenuContext = createContext<SettingsMenuContextValue | null>(null);

export function SettingsMenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [hostOrder, setHostOrder] = useState<number[]>([]);
  const nextHostId = useRef(1);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const claimHost = useCallback((): SettingsHostClaim => {
    const id = nextHostId.current;
    nextHostId.current += 1;
    setHostOrder((order) => [...order, id]);
    return {
      id,
      release: () => setHostOrder((order) => order.filter((hostId) => hostId !== id)),
    };
  }, []);
  const topHostId = hostOrder.at(-1) ?? null;
  const value = useMemo<SettingsMenuContextValue>(
    () => ({ visible, open, close, topHostId, claimHost }),
    [claimHost, close, open, topHostId, visible]
  );

  return (
    <SettingsMenuContext.Provider value={value}>
      {children}
      {topHostId == null ? <SettingsModal visible={visible} onClose={close} /> : null}
    </SettingsMenuContext.Provider>
  );
}

/**
 * Mounts the settings sheet inside a screen presented as a native modal.
 * The root sheet is already underneath that presentation, so it cannot appear.
 */
export function SettingsSheetHost() {
  const { visible, close, claimHost, topHostId } = useSettings();
  const [hostId, setHostId] = useState<number | null>(null);

  useEffect(() => {
    const claim = claimHost();
    setHostId(claim.id);
    return claim.release;
  }, [claimHost]);

  if (hostId == null || hostId !== topHostId) {
    return null;
  }

  return <SettingsModal visible={visible} onClose={close} />;
}

export function useSettings(): SettingsMenuContextValue {
  const value = useContext(SettingsMenuContext);
  if (!value) {
    throw new Error('Settings are only available inside SettingsMenuProvider');
  }
  return value;
}

export function SettingsButton({
  tint,
  style,
}: {
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const { open } = useSettings();
  const color = tint ?? palette.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.open')}
      onPress={open}
      hitSlop={8}
      style={({ pressed }) => [styles.hit, style, { opacity: pressed ? 0.55 : 1 }]}>
      <SymbolView
        name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
        size={20}
        tintColor={color}
        fallback={<Text style={[styles.glyph, { color }]}>⚙</Text>}
      />
    </Pressable>
  );
}

/** Pins the settings control to the top-right of a screen that has no toolbar of its own. */
export function SettingsCorner() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.corner, { top: insets.top + 4 }]}>
      <SettingsButton />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  corner: {
    position: 'absolute',
    right: 8,
    zIndex: 20,
  },
});
