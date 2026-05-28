import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeProfileScreen } from '../screens/onboarding/WelcomeProfileScreen';
import { ServicesScreen } from '../screens/onboarding/ServicesScreen';
import { ScheduleWizardScreen } from '../screens/onboarding/ScheduleWizardScreen';

export type OnboardingStackParamList = {
  WelcomeProfile: undefined;
  Services: undefined;
  ScheduleWizard: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Onboarding Navigator — Wizard de configuração inicial do profissional
 *
 * Fluxo:
 * 1. WelcomeProfile — Nome, Bio, Tipo de Negócio
 * 2. Services — Adicionar serviços (mínimo 1)
 * 3. ScheduleWizard — Configurar dias e horários (turnos)
 */
export function OnboardingNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="WelcomeProfile"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="WelcomeProfile" component={WelcomeProfileScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="ScheduleWizard" component={ScheduleWizardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
