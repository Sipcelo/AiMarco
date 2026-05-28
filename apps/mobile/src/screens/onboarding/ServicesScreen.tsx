import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

export function ServicesScreen() {
  const [services, setServices] = useState<{ name: string; duration_minutes: string; price_cents: string; description?: string }[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');

  const addService = () => {
    if (!name.trim()) return;
    setServices([...services, { name: name.trim(), duration_minutes: duration, price_cents: price }]);
    setName('');
    setPrice('');
  };

  const handleFinish = async () => {
    if (services.length === 0) return;
    try {
      const existing = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      const data = existing ? JSON.parse(existing) : {};
      data.services = services;
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving services', e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A192F', padding: 20 }}>
      <Text variant="headlineLarge" style={{ color: '#FFF', marginBottom: 8 }}>Serviços</Text>
      <Text variant="bodyLarge" style={{ color: '#8892A4', marginBottom: 24 }}>Adicione pelo menos um serviço.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput placeholder="Nome" value={name} onChangeText={setName} style={{ flex: 1, backgroundColor: '#1A1A2E' }} textColor="#FFF" mode="outlined" />
        <TextInput placeholder="Min" value={duration} onChangeText={setDuration} style={{ width: 70, backgroundColor: '#1A1A2E' }} textColor="#FFF" keyboardType="numeric" mode="outlined" />
        <TextInput placeholder="R$" value={price} onChangeText={setPrice} style={{ width: 80, backgroundColor: '#1A1A2E' }} textColor="#FFF" keyboardType="numeric" mode="outlined" />
        <IconButton icon="plus" onPress={addService} iconColor="#00D2FF" />
      </View>
      <FlatList
        data={services}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#1A1A2E', borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ color: '#FFF', flex: 1 }}>{item.name} — {item.duration_minutes}min</Text>
            <Text style={{ color: '#00D2FF' }}>{item.price_cents ? `R$ ${(Number(item.price_cents) / 100).toFixed(2)}` : 'Grátis'}</Text>
          </View>
        )}
      />
      <Button mode="contained" onPress={handleFinish} disabled={services.length === 0} style={{ marginTop: 16, backgroundColor: '#00D2FF' }}>
        Próximo
      </Button>
    </SafeAreaView>
  );
}
