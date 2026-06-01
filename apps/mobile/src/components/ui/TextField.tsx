import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { palette, radius, spacing, typography } from '../../theme/tokens';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  /** Campo de senha com toggle de visibilidade. */
  secure?: boolean;
  icon?: React.ReactNode;
}

/** Input light premium com label, ícone opcional, estado de erro e toggle de senha. */
export function TextField({ label, error, secure, icon, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={palette.textFaint}
          secureTextEntry={secure ? hidden : false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={8} style={styles.eye}>
            {hidden ? <EyeOff stroke={palette.textFaint} size={18} /> : <Eye stroke={palette.accent} size={18} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.label, color: palette.textMuted, marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
  },
  fieldFocused: { borderColor: palette.accent, backgroundColor: palette.surface },
  fieldError: { borderColor: palette.cancelled },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: palette.text },
  eye: { paddingLeft: spacing.sm },
  errorText: { ...typography.caption, color: palette.cancelled, marginTop: spacing.xs, marginLeft: spacing.xs, fontWeight: '500' },
});
