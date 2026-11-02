import type { AssistantAccess } from '../../api/assistantApi';
import { getHttpStatus } from '../../api/client';
import { isPaymentConfirmed } from './access';

export type VerifyOutcome = 'paid' | 'confirming' | 'rejected';

export function outcomeOfVerified(access: AssistantAccess | undefined): VerifyOutcome {
  return isPaymentConfirmed(access) ? 'paid' : 'confirming';
}

/**
 * Only a definite refusal counts as rejected. Timeouts, network errors and 5xx
 * mean "no answer yet", because money may have moved: never call those failed.
 */
export function outcomeOfVerifyError(error: unknown): VerifyOutcome {
  const status = getHttpStatus(error);
  return status === 400 || status === 404 ? 'rejected' : 'confirming';
}

type CheckoutError = { code?: number; description?: string; error?: { reason?: string } };

// com.razorpay.Checkout.PAYMENT_CANCELED. The user closed the sheet or backed out.
const PAYMENT_CANCELED = 0;

export function isCheckoutClosedByUser(error: unknown) {
  return (error as CheckoutError | undefined)?.code === PAYMENT_CANCELED;
}

/**
 * The SDK's description is sometimes a JSON string wrapping the real reason, as
 * { error: { description } }.
 */
export function checkoutErrorMessage(error: unknown) {
  const fallback = 'The payment did not go through. Please try again.';
  const description = (error as CheckoutError | undefined)?.description;
  if (typeof description !== 'string' || !description.trim()) {
    return fallback;
  }
  if (!description.trim().startsWith('{')) {
    return description;
  }
  try {
    const parsed = JSON.parse(description) as { error?: { description?: unknown } };
    return typeof parsed.error?.description === 'string' ? parsed.error.description : fallback;
  } catch {
    return fallback;
  }
}
