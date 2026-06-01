import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Scissors, Hand, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { TextField } from '../src/components/ui/TextField';
import { Button } from '../src/components/ui/Button';
import { OnboardingProgress } from '../src/components/onboarding/OnboardingProgress';
import { SkeletonList } from '../src/components/schedule/SkeletonList';
import { palette, radius, spacing, typography } from '../src/theme/tokens';

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

type BizType = 'barbershop' | 'nails' | 'hair';
interface OnboardingData { display_name: string; bio: string; business_type: BizType; }

const BUSINESS: { type: BizType; label: string; icon: React.ComponentType<{ stroke?: string; size?: number; strokeWidth?: number }> }[] = [
  { type: 'barbershop', label: 'Barbeiro', icon: Scissors },
  { type: 'nails', label: 'Manicure', icon: Hand },
  { type: 'hair', label: 'Cabelereiro', icon: Sparkles },
];

export default function WelcomeProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedData, setSavedData] = useState<OnboardingData>({
    display_name: '',
    bio: '',
    business_type: user?.business_type || 'barbershop',
  });

  useEffect(() => { loadSavedData(); }, []);

  useEffect(() => {
    if (user && !loading && !savedData.display_name && user.display_name) {
      setSavedData({ display_name: user.display_name, bio: user.bio || '', business_type: user.business_type });
    }
  }, [user, loading, savedData.display_name]);

  const loadSavedData = async () => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) setSavedData(JSON.parse(json) as OnboardingData);
    } catch (e) {
      console.warn('Failed to load onboarding data', e);
    } finally { setLoading(false); }
  };

  const saveData = async (data: Partial<OnboardingData>) => {
    try {
      const merged = { ...savedData, ...data };
      setSavedData(merged);
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar seus dados.');
    }
  };

  const handleNext = () => {
    if (!savedData.display_name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, informe seu nome de exibição.');
      return;
    }
    saveData(savedData).then(() => router.push('/services'));
  };

  if (loading) {
    return <View style={styles.loading}><SkeletonList count={3} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <OnboardingProgress step={1} total={3} />
        <Text style={styles.title}>Bem-vindo ao AiMarco!</Text>
        <Text style={styles.subtitle}>Vamos configurar seu perfil profissional.</Text>

        <TextField
          label="Nome de exibição"
          placeholder="Ex.: Regina S. Hair"
          value={savedData.display_name}
          onChangeText={(text) => saveData({ display_name: text })}
          autoCapitalize="words"
        />

        <TextField
          label="Biografia (opcional)"
          placeholder="Conte um pouco sobre seu serviço…"
          value={savedData.bio}
          onChangeText={(text) => saveData({ bio: text })}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Tipo de negócio</Text>
        <View style={styles.bizRow}>
          {BUSINESS.map(({ type, label, icon: Icon }) => {
            const selected = savedData.business_type === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.bizItem, selected && styles.bizItemSelected]}
                onPress={() => saveData({ business_type: type })}
                activeOpacity={0.85}
              >
                <Icon stroke={selected ? palette.accentText : palette.textMuted} size={20} strokeWidth={2.2} />
                <Text style={[styles.bizLabel, selected && styles.bizLabelSelected]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Próximo" onPress={handleNext} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: spacing.xl },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl + spacing.lg, flexGrow: 1 },
  title: { ...typography.display, color: palette.text, marginTop: spacing.lg },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...typography.label, color: palette.textMuted, marginBottom: spacing.sm },
  bizRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
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
});
