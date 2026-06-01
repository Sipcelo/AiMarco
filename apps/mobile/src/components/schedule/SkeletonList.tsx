import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { palette, radius, spacing, shadow } from '../../theme/tokens';

function useShimmer() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
}

function Bar({ w, h = 12, style }: { w: number | string; h?: number; style?: object }) {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[{ width: w as number, height: h, borderRadius: radius.sm, backgroundColor: palette.skeleton, opacity }, style]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.timeCol}>
        <Bar w={38} h={16} />
      </View>
      <View style={styles.info}>
        <Bar w={'70%'} h={14} />
        <Bar w={'45%'} h={11} style={{ marginTop: spacing.sm }} />
      </View>
      <Bar w={66} h={22} style={{ borderRadius: radius.pill }} />
    </View>
  );
}

/** Lista de placeholders animados exibida durante o carregamento. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  timeCol: { width: 50, marginRight: spacing.md },
  info: { flex: 1 },
});
