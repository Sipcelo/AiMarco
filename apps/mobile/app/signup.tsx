import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

const BUSINESS_LABELS = {
  barbershop: 'Barbeiro',
  nails: 'Manicure/Pedicure',
  hair: 'Cabelereiro',
};

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState<'barbershop' | 'nails' | 'hair'>('barbershop');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    // Limpar erros de campo anteriores
    setFieldErrors({});

    // Validações locais (simples)
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
      // Normalizar telefone: remover não-dígitos, garantir +55
      const rawPhone = phone.trim();
      const digitsOnly = rawPhone.replace(/\D/g, '');
      let normalizedPhone = digitsOnly;
      if (digitsOnly && !digitsOnly.startsWith('55')) {
        normalizedPhone = '55' + digitsOnly;
      }
      // Adicionar + se não houver
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }
      console.log('Tentando SignUp com:', normalizedEmail, displayName.trim(), businessType, 'telefone:', normalizedPhone);
      const success = await signUp(
        normalizedEmail,
        password,
        displayName.trim(),
        businessType,
        normalizedPhone
      );
      if (!success) {
        setLoading(false);
      }
      // Se success, AuthContext atualiza o estado e o layout redireciona
    } catch (error: any) {
      setLoading(false);
      console.log('❌ Erro completo recebido no Mobile:', JSON.stringify({
        message: error.message,
        code: error.code,
        detail: error.detail,
        debug_detail: error.debug_detail,
        status: error.status,
        fieldErrors: error.fieldErrors,
      }, null, 2));
      // Se o backend enviou fieldErrors (validation do Zod), mostrar inline
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
    <View style={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>
      <Text style={styles.subtitle}>Cadastre-se como profissional</Text>

      <TextInput
        style={[styles.input, fieldErrors.display_name && styles.inputError]}
        placeholder="Seu nome ou nome do negócio *"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />
      {fieldErrors.display_name ? (
        <Text style={styles.fieldError}>{fieldErrors.display_name}</Text>
      ) : null}
      <TextInput
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {fieldErrors.email ? (
        <Text style={styles.fieldError}>{fieldErrors.email}</Text>
      ) : null}

      <TextInput
        style={[styles.input, fieldErrors.phone && styles.inputError]}
        placeholder="Telefone *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      {fieldErrors.phone ? (
        <Text style={styles.fieldError}>{fieldErrors.phone}</Text>
      ) : null}

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, fieldErrors.password && styles.inputError]}
          placeholder="Senha *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeButtonText}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      {fieldErrors.password ? (
        <Text style={styles.fieldError}>{fieldErrors.password}</Text>
      ) : null}

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
          placeholder="Confirmar senha *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Text style={styles.eyeButtonText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      {fieldErrors.confirmPassword ? (
        <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
      ) : null}

      <Text style={styles.label}>Tipo de Negócio</Text>
      <View style={styles.pickerContainer}>
        {(['barbershop', 'nails', 'hair'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.radioItem, businessType === type && styles.radioItemSelected]}
            onPress={() => setBusinessType(type)}
          >
            <Text style={styles.radioLabel}>{BUSINESS_LABELS[type]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Cadastrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eyeButtonText: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  radioItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  radioItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputError: {
    borderColor: '#DC2626',
  },
});
