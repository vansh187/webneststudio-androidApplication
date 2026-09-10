import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remembers which project the client last viewed in the Profile "Project
 * progress" card, so the dropdown choice survives an app restart. Purely a
 * local convenience — the source of truth is always the /api/me/projects list,
 * and every read is validated against it before use.
 */

const KEY = 'webneststudio.selectedProjectId';

export async function getSelectedProjectId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setSelectedProjectId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // Non-fatal — the selection just won't persist past this session.
  }
}
