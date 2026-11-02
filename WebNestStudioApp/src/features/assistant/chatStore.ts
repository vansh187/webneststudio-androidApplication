import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AiMessage } from './history';

const MAX_STORED = 100;

export type StoredChat = { messages: AiMessage[] };

const keyFor = (userId: string) => `webnest_ai_chat:${userId}`;

// Accounts that have logged out. A chat screen closing just after logout saves
// on its way out, and that must not put the deleted conversation back.
const closed = new Set<string>();

/** Called when a chat screen opens for this account. */
export function openChat(userId: string) {
  closed.delete(userId);
}

/** Logout or account deletion: deletes the chat and refuses later saves. */
export async function closeChat(userId: string) {
  closed.add(userId);
  await clearChat(userId);
}

export async function loadChat(userId: string): Promise<StoredChat | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as StoredChat) : null;
  } catch {
    return null;
  }
}

export async function saveChat(userId: string, chat: StoredChat) {
  if (closed.has(userId)) {
    return;
  }
  try {
    await AsyncStorage.setItem(
      keyFor(userId),
      JSON.stringify({ ...chat, messages: chat.messages.slice(-MAX_STORED) }),
    );
  } catch {
    // Non-fatal: the conversation still works for this visit.
  }
}

export async function clearChat(userId: string) {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Non-fatal.
  }
}
