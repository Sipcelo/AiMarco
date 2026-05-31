// AuthContext — Ato 14: services field added to AuthUser
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signIn as apiSignIn, signUp as apiSignUp, listServices, savePushToken, ServiceItem, setUnauthorizedHandler } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';

const TOKEN_KEY = 'aimarco_token';
const USER_DATA_KEY = 'aimarco_user_data';
const ONBOARDING_COMPLETE_KEY = 'aimarco_onboarding_complete';
const SESSION_TIMESTAMP_KEY = 'aimarco_session_timestamp';

// Session timeout: 2 hours in milliseconds
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

// Track whether a 401-triggered signOut is already in progress (prevents re-render loops)
let sessionInvalidationPending = false;

/**
 * Registra o push token do dispositivo e o persiste no backend.
 * Fire-and-forget: falhas são apenas logadas, nunca exibidas como Alert
 * (o token não deve aparecer na UI).
 */
async function syncPushToken(token: string, professionalId: string): Promise<void> {
  try {
    const pushToken = await registerForPushNotifications();
    if (!pushToken) {
      console.warn('[AUTH] Push token indisponível (Expo Go ou permissão negada).');
      return;
    }
    await savePushToken(token, professionalId, pushToken);
    console.log('[AUTH] Push token registrado e salvo.');
  } catch (e) {
    console.warn('[AUTH] Falha ao registrar/salvar push token', e);
  }
}

interface Professional {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string | null;
  timezone: string;
  slug: string;
  business_type: 'barbershop' | 'nails' | 'hair';
  email: string;
  phone: string;
  full_name: string;
  created_at: string;
  updated_at?: string; // backend não inclui este campo no SELECT — opcional
  services?: ServiceItem[]; // optional, populated after services are created
}

interface AuthContextData {
  user: Professional | null;
  token: string | null;
  loading: boolean;
  isOnboarded: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, display_name: string, business_type: 'barbershop' | 'nails' | 'hair', phone: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUser: (user: Professional) => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * AuthContext — Gerencia autenticação e estado do usuário
 *
 * Segurança:
 * - Token armazenado no SecureStore (nunca AsyncStorage)
 * - Comunicação HTTPS only
 *
 * Estado:
 * - user: perfil do profissional logado
 * - token: JWT para Authorization header
 * - onboardingComplete: flag que indica se o wizard foi completado
 * - isOnboarded: derivado (!!user && onboardingComplete)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Professional | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // isOnboarded: true se há user E onboardingComplete
  const isOnboarded = useMemo(() => !!(user && onboardingComplete), [user, onboardingComplete]);

  // Carregar token, user e onboarding status
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        console.log('🔑 [AUTH] Hydrating session...');
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUserJson = await SecureStore.getItemAsync(USER_DATA_KEY);
        const storedOnboardingComplete = await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY);
        console.log('🔑 [AUTH] Keys loaded', {
          hasToken: !!storedToken,
          hasUser: !!storedUserJson,
          hasOnboarding: storedOnboardingComplete,
        });

        if (storedToken && storedUserJson) {
          // Session Timestamp Check: invalidate if last activity was > SESSION_TIMEOUT_MS ago
          const storedTimestamp = await SecureStore.getItemAsync(SESSION_TIMESTAMP_KEY);
          if (storedTimestamp) {
            const lastActivity = parseInt(storedTimestamp, 10);
            const elapsed = Date.now() - lastActivity;
            console.log('🔑 [AUTH] Session age:', Math.round(elapsed / 60000), 'minutes');
            if (elapsed > SESSION_TIMEOUT_MS) {
              console.warn('🔑 [AUTH] Session expired (', Math.round(elapsed / 60000), 'min). Forcing fresh login.');
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              await SecureStore.deleteItemAsync(USER_DATA_KEY);
              await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY);
              await SecureStore.deleteItemAsync(SESSION_TIMESTAMP_KEY);
              console.log('🔑 [AUTH] Session cleared. Redirecting to login.');
              setLoading(false);
              router.replace('/login');
              setOnboardingComplete(false);
              return;
            }
          }

          const storedUser = JSON.parse(storedUserJson) as Professional;
          setToken(storedToken);
          setUser(storedUser);

          // Data-driven onboarding: fetch services from backend to validate onboarding state
          // This prevents the redirect loop when local flag is missing but services exist
          let isOnboarded = false;
          try {
            const services = await listServices(storedToken, storedUser.id);
            const derivedFromBackend = !!storedUser.slug && services.length > 0;
            const storedFlag = storedOnboardingComplete === 'true';
            isOnboarded = storedFlag || derivedFromBackend;
            if (services.length > 0) {
              // Merge services into persisted user so backend data is the source of truth
              setUser({ ...storedUser, services });
            }
            console.log('🔑 [AUTH] Backend onboarding check:', {
              servicesFound: services.length,
              hasSlug: !!storedUser.slug,
              storedFlag,
              isOnboarded,
            });
          } catch (e) {
            console.warn('[AUTH] Failed to fetch services during hydration, falling back to local state', e);
            const storedFlag = storedOnboardingComplete === 'true';
            const derived = !!storedUser.slug && !!(storedUser.services && storedUser.services.length > 0);
            isOnboarded = storedFlag || derived;
          }

          setOnboardingComplete(isOnboarded);
          console.log('🔑 [AUTH] Session hydrated', {
            userId: storedUser.id,
            userName: storedUser.display_name,
            isOnboarded,
          });

          // Registrar push token na hydration (fire-and-forget)
          void syncPushToken(storedToken, storedUser.id);
        } else {
          console.log('🔑 [AUTH] No stored session found');
        }
      } catch (e) {
        console.warn('🔑 [AUTH] Failed to restore auth state', e);
      } finally {
        console.log('🔑 [AUTH] setLoading(false)');
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Persistir token e user em SecureStore (fire-and-forget; erros em produção)
  useEffect(() => {
    const persist = async () => {
      if (token && user) {
        try {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
          // Update session activity timestamp on every state change
          await SecureStore.setItemAsync(SESSION_TIMESTAMP_KEY, String(Date.now()));
        } catch (e) {
          console.error('🔑 [AUTH] Failed to persist session:', e);
        }
      } else {
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_DATA_KEY);
        } catch (e) {
          console.error('🔑 [AUTH] Failed to clear session:', e);
        }
      }
    };
    persist();
  }, [token, user]);

  // Persistir onboarding flag
  useEffect(() => {
    const persistOnboarding = async () => {
      if (onboardingComplete) {
        try {
          await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, 'true');
        } catch (e) {
          console.error('🔑 [AUTH] Failed to persist onboarding flag:', e);
        }
      } else {
        try {
          await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY);
        } catch (e) {
          console.error('🔑 [AUTH] Failed to clear onboarding flag:', e);
        }
      }
    };
    persistOnboarding();
  }, [onboardingComplete]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('--- AuthContext: signIn iniciado ---', { email });
      const { token: newToken, user: newUser } = await apiSignIn(email, password);
      setToken(newToken);
      setUser(newUser);

      // Determine onboarding status: requires slug AND at least one service
      let isOnboarded = !!newUser.slug;
      let userWithServices = newUser;
      if (isOnboarded) {
        try {
          const services = await listServices(newToken, newUser.id);
          // Merge services into user object for state and persistence
          userWithServices = { ...newUser, services };
          setUser(userWithServices);
          isOnboarded = services.length > 0;
        } catch (e) {
          console.warn('[AUTH] Failed to fetch services, assuming not onboarded', e);
          isOnboarded = false;
        }
      }
      setOnboardingComplete(isOnboarded);
      console.log('--- Auth State Changed (signIn) ---', { token: newToken, loading, isOnboarded });

      // Registrar push token após login (fire-and-forget)
      void syncPushToken(newToken, newUser.id);

      return true;
    } catch (error: any) {
      console.warn('--- AuthContext: signIn falhou ---', error);
      Alert.alert('Erro no login', error.message || 'Tente novamente.');
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    display_name: string,
    business_type: 'barbershop' | 'nails' | 'hair',
    phone: string
  ): Promise<boolean> => {
    try {
      console.log('--- AuthContext: signUp iniciado ---', { email, display_name, business_type, phone });
      const { token: newToken, user: newUser } = await apiSignUp(
        email,
        password,
        display_name,
        business_type,
        phone
      );
      setToken(newToken);
      setUser(newUser);
      setOnboardingComplete(false);
      console.log('--- Auth State Changed (signUp) ---', { token: newToken, user: newUser, isOnboarded: false });
      return true;
    } catch (error: any) {
      console.warn('--- AuthContext: signUp falhou ---', error);
      Alert.alert('Erro no cadastro', error.message || 'Não foi possível criar sua conta.');
      return false;
    }
  };

  const signOut = useCallback(async () => {
    sessionInvalidationPending = true;
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_DATA_KEY),
        SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY),
        SecureStore.deleteItemAsync(SESSION_TIMESTAMP_KEY),
      ]);
    } catch (e) {
      console.error('🔑 [AUTH] Error clearing SecureStore keys on signOut:', e);
    }
    setToken(null);
    setUser(null);
    setOnboardingComplete(false);
  }, []);

  const updateUser = (updatedUser: Professional) => {
    setUser(updatedUser);
  };

  const completeOnboarding = useCallback(async () => {
    setOnboardingComplete(true);
    try {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (e) {
      console.error('🔑 [AUTH] Failed to persist onboarding on completion:', e);
    }
  }, []);

  // Configurar handler global 401 para logout automático e redirecionamento
  useEffect(() => {
    const handleUnauthorized = () => {
      // Prevent re-render loops: skip if signOut is already in progress
      if (sessionInvalidationPending) {
        console.warn('[AUTH] 401 ignored — session invalidation already in progress.');
        return;
      }
      console.warn('[AUTH] 401 intercepted. Signing out and redirecting to login...');
      signOut().then(() => {
        router.replace('/login');
      });
    };
    setUnauthorizedHandler(handleUnauthorized);
    return () => {
      setUnauthorizedHandler(null);
      sessionInvalidationPending = false;
    };
  }, [signOut, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOnboarded,
        signIn,
        signUp,
        signOut,
        updateUser,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
