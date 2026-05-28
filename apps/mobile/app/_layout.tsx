import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

const isExpoGo = Constants.appOwnership === 'expo';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    secondary: '#10B981',
  },
};

function AuthGuard() {
  const { token, isOnboarded, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const route = segments[0] || '';
    const publicRoutes = ['login', 'signup', 'index', '[slug]'];
    const onboardingRoutes = ['welcome-profile', 'services', 'schedule-wizard'];
    const isPublic = publicRoutes.includes(route);
    const isOnboardingRoute = onboardingRoutes.includes(route);

    if (!token) {
      // Não autenticado: só rotas públicas são permitidas
      if (!isPublic) {
        console.log(`[AuthGuard] ⛔ Sem token | rota="${route}" → redirect para login`);
        router.replace('login');
      }
    } else {
      // Autenticado
      if (!isOnboarded) {
        // Não completou onboarding: só rotas de onboarding são permitidas
        if (!isOnboardingRoute) {
          console.log(`[AuthGuard] 🔄 Onboarding pendente | rota="${route}" → redirect para welcome-profile`);
          router.replace('welcome-profile');
        }
      } else {
        // Já completou onboarding: schedule, profile e rotas públicas são permitidas
        const privateRoutes = ['schedule', 'profile'];
        if (!privateRoutes.includes(route) && !isPublic) {
          console.log(`[AuthGuard] ✅ Onboarding completo | rota="${route}" → redirect para schedule`);
          router.replace('schedule');
        }
      }
    }
  }, [token, isOnboarded, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}

export default function Layout() {
  const notificationListener = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isExpoGo) return;
    // Dynamic import para não travar no Expo Go
    import('expo-notifications').then(Notifications => {
      const sub = Notifications.addNotificationReceivedListener(() => {});
      notificationListener.current = sub as any;
    }).catch(() => {});
    return () => {
      if (notificationListener.current) (notificationListener.current as any).remove?.();
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: true, title: 'AiMarco' }} />
        <Stack.Screen name="[slug]" options={{ headerShown: true, title: 'Profissional' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="welcome-profile" />
        <Stack.Screen name="services" />
        <Stack.Screen name="schedule-wizard" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="profile" />
      </Stack>
      <AuthGuard />
    </AuthProvider>
    </PaperProvider>
  );
}
