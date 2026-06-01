import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { palette, radius, spacing, typography, shadow } from '../../theme/tokens';

type IconCmp = React.ComponentType<{ stroke?: string; size?: number; strokeWidth?: number }>;

export interface MetricItem {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: IconCmp;
  color: string;
}

export function MetricCard({ item, index }: { item: MetricItem; index: number }) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const Icon = item.icon;
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
          <Icon stroke={item.color} size={14} strokeWidth={2.4} />
        </View>
      </View>
      <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '48%',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.caption, color: palette.textMuted, fontSize: 10 },
  iconWrap: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  value: { ...typography.display, fontSize: 26, lineHeight: 30 },
  subtitle: { ...typography.caption, color: palette.textFaint, fontWeight: '500', marginTop: 2 },
});
