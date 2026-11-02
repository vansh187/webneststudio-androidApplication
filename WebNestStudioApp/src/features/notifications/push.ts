import { PermissionsAndroid, Platform } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import {
  type RemoteMessage,
  getMessaging,
  getToken,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';

import { webnestApi } from '../../api/webnestApi';

/** FCM topic the backend pushes "new blog post" notifications to (settings.push_blog_topic). */
export const BLOG_TOPIC = 'blog';
const LOGOUT_CLEANUP_TIMEOUT_MS = 4000;

export type PushPayload =
  | { type: 'chat'; conversationId: string; title?: string }
  | { type: 'blog'; slug: string; title?: string };

/**
 * False when the build has no Firebase config (android/app/google-services.json
 * missing) — every push call then becomes a no-op instead of throwing.
 */
export function isPushAvailable(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

/** The data block the backend attaches to each push (services/push_service.py). */
export function parsePushData(
  message: RemoteMessage | null | undefined,
): PushPayload | null {
  const data = message?.data ?? {};
  const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : undefined);
  if (str('type') === 'chat' && str('conversation_id')) {
    return { type: 'chat', conversationId: str('conversation_id')!, title: str('title') };
  }
  if (str('type') === 'blog' && str('slug')) {
    return { type: 'blog', slug: str('slug')!, title: str('title') };
  }
  return null;
}

/** Android 13+ asks the user; older versions grant notifications at install. */
async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) {
    return true;
  }
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Asks for notification permission, then registers this device with the
 * backend for chat pushes and subscribes it to the blog topic. Safe to call on
 * every sign-in / app start — the backend upserts the token.
 */
export async function registerForPush(): Promise<string | null> {
  if (!isPushAvailable()) {
    return null;
  }
  await ensureNotificationPermission();
  const messaging = getMessaging();
  const token = await getToken(messaging);
  await webnestApi.registerDevice(token);
  await subscribeToTopic(messaging, BLOG_TOPIC).catch(() => undefined);
  return token;
}

/** Re-registers a rotated token (onTokenRefresh). */
export async function registerToken(token: string): Promise<void> {
  await webnestApi.registerDevice(token);
}

/**
 * Stops pushes to this device. Must run while the session is still valid
 * (the unregister call is authenticated). Bounded so a slow network never
 * holds up logout; on failure the backend drops the token once FCM reports it.
 */
export async function unregisterFromPush(): Promise<void> {
  if (!isPushAvailable()) {
    return;
  }
  const cleanup = (async () => {
    const messaging = getMessaging();
    try {
      await webnestApi.unregisterDevice(await getToken(messaging));
    } catch {
      // best effort
    }
    await unsubscribeFromTopic(messaging, BLOG_TOPIC).catch(() => undefined);
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    cleanup,
    new Promise<void>(resolve => {
      timer = setTimeout(resolve, LOGOUT_CLEANUP_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
}
