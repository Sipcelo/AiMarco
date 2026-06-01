import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Mail, Lock, CalendarCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { TextField } from '../src/components/ui/TextField';
import { Button } from '../src/components/ui/Button';
import { palette, radius, spacing, typography, shadow } from '../src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { signIn } = useAuth();

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [enter]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha email e senha.');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const success = await signIn(normalizedEmail, password);
      if (!success) setLoading(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <CalendarCheck stroke={palette.accent} size={28} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Acesse sua conta profissional</Text>
          </View>

          <TextField
            label="Email"
            placeholder="voce@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            icon={<Mail stroke={palette.textFaint} size={18} />}
          />

          <TextField
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secure
            icon={<Lock stroke={palette.textFaint} size={18} />}
          />

          <View style={{ marginTop: spacing.sm }}>
            <Button label="Entrar" onPress={handleLogin} loading={loading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/signup')} style={styles.linkWrap} hitSlop={8}>
            <Text style={styles.link}>Não tem conta? <Text style={styles.linkStrong}>Cadastre-se</Text></Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  title: { ...typography.display, color: palette.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  linkWrap: { marginTop: spacing.xl, alignItems: 'center' },
  link: { ...typography.body, color: palette.textMuted },
  linkStrong: { color: palette.accent, fontWeight: '700' },
});
