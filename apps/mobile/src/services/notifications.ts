import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// SDK 53+: expo-notifications executa side effects ao ser importado.
// Em Expo Go isso crasha. Usamos import() dinâmico para adiar o load.
const isExpoGo = Constants.appOwnership === 'expo';

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    console.warn('[Push] Ignorado: rodando no Expo Go — abra o APK instalado diretamente');
    return null;
  }
  if (!Device.isDevice) {
    console.warn('[Push] Ignorado: emulador (Device.isDevice === false)');
    return null;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // SDK 55: campos obrigatórios em NotificationBehavior
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permissão negada:', finalStatus);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('agendamentos', {
      name: 'Agendamentos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D2FF',
      sound: 'default',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('[Push] projectId não encontrado em Constants.expoConfig.extra.eas.projectId');
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('[Push] Token registrado:', tokenData.data);
  return tokenData.data;
}
