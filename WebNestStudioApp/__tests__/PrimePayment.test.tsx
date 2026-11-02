/**
 * @format
 */

import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RazorpayCheckout from 'react-native-razorpay';

import { assistantApi } from '../src/api/assistantApi';
import { showAlert } from '../src/components/AppAlert';
import { PrimeProvider, usePrimePayment } from '../src/features/prime/PrimeProvider';
import { getPendingPayment, savePendingPayment } from '../src/features/prime/pendingPayment';

jest.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', full_name: 'Asha', email: 'a@x.co' } }),
}));
jest.mock('../src/api/assistantApi', () => ({
  assistantApi: {
    membership: jest.fn(),
    usage: jest.fn(),
    createOrder: jest.fn(),
    verifyPayment: jest.fn(),
  },
}));
jest.mock('../src/components/AppAlert', () => ({ showAlert: jest.fn() }));
jest.mock('../src/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => false },
}));

const api = assistantApi as jest.Mocked<typeof assistantApi>;
const open = RazorpayCheckout.open as jest.Mock;

const order = {
  order_id: 'order_1',
  amount: 29900,
  currency: 'INR',
  key_id: 'rzp_test_1',
  name: 'WebNest Studio',
  description: 'WebNest Prime Member, 30 days',
};
const proof = {
  razorpay_order_id: 'order_1',
  razorpay_payment_id: 'pay_1',
  razorpay_signature: 'sig',
};
const activeAccess = {
  active: true,
  expires_at: '2026-12-02T10:30:00Z',
  price_paise: 29900,
  pass_days: 30,
  tokens_limit: 2000000,
  tokens_used: 0,
  is_prime: true,
  member_label: 'WebNest Prime Member',
};
const inactiveUsage = {
  enabled: true,
  calls_used_today: 0,
  calls_limit: 0,
  provider_name: 'Anthropic',
  access: { ...activeAccess, active: false, is_prime: false },
};
const activeUsage = { ...inactiveUsage, access: activeAccess };

const httpError = (status: number) => ({ isAxiosError: true, response: { status, data: { detail: `E${status}` } } });

let payment: ReturnType<typeof usePrimePayment>;
let tree: ReactTestRenderer.ReactTestRenderer;

function Probe() {
  payment = usePrimePayment();
  return null;
}

async function settle() {
  await ReactTestRenderer.act(async () => {
    for (let i = 0; i < 30; i += 1) {
      await Promise.resolve();
    }
  });
}

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <PrimeProvider>
          <Probe />
        </PrimeProvider>
      </QueryClientProvider>,
    );
  });
  await settle();
}

async function pay() {
  await ReactTestRenderer.act(async () => {
    payment.pay('2026-11-02T10:00:00.000Z');
  });
  await settle();
}

async function advance(ms: number) {
  await ReactTestRenderer.act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  await settle();
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  api.createOrder.mockResolvedValue(order);
  api.usage.mockResolvedValue(inactiveUsage);
  open.mockResolvedValue(proof);
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });
  jest.useRealTimers();
});

describe('Prime payment flow', () => {
  it('confirms from verify, clears the pending record and says welcome', async () => {
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await mount();
    await pay();

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rzp_test_1',
        amount: 29900,
        order_id: 'order_1',
        notes: { terms_version: '2026-11-01', terms_accepted_at: '2026-11-02T10:00:00.000Z' },
      }),
    );
    expect(api.verifyPayment).toHaveBeenCalledWith(proof);
    expect(await getPendingPayment('user-1')).toBeNull();
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
    expect(payment.phase).toBe('idle');
  });

  it('saves the pending record before asking the server to verify', async () => {
    let pendingDuringVerify: unknown;
    api.verifyPayment.mockImplementation(async () => {
      pendingDuringVerify = await getPendingPayment('user-1');
      return { access: activeAccess };
    });
    await mount();
    await pay();
    expect(pendingDuringVerify).toEqual(expect.objectContaining({ payment_id: 'pay_1' }));
  });

  it('starts one order and one checkout on a double tap in the same instant', async () => {
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await mount();
    await ReactTestRenderer.act(async () => {
      payment.pay('t');
      payment.pay('t');
    });
    await settle();
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
    expect(api.verifyPayment).toHaveBeenCalledTimes(1);
  });

  it('starts one order on a tap during each later step', async () => {
    let finishOrder: (value: typeof order) => void = () => {};
    api.createOrder.mockReturnValue(
      new Promise(resolve => {
        finishOrder = resolve;
      }),
    );
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await mount();
    await ReactTestRenderer.act(async () => {
      payment.pay('t');
    });
    await settle();
    expect(payment.phase).toBe('starting');
    await ReactTestRenderer.act(async () => {
      payment.pay('t');
    });
    await settle();
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => {
      finishOrder(order);
    });
    await settle();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('runs one confirmation when launch and a foreground event arrive together', async () => {
    let onChange: (state: string) => void = () => {};
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(
      (_type: string, handler: (state: string) => void) => {
        onChange = handler;
        return { remove: jest.fn() };
      },
    );
    await savePendingPayment('user-1', 'pay_old');
    api.usage.mockResolvedValue(activeUsage);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <PrimeProvider>
            <Probe />
          </PrimeProvider>
        </QueryClientProvider>,
      );
      onChange('active');
      onChange('active');
    });
    await settle();

    const welcomes = (showAlert as jest.Mock).mock.calls.filter(
      call => call[0] === 'Payment confirmed',
    );
    expect(welcomes).toHaveLength(1);
  });

  it('runs one confirmation when a foreground event lands while confirming', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    let onChange: (state: string) => void = () => {};
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(
      (_type: string, handler: (state: string) => void) => {
        onChange = handler;
        return { remove: jest.fn() };
      },
    );
    await savePendingPayment('user-1', 'pay_old');
    await mount();
    expect(payment.phase).toBe('confirming');
    const callsBefore = api.usage.mock.calls.length;

    await ReactTestRenderer.act(async () => {
      onChange('active');
    });
    await settle();
    await advance(5000);

    // One poll for the 5s that passed. A second loop would have added its own.
    expect(api.usage.mock.calls.length - callsBefore).toBe(1);
  });

  it('does not open checkout if the user logged out during the order call', async () => {
    let finishOrder: (value: typeof order) => void = () => {};
    api.createOrder.mockReturnValue(
      new Promise(resolve => {
        finishOrder = resolve;
      }),
    );
    await mount();
    await pay();
    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });
    await ReactTestRenderer.act(async () => {
      finishOrder(order);
    });
    await settle();
    expect(open).not.toHaveBeenCalled();
    await mount();
  });

  it('keeps the record but does not verify if the user logged out during checkout', async () => {
    let finishCheckout: (value: typeof proof) => void = () => {};
    open.mockReturnValue(
      new Promise(resolve => {
        finishCheckout = resolve;
      }),
    );
    await mount();
    await pay();
    expect(open).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });
    await ReactTestRenderer.act(async () => {
      finishCheckout(proof);
    });
    await settle();
    expect(api.verifyPayment).not.toHaveBeenCalled();
    expect(await getPendingPayment('user-1')).toEqual(
      expect.objectContaining({ payment_id: 'pay_1' }),
    );
    // That account's next sign-in finishes the job.
    api.usage.mockResolvedValue(activeUsage);
    await mount();
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('lets a rejected user try paying again', async () => {
    api.verifyPayment.mockRejectedValueOnce(httpError(400));
    await mount();
    await pay();
    expect(payment.phase).toBe('rejected');
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await pay();
    expect(api.createOrder).toHaveBeenCalledTimes(2);
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
  });

  it('lets a user pay after closing checkout', async () => {
    open.mockRejectedValueOnce({ code: 0, description: 'cancelled' });
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await mount();
    await pay();
    expect(payment.phase).toBe('idle');
    await pay();
    expect(api.createOrder).toHaveBeenCalledTimes(2);
    expect(api.verifyPayment).toHaveBeenCalledTimes(1);
  });

  it('confirms a repeat buyer only once the new pass is active', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const spent = { ...activeAccess, active: false, tokens_used: 2000000 };
    api.verifyPayment.mockResolvedValue({ access: spent });
    api.usage.mockResolvedValue({ ...inactiveUsage, access: spent });
    await mount();
    await pay();
    await advance(5000);
    expect(payment.phase).toBe('confirming');
    expect(showAlert).not.toHaveBeenCalled();

    api.usage.mockResolvedValue(activeUsage);
    await advance(5000);
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
  });

  it('Check again finds a payment confirmed after the first round', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    api.verifyPayment.mockRejectedValue({ isAxiosError: true });
    await mount();
    await pay();
    await advance(5000 * 11);
    expect(payment.phase).toBe('pending');

    api.usage.mockResolvedValue(activeUsage);
    await ReactTestRenderer.act(async () => {
      payment.checkAgain();
    });
    await settle();
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('never treats the Razorpay callback alone as Prime', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    api.verifyPayment.mockRejectedValue(httpError(503));
    await mount();
    await pay();
    expect(showAlert).not.toHaveBeenCalled();
    expect(payment.phase).toBe('confirming');
  });

  it('shows no error when the user closes checkout', async () => {
    open.mockRejectedValue({ code: 0, description: 'Payment cancelled by user' });
    await mount();
    await pay();
    expect(payment.phase).toBe('idle');
    expect(payment.message).toBeNull();
    expect(api.verifyPayment).not.toHaveBeenCalled();
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('shows the reason when a payment fails', async () => {
    open.mockRejectedValue({ code: 2, description: 'Card declined' });
    await mount();
    await pay();
    expect(payment.phase).toBe('idle');
    expect(payment.message).toBe('Card declined');
  });

  it('treats an already-active member (409) as no error', async () => {
    api.createOrder.mockRejectedValue(httpError(409));
    await mount();
    await pay();
    expect(payment.phase).toBe('idle');
    expect(payment.message).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('shows the server message for other order errors', async () => {
    api.createOrder.mockRejectedValue(httpError(429));
    await mount();
    await pay();
    expect(payment.message).toBe('E429');
  });

  it('rejects on a 400, clears pending and keeps the payment id', async () => {
    api.verifyPayment.mockRejectedValue(httpError(400));
    await mount();
    await pay();
    expect(payment.phase).toBe('rejected');
    expect(payment.paymentId).toBe('pay_1');
    expect(payment.message).toMatch(/could not be verified/);
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('never fails on a timeout: confirming, then pending, keeping the record', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    api.verifyPayment.mockRejectedValue({ isAxiosError: true });
    api.usage.mockRejectedValue({ isAxiosError: true });
    await mount();
    await pay();
    expect(payment.phase).toBe('confirming');
    expect(payment.message).toBeNull();

    await advance(5000 * 11);
    expect(api.usage).toHaveBeenCalledTimes(12);
    expect(payment.phase).toBe('pending');
    expect(payment.message).toBeNull();
    expect(await getPendingPayment('user-1')).toEqual(
      expect.objectContaining({ payment_id: 'pay_1' }),
    );
  });

  it('keeps confirming when verify says 200 but the pass is not active yet', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    api.verifyPayment.mockResolvedValue({ access: { ...activeAccess, active: false } });
    await mount();
    await pay();
    expect(payment.phase).toBe('confirming');
    expect(showAlert).not.toHaveBeenCalled();

    api.usage.mockResolvedValue(activeUsage);
    await advance(5000);
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('finishes a pending payment after the app was killed and reopened', async () => {
    await savePendingPayment('user-1', 'pay_old');
    api.usage.mockResolvedValue(activeUsage);
    await mount();
    expect(showAlert).toHaveBeenCalledWith('Payment confirmed', 'Welcome to WebNest Prime!');
    expect(await getPendingPayment('user-1')).toBeNull();
  });

  it('refuses a new order while an earlier payment is unconfirmed', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    await savePendingPayment('user-1', 'pay_old');
    await mount();
    await pay();
    expect(api.createOrder).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('drops a pending record after 24 hours and points to support', async () => {
    await AsyncStorage.setItem(
      'webnest_prime_pending:user-1',
      JSON.stringify({
        payment_id: 'pay_old',
        created_at: new Date(Date.now() - 25 * 3600000).toISOString(),
      }),
    );
    await mount();
    expect(await getPendingPayment('user-1')).toBeNull();
    expect(showAlert).toHaveBeenCalledWith(
      'Payment not confirmed',
      expect.stringContaining('pay_old'),
    );
    expect(payment.phase).toBe('idle');
  });

  it("ignores another user's pending record", async () => {
    await savePendingPayment('user-2', 'pay_other');
    api.verifyPayment.mockResolvedValue({ access: activeAccess });
    await mount();
    expect(api.usage).not.toHaveBeenCalled();
    expect(payment.phase).toBe('idle');
  });
});
