import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';

const landingEnter = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: -32 }, { scale: 0.93 }],
  },
  42: {
    opacity: 1,
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
});

export function NestPresence({
  token,
  empty,
  occupied,
}: {
  token: string;
  empty: ReactNode;
  occupied: ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const allowMotion = useRef(false);
  const occupiedNow = token !== 'empty';

  useEffect(() => {
    allowMotion.current = true;
  }, []);

  const entering = allowMotion.current
    ? occupiedNow
      ? reduceMotion
        ? FadeIn.duration(220)
        : landingEnter.duration(920)
      : FadeIn.duration(reduceMotion ? 200 : 680)
    : undefined;

  return (
    <View style={styles.host} collapsable={false}>
      {occupiedNow ? (
        <Animated.View
          key={token}
          entering={entering}
          exiting={FadeOut.duration(reduceMotion ? 160 : 300)}
          style={styles.layer}>
          {occupied}
        </Animated.View>
      ) : (
        <Animated.View
          key="empty"
          entering={entering}
          exiting={FadeOut.duration(reduceMotion ? 180 : 440)}
          style={styles.layer}>
          {empty}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    minHeight: 0,
  },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
