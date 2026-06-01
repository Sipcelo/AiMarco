import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarCheck, Share2 } from 'lucide-react-native';
import { palette, radius, spacing, typography, shadow } from '../../theme/tokens';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  /** CTA opcional (ex.: compartilhar link de agendamento). */
  ctaLabel?: string;
  onPressCta?: () => void;
}

/** Estado vazio desenhado: ícone com halo pulsante + texto + CTA. */
export function EmptyState({ title, subtitle, ctaLabel, onPressCta }: EmptyStateProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 360, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, enter]);

  return (
    <Animated.View
      style={[
        styles.root,
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
      ]}
    >
      <View style={styles.haloWrap}>
        <Animated.View style={[styles.halo, { transform: [{ scale: pulse }] }]} />
        <View style={styles.iconCircle}>
          <CalendarCheck stroke={palette.accent} size={30} strokeWidth={2.2} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {ctaLabel && onPressCta ? (
        <TouchableOpacity style={styles.cta} onPress={onPressCta} activeOpacity={0.85}>
          <Share2 stroke={palette.accentText} size={16} strokeWidth={2.4} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  haloWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  halo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: palette.accentSoft,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  title: { ...typography.title, color: palette.text, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
    ...shadow.floating,
  },
  ctaText: { ...typography.label, color: palette.accentText, fontSize: 14 },
});
