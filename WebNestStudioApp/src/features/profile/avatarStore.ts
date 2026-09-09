import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local persistence for the client's profile photo.
 *
 * The FastAPI backend has no avatar endpoint yet, so we keep the picked image
 * on-device as a small base64 data URI (picker downsizes to <= 512px, quality
 * 0.7 — comfortably under AsyncStorage's per-key limit). When the backend gains
 * an upload route this store becomes the cache in front of it.
 */

const KEY = 'webneststudio.profile.avatar';

export async function getAvatar(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setAvatar(dataUri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, dataUri);
  } catch {
    // Non-fatal — the picked image just won't survive a restart.
  }
}

export async function clearAvatar(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
