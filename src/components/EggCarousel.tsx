import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Brass lock that floats over a locked egg without dimming the shell or the silhouettes. */
export function EggLockBadge({ size = 28 }: { size?: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M8 11V8.2a4 4 0 0 1 8 0V11"
          stroke="#E7D7B0"
          strokeWidth={1.7}
          fill="none"
          strokeLinecap="round"
        />
        <Rect x="5.2" y="10.5" width="13.6" height="9.2" rx="2.2" fill="#C6A86A" stroke="#8A6A32" strokeWidth={1} />
        <Circle cx="12" cy="15.1" r="1.15" fill="#4E3A18" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 22, 16, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(198, 168, 106, 0.7)',
  },
});
