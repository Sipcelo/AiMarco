import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

export function WelcomeProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [businessType, setBusinessType] = useState<'barbershop' | 'nails' | 'hair'>('barbershop');

  const handleNext = async () => {
    if (!displayName.trim()) return;
    const data = { display_name: displayName.trim(), bio: bio.trim(), business_type: businessType };
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A192F', padding: 20 }}>
      <Text variant="headlineLarge" style={{ color: '#FFF', marginBottom: 8 }}>Bem-vindo!</Text>
      <Text variant="bodyLarge" style={{ color: '#8892A4', marginBottom: 24 }}>Configure seu perfil para começar.</Text>
      <View>
        <TextInput
          label="Nome"
          value={displayName}
          onChangeText={setDisplayName}
          style={{ backgroundColor: '#1A1A2E', marginBottom: 12 }}
          textColor="#FFF"
          activeOutlineColor="#00D2FF"
          mode="outlined"
        />
        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          style={{ backgroundColor: '#1A1A2E', marginBottom: 12 }}
          textColor="#FFF"
          activeOutlineColor="#00D2FF"
          mode="outlined"
          multiline
        />
        <Button mode="contained" onPress={handleNext} style={{ marginTop: 16, backgroundColor: '#00D2FF' }}>
          Próximo
        </Button>
      </View>
    </SafeAreaView>
  );
}
