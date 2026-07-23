import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { PushApi } from '@/api/resources';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let lastRegisteredToken: string | null = null;

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't available on simulators/emulators

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;
}

/** Best-effort: registers this device for push notifications. Never throws — a denied
 * permission or missing physical device just means push stays off, silently. */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await PushApi.registerToken(token);
    lastRegisteredToken = token;
  } catch {
    // Non-fatal: the app works fine without push.
  }
}

/** Best-effort: unregisters this device's push token, e.g. on logout. */
export async function clearPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await PushApi.unregisterToken(lastRegisteredToken);
  } catch {
    // Non-fatal.
  } finally {
    lastRegisteredToken = null;
  }
}
