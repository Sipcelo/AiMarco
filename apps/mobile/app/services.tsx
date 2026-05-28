import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { listServices, createService, deleteService } from '../src/services/api';

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
  const [currentService, setCurrentService] = useState<Service>({
    name: '',
    duration_minutes: 30,
    price_cents: 0,
  });
  const [durationInput, setDurationInput] = useState('30');
  const [priceInput, setPriceInput] = useState('');
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      // First try to load seeded services from backend
      if (token && user) {
        try {
          console.log('[Services] Fetching existing services from backend...');
          const existing = await listServices(token, user.id);
          if (existing.length > 0) {
            console.log(`[Services] Found ${existing.length} seeded services from backend`);
            setServices(existing);
            setBackendReady(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[Services] Backend fetch failed, falling back to AsyncStorage', e);
        }
      }

      // Fallback: load from AsyncStorage (onboarding flow)
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        if (parsed.services && Array.isArray(parsed.services)) {
          setServices(parsed.services);
        }
      }
      setBackendReady(false);
    } catch (e) {
      console.warn('Failed to load services', e);
    } finally {
      setLoading(false);
    }
  };

  const saveServices = async (newServices: Service[]) => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const base = json ? JSON.parse(json) : {};
      const updated = { ...base, services: newServices };
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
      setServices(newServices);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar os serviços.');
    }
  };

  const handleAddService = () => {
    if (!currentService.name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do serviço.');
      return;
    }
    const duration = parseInt(durationInput) || 0;
    if (duration <= 0) {
      Alert.alert('Valor inválido', 'A duração deve ser maior que zero.');
      return;
    }

    if (backendReady && token && user) {
      // Create directly in backend (no duplicate check since user explicitly adds)
      createService(token, user.id, {
        name: currentService.name.trim(),
        duration_minutes: duration,
        price_cents: priceInput.trim() === '' ? 0 : parseBRLtoCents(priceInput),
        description: '',
      }).then((created) => {
        setServices((prev) => [...prev, created]);
        setCurrentService({ name: '', duration_minutes: 30, price_cents: 0 });
        setDurationInput('30');
        setPriceInput('');
      }).catch((e: any) => {
        Alert.alert('Erro', e.message || 'Não foi possível adicionar o serviço.');
      });
      return;
    }

    // Local storage fallback
    const price = priceInput.trim() === '' ? 0 : parseBRLtoCents(priceInput);
    if (price < 0) {
      Alert.alert('Valor inválido', 'O preço não pode ser negativo.');
      return;
    }

    const newServices = [...services, { ...currentService, duration_minutes: duration, price_cents: price }];
    saveServices(newServices);
    setCurrentService({ name: '', duration_minutes: 30, price_cents: 0 });
    setDurationInput('30');
    setPriceInput('');
  };

  const handleRemoveService = async (index: number) => {
    const svc = services[index];
    if (backendReady && token && user && svc.id) {
      // Delete from backend
      try {
        await deleteService(token, user.id, svc.id);
        setServices((prev) => prev.filter((_, i) => i !== index));
      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Não foi possível remover o serviço.');
      }
    } else {
      // Local storage fallback
      const newServices = services.filter((_, i) => i !== index);
      saveServices(newServices);
    }
  };

  const handleNext = () => {
    if (services.length === 0) {
      Alert.alert('Serviço obrigatório', 'Adicione pelo menos um serviço para continuar.');
      return;
    }
    router.push('/schedule-wizard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A192F' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineLarge" style={styles.title}>Seus Serviços</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Adicione os serviços que você oferece.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome do Serviço</Text>
            <TextInput
              mode="outlined"
              value={currentService.name}
              onChangeText={(text) =>
                setCurrentService({ ...currentService, name: text })
              }
              placeholder="Ex: Massagem Relaxante"
              style={styles.input}
              outlineColor="#333"
              activeOutlineColor="#00D2FF"
              textColor="#FFF"
              placeholderTextColor="#e9eff1"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Duração (min)</Text>
              <TextInput
                mode="outlined"
                value={durationInput}
                onChangeText={setDurationInput}
                keyboardType="number-pad"
                placeholder="Ex: 30"
                style={styles.input}
                outlineColor="#333"
                activeOutlineColor="#00D2FF"
                textColor="#FFF"
                placeholderTextColor="#e9eff1"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Preço (R$) — opcional</Text>
              <TextInput
                mode="outlined"
                value={priceInput}
                onChangeText={setPriceInput}
                keyboardType="decimal-pad"
                placeholder="Ex: 50"
                style={styles.input}
                outlineColor="#333"
                activeOutlineColor="#00D2FF"
                textColor="#FFF"
                placeholderTextColor="#e9eff1"
              />
            </View>
          </View>

          <Button
            mode="contained"
            onPress={handleAddService}
            style={styles.addButton}
            contentStyle={styles.addButtonContent}
            labelStyle={styles.addButtonLabel}
          >
            + Adicionar Serviço
          </Button>

          <View style={styles.servicesList}>
            <Text style={styles.listTitle}>Serviços adicionados:</Text>
            {services.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum serviço cadastrado.</Text>
            ) : (
              services.map((svc, index) => (
                <View key={index} style={styles.serviceItem}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{svc.name}</Text>
                    <Text style={styles.serviceDetails}>
                      {svc.duration_minutes} min • R$ {formatCents(svc.price_cents)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveService(index)}>
                    <Text style={styles.removeText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
            labelStyle={styles.nextButtonLabel}
          >
            Próximo
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    backgroundColor: '#0A192F',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#e9eff1',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#FFF',
  },
  input: {
    backgroundColor: '#112240',
  },
  row: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: '#00D2FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonContent: {
    paddingVertical: 6,
  },
  addButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A192F',
  },
  servicesList: {
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#FFF',
  },
  emptyText: {
    color: '#e9eff1',
    fontStyle: 'italic',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#112240',
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  serviceDetails: {
    fontSize: 14,
    color: '#e9eff1',
    marginTop: 2,
  },
  removeText: {
    color: '#FF4A4A',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00D2FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonContent: {
    paddingVertical: 6,
  },
  nextButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A192F',
  },
});
