import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { SANCTUARY_CRADLE_LIMIT } from '@/domain/cradleCapacity';
import { useTranslation } from '@/i18n';

export interface CradlePagerProps {
  occupied: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Add action. Absent once every cradle is filled. */
  addOffer?: {
    label: string;
    hint: string;
  } | null;
}

/** Occupied cradles stay as marks. Another cradle is a quiet text control beside them. */
export function CradlePager({ occupied, activeIndex, onSelect, addOffer = null }: CradlePagerProps) {
  const palette = useNestPalette();
  const { t } = useTranslation();
  const showMarks = occupied > 1;

  return (
    <View style={styles.row}>
      {showMarks ? (
        <View style={styles.marks} accessibilityRole="tablist">
          {Array.from({ length: occupied }, (_, index) => {
            const selected = index === activeIndex;
            return (
              <Pressable
                key={index}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={t('nest.cradleA11y', { index: index + 1, total: SANCTUARY_CRADLE_LIMIT })}
                accessibilityHint={t('nest.cradleOccupied', { index: index + 1 })}
                onPress={() => onSelect(index)}
                hitSlop={8}
                style={styles.hit}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: selected ? palette.action : palette.text,
                      borderColor: selected ? palette.action : palette.text,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {addOffer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addOffer.label}
          accessibilityHint={addOffer.hint}
          onPress={() => onSelect(occupied)}
          hitSlop={8}
          style={({ pressed }) => [styles.offer, { opacity: pressed ? 0.55 : 1 }]}>
          <Text style={[styles.plus, { color: palette.textMuted }]}>+</Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.offerLabel, { color: palette.textMuted }]}>
            {addOffer.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
    minHeight: 36,
  },
  marks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hit: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  offer: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
  },
  plus: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
  },
  offerLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
