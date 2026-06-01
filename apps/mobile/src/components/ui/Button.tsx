import React, { useRef } from 'react';
import { Animated, Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { palette, radius, spacing, typography, shadow } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

/** Botão com press-scale animado, estados de loading/disabled e variantes. */
export function Button({ label, onPress, variant = 'primary', loading, disabled, icon }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const bg = variant === 'primary' ? palette.accent : variant === 'secondary' ? palette.accentSoft : 'transparent';
  const fg = variant === 'primary' ? palette.accentText : palette.accent;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.55 : 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          { backgroundColor: bg },
          variant === 'primary' && shadow.floating,
          variant === 'ghost' && styles.ghost,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.label, { color: fg }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { paddingVertical: spacing.md },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.label, fontSize: 15 },
});
