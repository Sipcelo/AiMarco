import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { User, Mail, Phone, Lock, Scissors, Hand, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { TextField } from '../src/components/ui/TextField';
import { Button } from '../src/components/ui/Button';
import { palette, radius, spacing, typography } from '../src/theme/tokens';

type BizType = 'barbershop' | 'nails' | 'hair';

const BUSINESS: { type: BizType; label: string; icon: React.ComponentType<{ stroke?: string; size?: number; strokeWidth?: number }> }[] = [
  { type: 'barbershop', label: 'Barbeiro', icon: Scissors },
  { type: 'nails', label: 'Manicure', icon: Hand },
  { type: 'hair', label: 'Cabelereiro', icon: Sparkles },
];

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState<BizType>('barbershop');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuth();

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [enter]);

  const handleSignUp = async () => {
    setFieldErrors({});
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos marcados.');
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não coincidem.' });
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const digitsOnly = phone.trim().replace(/\D/g, '');
      let normalizedPhone = digitsOnly;
      if (digitsOnly && !digitsOnly.startsWith('55')) normalizedPhone = '55' + digitsOnly;
      if (!normalizedPhone.startsWith('+')) normalizedPhone = '+' + normalizedPhone;
      const success = await signUp(normalizedEmail, password, displayName.trim(), businessType, normalizedPhone);
      if (!success) setLoading(false);
    } catch (error: any) {
      setLoading(false);
      if (error.fieldErrors && typeof error.fieldErrors === 'object' && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors);
      } else {
        const detailedMessage = (error.message || 'Não foi possível criar sua conta.')
          + (error.debug_detail ? `\n\n${error.debug_detail}` : '');
        Alert.alert('Erro no Banco de Dados', detailedMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}
        >
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Cadastre-se como profissional</Text>

          <TextField
            label="Nome ou negócio"
            placeholder="Ex.: Regina S. Hair"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            error={fieldErrors.display_name}
            icon={<User stroke={palette.textFaint} size={18} />}
          />
          <TextField
            label="Email"
            placeholder="voce@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
            icon={<Mail stroke={palette.textFaint} size={18} />}
          />
          <TextField
            label="Telefone"
            placeholder="(53) 99999-9999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={fieldErrors.phone}
            icon={<Phone stroke={palette.textFaint} size={18} />}
          />
          <TextField
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secure
            error={fieldErrors.password}
            icon={<Lock stroke={palette.textFaint} size={18} />}
          />
          <TextField
            label="Confirmar senha"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secure
            error={fieldErrors.confirmPassword}
            icon={<Lock stroke={palette.textFaint} size={18} />}
          />

          <Text style={styles.label}>Tipo de negócio</Text>
          <View style={styles.bizRow}>
            {BUSINESS.map(({ type, label, icon: Icon }) => {
              const selected = businessType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.bizItem, selected && styles.bizItemSelected]}
                  onPress={() => setBusinessType(type)}
                  activeOpacity={0.85}
                >
                  <Icon stroke={selected ? palette.accentText : palette.textMuted} size={20} strokeWidth={2.2} />
                  <Text style={[styles.bizLabel, selected && styles.bizLabelSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Button label="Cadastrar" onPress={handleSignUp} loading={loading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkWrap} hitSlop={8}>
            <Text style={styles.link}>Já tem conta? <Text style={styles.linkStrong}>Entrar</Text></Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxl },
  title: { ...typography.display, color: palette.text },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...typography.label, color: palette.textMuted, marginBottom: spacing.sm },
  bizRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  bizItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  bizItemSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  bizLabel: { ...typography.caption, color: palette.textMuted, fontWeight: '600' },
  bizLabelSelected: { color: palette.accentText },
  linkWrap: { marginTop: spacing.xl, alignItems: 'center' },
  link: { ...typography.body, color: palette.textMuted },
  linkStrong: { color: palette.accent, fontWeight: '700' },
});
