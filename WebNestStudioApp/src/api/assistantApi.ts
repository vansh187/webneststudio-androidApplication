import { api } from './client';

// /payments/verify calls Razorpay, so it can outlast the app's usual 10 seconds.
const PAYMENT_TIMEOUT = 30000;

export type AssistantAccess = {
  active: boolean;
  expires_at: string | null;
  price_paise: number;
  pass_days: number;
  tokens_limit: number;
  tokens_used: number;
  is_prime: boolean;
  member_label: string | null;
};

export type AssistantUsage = {
  enabled: boolean;
  calls_used_today: number;
  calls_limit: number;
  provider_name: string;
  /** Missing when the server's paywall is switched off. */
  access?: AssistantAccess;
};

export type Membership = {
  is_prime: boolean;
  member_label: string | null;
  expires_at: string | null;
};

export type PaymentOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  name: string;
  description: string;
};

export type PaymentProof = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export const assistantApi = {
  membership: () =>
    api.get<Membership>('/api/assistant/membership').then(response => response.data),
  usage: () => api.get<AssistantUsage>('/api/assistant/usage').then(response => response.data),
  createOrder: () =>
    api
      .post<PaymentOrder>('/api/assistant/payments/order', undefined, { timeout: PAYMENT_TIMEOUT })
      .then(response => response.data),
  verifyPayment: (proof: PaymentProof) =>
    api
      .post<{ access: AssistantAccess }>('/api/assistant/payments/verify', proof, {
        timeout: PAYMENT_TIMEOUT,
      })
      .then(response => response.data),
};
