import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';

const BUSINESS_LABELS: Record<string, string> = {
  barbershop: 'Barbeiro',
  nails: 'Manicure/Pedicure',
  hair: 'Cabelereiro',
};

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

interface OnboardingData {
  display_name: string;
  bio: string;
  business_type: 'barbershop' | 'nails' | 'hair';
}

export default function WelcomeProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedData, setSavedData] = useState<OnboardingData>({
    display_name: '',
    bio: '',
    business_type: user?.business_type || 'barbershop',
  });

  useEffect(() => {
    loadSavedData();
  }, []);

  // Se o usuário já tem dados (após signup) e não há dados salvos no AsyncStorage, inicializar com os dados do usuário
  useEffect(() => {
    if (user && !loading) {
      // Só inicializar se ainda não houver dados no estado (ou se estiver vazio)
      // Mas se já carregamos do AsyncStorage, mantemos o que já veio
      // Para simplificar: se savedData.display_name está vazio e user tem display_name, atualizar
      if (!savedData.display_name && user.display_name) {
        setSavedData({
          display_name: user.display_name,
          bio: user.bio || '',
          business_type: user.business_type,
        });
      }
    }
  }, [user, loading, savedData.display_name]);

  const loadSavedData = async () => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json) as OnboardingData;
        setSavedData(parsed);
      }
    } catch (e) {
      console.warn('Failed to load onboarding data', e);
    } finally {
      setLoading(false);
    }
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

    saveData(savedData).then(() => {
      router.push('/services');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineLarge" style={styles.title}>Bem-vindo ao AiMarco!</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>Vamos configurar seu perfil profissional.</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nome de exibição *</Text>
        <TextInput
          mode="outlined"
          value={savedData.display_name}
          onChangeText={(text) => saveData({ display_name: text })}
          placeholder="Ex: Dra. Maria Silva"
          autoCapitalize="words"
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#00D2FF"
          textColor="#FFF"
          placeholderTextColor="#e9eff1"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Biografia (opcional)</Text>
        <TextInput
          mode="outlined"
          value={savedData.bio}
          onChangeText={(text) => saveData({ bio: text })}
          placeholder="Conte um pouco sobre seu serviço..."
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textArea]}
          outlineColor="#333"
          activeOutlineColor="#00D2FF"
          textColor="#FFF"
          placeholderTextColor="#e9eff1"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Tipo de Negócio *</Text>
        <View style={styles.pickerContainer}>
          {(['barbershop', 'nails', 'hair'] as const).map((segment) => (
            <TouchableOpacity
              key={segment}
              style={[styles.radioItem, savedData.business_type === segment && styles.radioItemSelected]}
              onPress={() => saveData({ business_type: segment })}
            >
              <Text style={[styles.radioLabel, savedData.business_type === segment && styles.radioLabelSelected]}>
                {BUSINESS_LABELS[segment]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Próximo</Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFF',
  },
  input: {
    backgroundColor: '#112240',
  },
  textArea: {
    height: 80,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#112240',
  },
  radioItemSelected: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  radioLabel: {
    fontSize: 14,
    color: '#e9eff1',
  },
  radioLabelSelected: {
    color: '#0A192F',
  },
  nextButton: {
    backgroundColor: '#00D2FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#0A192F',
    fontSize: 18,
    fontWeight: '600',
  },
});
