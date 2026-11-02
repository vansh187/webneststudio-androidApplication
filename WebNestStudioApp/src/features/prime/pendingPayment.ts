import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingPayment = { payment_id: string; created_at: string };

const keyFor = (userId: string) => `webnest_prime_pending:${userId}`;

export async function getPendingPayment(userId: string): Promise<PendingPayment | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

export async function savePendingPayment(userId: string, paymentId: string) {
  try {
    await AsyncStorage.setItem(
      keyFor(userId),
      JSON.stringify({ payment_id: paymentId, created_at: new Date().toISOString() }),
    );
  } catch {
    // Non-fatal: the webhook still grants the pass, this only drives the UI.
  }
}

export async function clearPendingPayment(userId: string) {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Non-fatal.
  }
}

export function isPendingExpired(pending: PendingPayment, now = Date.now()) {
  return now - new Date(pending.created_at).getTime() > MAX_AGE_MS;
}
