import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { listServices, createService, deleteService } from '../src/services/api';
import { TextField } from '../src/components/ui/TextField';
import { Button } from '../src/components/ui/Button';
import { OnboardingProgress } from '../src/components/onboarding/OnboardingProgress';
import { SkeletonList } from '../src/components/schedule/SkeletonList';
import { palette, radius, spacing, typography, shadow } from '../src/theme/tokens';

interface Service {
  id?: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  is_active?: boolean;
}

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

function parseBRLtoCents(input: string): number {
  const clean = input.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(clean);
  return isNaN(value) ? 0 : Math.round(value * 100);
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service>({ name: '', duration_minutes: 30, price_cents: 0 });
  const [durationInput, setDurationInput] = useState('30');
  const [priceInput, setPriceInput] = useState('');
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      if (token && user) {
        try {
          const existing = await listServices(token, user.id);
          if (existing.length > 0) {
            setServices(existing);
            setBackendReady(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[Services] Backend fetch failed, falling back to AsyncStorage', e);
        }
      }
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        if (parsed.services && Array.isArray(parsed.services)) setServices(parsed.services);
      }
      setBackendReady(false);
    } catch (e) {
      console.warn('Failed to load services', e);
    } finally { setLoading(false); }
  };

  const saveServices = async (newServices: Service[]) => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const base = json ? JSON.parse(json) : {};
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...base, services: newServices }));
      setServices(newServices);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar os serviços.');
    }
  };

  const resetForm = () => {
    setCurrentService({ name: '', duration_minutes: 30, price_cents: 0 });
    setDurationInput('30');
    setPriceInput('');
  };

  const handleAddService = () => {
    if (!currentService.name.trim()) { Alert.alert('Campo obrigatório', 'Informe o nome do serviço.'); return; }
    const duration = parseInt(durationInput) || 0;
    if (duration <= 0) { Alert.alert('Valor inválido', 'A duração deve ser maior que zero.'); return; }

    if (backendReady && token && user) {
      createService(token, user.id, {
        name: currentService.name.trim(),
        duration_minutes: duration,
        price_cents: priceInput.trim() === '' ? 0 : parseBRLtoCents(priceInput),
        description: '',
      }).then((created) => {
        setServices((prev) => [...prev, created]);
        resetForm();
      }).catch((e: any) => {
        Alert.alert('Erro', e.message || 'Não foi possível adicionar o serviço.');
      });
      return;
    }

    const price = priceInput.trim() === '' ? 0 : parseBRLtoCents(priceInput);
    if (price < 0) { Alert.alert('Valor inválido', 'O preço não pode ser negativo.'); return; }
    saveServices([...services, { ...currentService, duration_minutes: duration, price_cents: price }]);
    resetForm();
  };

  const handleRemoveService = async (index: number) => {
    const svc = services[index];
    if (backendReady && token && user && svc.id) {
      try {
        await deleteService(token, user.id, svc.id);
        setServices((prev) => prev.filter((_, i) => i !== index));
      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Não foi possível remover o serviço.');
      }
    } else {
      saveServices(services.filter((_, i) => i !== index));
    }
  };

  const handleNext = () => {
    if (services.length === 0) { Alert.alert('Serviço obrigatório', 'Adicione pelo menos um serviço para continuar.'); return; }
    router.push('/schedule-wizard');
  };

  if (loading) {
    return <View style={styles.loading}><SkeletonList count={3} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <OnboardingProgress step={2} total={3} />
          <Text style={styles.title}>Seus serviços</Text>
          <Text style={styles.subtitle}>Adicione os serviços que você oferece.</Text>

          {/* Form card */}
          <View style={styles.formCard}>
            <TextField
              label="Nome do serviço"
              placeholder="Ex.: Corte Feminino"
              value={currentService.name}
              onChangeText={(text) => setCurrentService({ ...currentService, name: text })}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField label="Duração (min)" placeholder="30" value={durationInput} onChangeText={setDurationInput} keyboardType="number-pad" />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <TextField label="Preço (R$)" placeholder="opcional" value={priceInput} onChangeText={setPriceInput} keyboardType="decimal-pad" />
              </View>
            </View>
            <Button label="Adicionar serviço" variant="secondary" onPress={handleAddService} icon={<Plus stroke={palette.accent} size={18} strokeWidth={2.6} />} />
          </View>

          {/* List */}
          <Text style={styles.listTitle}>Serviços adicionados</Text>
          {services.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum serviço cadastrado ainda.</Text>
          ) : (
            services.map((svc, index) => (
              <View key={svc.id ?? index} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <View style={styles.serviceMeta}>
                    <Clock stroke={palette.textFaint} size={13} />
                    <Text style={styles.serviceDetails}>{svc.duration_minutes} min · R$ {formatCents(svc.price_cents)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveService(index)} style={styles.removeBtn} hitSlop={8}>
                  <Trash2 stroke={palette.cancelled} size={18} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={{ marginTop: spacing.xl }}>
            <Button label="Próximo" onPress={handleNext} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: spacing.xl },
  scroll: { padding: spacing.xl, flexGrow: 1 },
  title: { ...typography.display, color: palette.text, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  formCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  row: { flexDirection: 'row' },
  listTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: palette.textFaint, fontStyle: 'italic' },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  serviceInfo: { flex: 1 },
  serviceName: { ...typography.body, color: palette.text, fontWeight: '700', fontSize: 15 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  serviceDetails: { ...typography.label, color: palette.textMuted, fontWeight: '500' },
  removeBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.cancelledTint },
});
