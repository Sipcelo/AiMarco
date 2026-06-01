import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Pressable, StyleSheet } from 'react-native';
import { palette, radius, spacing, typography, shadow, STATUS_META, StatusKey } from '../../theme/tokens';

export interface AgendaItem {
  id: string;
  service_id: string;
  status_raw: string;
  scheduled_at: string;
  time: string;
  client: string;
  service: string;
  phone?: string;
}

interface AppointmentCardProps {
  item: AgendaItem;
  index: number;
  onPress: (item: AgendaItem) => void;
}

const STAGGER_MS = 60;

export function AppointmentCard({ item, index, onPress }: AppointmentCardProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * STAGGER_MS,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const meta = STATUS_META[item.status_raw as StatusKey] ?? STATUS_META.confirmed;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.card}
        android_ripple={{ color: palette.accentSoft }}
      >
        <View style={[styles.accent, { backgroundColor: meta.color }]} />
        <View style={styles.timeCol}>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.client} numberOfLines={1}>{item.client}</Text>
          <Text style={styles.service} numberOfLines={1}>{item.service}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: meta.tint }]}>
          <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </Pressable>
    </Animated.View>
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
    overflow: 'hidden',
    ...shadow.card,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
  timeCol: { width: 52, marginRight: spacing.md, marginLeft: spacing.xs },
  time: { ...typography.heading, color: palette.text, fontSize: 15 },
  info: { flex: 1 },
  client: { ...typography.body, color: palette.text, fontSize: 15, fontWeight: '700' },
  service: { ...typography.label, color: palette.textMuted, fontWeight: '500', marginTop: 2 },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { ...typography.caption, fontSize: 9.5 },
});
