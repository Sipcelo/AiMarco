import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius, spacing, typography } from '../../theme/tokens';

interface OnboardingProgressProps {
  step: number;
  total: number;
}

/** Indicador de etapas do onboarding: barras preenchidas + "Passo X de Y". */
export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.bar, i < step ? styles.barActive : styles.barIdle]} />
        ))}
      </View>
      <Text style={styles.label}>Passo {step} de {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  bars: { flexDirection: 'row', gap: spacing.sm },
  bar: { flex: 1, height: 6, borderRadius: radius.pill },
  barActive: { backgroundColor: palette.accent },
  barIdle: { backgroundColor: palette.border },
  label: { ...typography.caption, color: palette.textFaint, fontWeight: '600', marginTop: spacing.sm },
});
