import type { AssistantAccess, AssistantUsage } from '../../api/assistantApi';

// The price API needs a login, so the signup and login screens use this fixed
// line. Update it if the server's price changes; the plan screen and the charge
// both use the server's.
export const PRIME_OFFER = 'WebNest AI, ₹299 for 30 days';

export type ChatAccess =
  | 'open'
  /** Never paid, or the 30 days are over. */
  | 'locked'
  /** Still in the paid period, but the allowance is used. */
  | 'allowanceUsed'
  /** The server's paywall or assistant is off: offer neither chat nor payment. */
  | 'unavailable';

export function chatAccess(usage: AssistantUsage): ChatAccess {
  if (!usage.access || !usage.enabled) {
    return 'unavailable';
  }
  if (usage.access.active) {
    return 'open';
  }
  return usage.access.is_prime ? 'allowanceUsed' : 'locked';
}

/** A repeat buyer is already is_prime, so success needs `active` as well. */
export function isPaymentConfirmed(access: AssistantAccess | undefined) {
  return Boolean(access?.is_prime && access.active);
}

export function formatPrice(paise: number) {
  return `₹${Number((paise / 100).toFixed(2))}`;
}
