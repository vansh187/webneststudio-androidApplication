/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { assistantApi } from '../src/api/assistantApi';
import { useAssistantChat } from '../src/features/assistant/useAssistantChat';
import { usePrimePayment } from '../src/features/prime/PrimeProvider';
import { setNextLoginWantsPrime, takePrimeIntent } from '../src/features/prime/signupIntent';
import { AiChatScreen } from '../src/screens/AiChatScreen';
import { LoginScreen } from '../src/screens/LoginScreen';
import { PrimePlanScreen } from '../src/screens/PrimePlanScreen';
import { SignupScreen } from '../src/screens/SignupScreen';

const mockAuth: any = {
  user: { id: 'user-1', email: 'a@x.co', full_name: 'Asha' },
  login: jest.fn(async () => undefined),
  signup: jest.fn(),
  logout: jest.fn(async () => undefined),
  loginWithBiometrics: jest.fn(async () => true),
  biometricEnabled: false,
  biometry: null,
};

jest.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../src/api/assistantApi', () => ({
  assistantApi: { usage: jest.fn(), membership: jest.fn() },
}));
jest.mock('../src/features/prime/PrimeProvider', () => ({
  usePrimePayment: jest.fn(),
}));
jest.mock('../src/features/assistant/useAssistantChat', () => ({
  useAssistantChat: jest.fn(),
}));
jest.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 0 }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('../src/utils/linking', () => ({ openExternal: jest.fn() }));

const usageApi = assistantApi.usage as jest.Mock;
const paymentHook = usePrimePayment as jest.Mock;
const chatHook = useAssistantChat as jest.Mock;

const access = {
  active: false,
  expires_at: null,
  price_paise: 29900,
  pass_days: 30,
  tokens_limit: 2000000,
  tokens_used: 0,
  is_prime: false,
  member_label: null,
};
const usage = (over: object = {}, top: object = {}) => ({
  enabled: true,
  calls_used_today: 0,
  calls_limit: 0,
  provider_name: 'Anthropic',
  access: { ...access, ...over },
  ...top,
});

const act = ReactTestRenderer.act;

function textOf(node: ReactTestRenderer.ReactTestInstance | string): string {
  if (typeof node === 'string') {
    return node;
  }
  return node.children.map(textOf).join('');
}

async function render(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    );
  });
  // React Query delivers results on a timer, not a microtask.
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 5);
      });
    }
  });
  return tree;
}

function payment(over: object = {}) {
  return {
    phase: 'idle',
    message: null,
    paymentId: null,
    pay: jest.fn(),
    checkAgain: jest.fn(),
    ...over,
  };
}

function chat(over: object = {}) {
  return {
    messages: [],
    streaming: false,
    hydrated: true,
    blockedMessage: null,
    send: jest.fn(() => true),
    retry: jest.fn(),
    stop: jest.fn(),
    newChat: jest.fn(),
    ...over,
  };
}

const planNav = () => ({ replace: jest.fn(), navigate: jest.fn() });
const planProps = (navigation: object) => ({ navigation, route: {} } as any);

/** The Pay button: the only pressable whose text starts with PAY. */
function payButton(root: ReactTestRenderer.ReactTestInstance) {
  return root.find(
    node => typeof node.type !== 'string' && node.props.title?.startsWith?.('Pay'),
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setNextLoginWantsPrime(false);
  paymentHook.mockReturnValue(payment());
  chatHook.mockReturnValue(chat());
  usageApi.mockResolvedValue(usage());
  mockAuth.login.mockResolvedValue(undefined);
});

describe('Prime plan screen', () => {
  it('shows the price and days from the server', async () => {
    usageApi.mockResolvedValue(usage({ price_paise: 49900, pass_days: 60 }));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    const text = textOf(tree.root);
    expect(text).toContain('₹499');
    expect(text).toContain('60 days');
    expect(text).toContain('WebNest Prime Member');
    expect(text).toContain('non-refundable');
  });

  it.each([
    ['new member', usage()],
    ['allowance used', usage({ is_prime: true, active: false, tokens_used: 2000000 })],
    ['active member', usage({ is_prime: true, active: true, member_label: 'WebNest Prime Member' })],
  ])('never shows tokens to a customer (%s)', async (_name, value) => {
    usageApi.mockResolvedValue(value);
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(textOf(tree.root).toLowerCase()).not.toContain('token');
  });

  it('keeps Pay disabled until the terms are ticked, then pays with the time ticked', async () => {
    const pay = jest.fn();
    paymentHook.mockReturnValue(payment({ pay }));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(payButton(tree.root).props.disabled).toBe(true);

    const box = tree.root.find(
      node => typeof node.type !== 'string' && node.props.accessibilityRole === 'checkbox',
    );
    await act(async () => box.props.onPress());
    expect(payButton(tree.root).props.disabled).toBe(false);

    await act(async () => payButton(tree.root).props.onPress());
    expect(pay).toHaveBeenCalledTimes(1);
    expect(new Date(pay.mock.calls[0][0]).getTime()).not.toBeNaN();
  });

  it('unticking disables Pay again', async () => {
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    const box = () =>
      tree.root.find(
        node => typeof node.type !== 'string' && node.props.accessibilityRole === 'checkbox',
      );
    await act(async () => box().props.onPress());
    await act(async () => box().props.onPress());
    expect(payButton(tree.root).props.disabled).toBe(true);
  });

  it.each(['starting', 'open', 'verifying', 'confirming', 'pending'])(
    'blocks paying during %s',
    async phase => {
      paymentHook.mockReturnValue(payment({ phase }));
      const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
      const box = tree.root.find(
        node => typeof node.type !== 'string' && node.props.accessibilityRole === 'checkbox',
      );
      await act(async () => box.props.onPress());
      const button = payButton(tree.root);
      expect(button.props.disabled || button.props.loading).toBeTruthy();
    },
  );

  it('tells a pending member not to pay again and offers Check again', async () => {
    const checkAgain = jest.fn();
    paymentHook.mockReturnValue(payment({ phase: 'pending', checkAgain }));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(textOf(tree.root)).toContain("there's no need to pay again");
    const check = tree.root.find(
      node => typeof node.type !== 'string' && node.props.title === 'Check again',
    );
    await act(async () => check.props.onPress());
    expect(checkAgain).toHaveBeenCalledTimes(1);
  });

  it('shows a rejected payment id and a way to contact support', async () => {
    paymentHook.mockReturnValue(
      payment({
        phase: 'rejected',
        paymentId: 'pay_1',
        message: 'This payment could not be verified. If money was deducted, please contact support.',
      }),
    );
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    const text = textOf(tree.root);
    expect(text).toContain('could not be verified');
    expect(text).toContain('pay_1');
    expect(text).toContain('Contact support');
  });

  it('offers no payment when the paywall is off', async () => {
    usageApi.mockResolvedValue(usage({}, { access: undefined }));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(textOf(tree.root)).toContain('not available right now');
    expect(
      tree.root.findAll(
        node => typeof node.type !== 'string' && node.props.title?.startsWith?.('Pay'),
      ),
    ).toHaveLength(0);
  });

  it('offers a buy-again when the allowance is used up', async () => {
    usageApi.mockResolvedValue(usage({ is_prime: true, active: false }));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(textOf(tree.root)).toContain('Allowance used up');
    expect(payButton(tree.root)).toBeTruthy();
  });

  it('replaces itself with the chat for an active member', async () => {
    usageApi.mockResolvedValue(usage({ is_prime: true, active: true }));
    const navigation = planNav();
    const tree = await render(<PrimePlanScreen {...planProps(navigation)} />);
    const open = tree.root.find(
      node => typeof node.type !== 'string' && node.props.title === 'Open WebNest AI',
    );
    await act(async () => open.props.onPress());
    expect(navigation.replace).toHaveBeenCalledWith('AiChat');
  });

  it('shows an error with no payment when the plan cannot load', async () => {
    usageApi.mockRejectedValue(new Error('offline'));
    const tree = await render(<PrimePlanScreen {...planProps(planNav())} />);
    expect(
      tree.root.findAll(
        node => typeof node.type !== 'string' && node.props.title?.startsWith?.('Pay'),
      ),
    ).toHaveLength(0);
  });
});

describe('AI chat screen', () => {
  const activeUsage = usage({ is_prime: true, active: true });
  const failed = (id: string, action: string) => ({
    id,
    role: 'assistant',
    content: '',
    status: 'failed',
    error: 'Connection lost',
    action,
  });
  const user = (id: string) => ({ id, role: 'user', content: `q${id}` });
  const findLink = (root: ReactTestRenderer.ReactTestInstance, label: string) =>
    root.findAll(node => node.props.children === label && !!node.props.onPress);

  beforeEach(() => {
    usageApi.mockResolvedValue(activeUsage);
  });

  it('a 402 replaces the chat with the plan, so only one chat exists after paying', async () => {
    const navigation = planNav();
    await render(<AiChatScreen {...planProps(navigation)} />);
    await act(async () => chatHook.mock.calls[0][0].onPaymentRequired());
    expect(navigation.replace).toHaveBeenCalledWith('PrimePlan');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('a lost session logs out', async () => {
    await render(<AiChatScreen {...planProps(planNav())} />);
    await act(async () => chatHook.mock.calls[0][0].onSessionLost());
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
  });

  it('shows Retry only on the latest reply', async () => {
    const retry = jest.fn();
    chatHook.mockReturnValue(
      chat({
        retry,
        messages: [user('1'), failed('old', 'retry'), user('2'), failed('new', 'retry')],
      }),
    );
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    const links = findLink(tree.root, 'Retry');
    expect(links.length).toBeGreaterThan(0);
    await act(async () => links[0].props.onPress());
    expect(retry).toHaveBeenCalledWith('new');
    expect(retry).not.toHaveBeenCalledWith('old');
  });

  it('shows no Retry on an older failure once a newer message exists', async () => {
    chatHook.mockReturnValue(
      chat({
        messages: [
          user('1'),
          failed('old', 'retry'),
          user('2'),
          { id: 'ok', role: 'assistant', content: 'fine', status: 'done' },
        ],
      }),
    );
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    expect(findLink(tree.root, 'Retry')).toHaveLength(0);
  });

  it('shows no Retry for a failure with no action', async () => {
    chatHook.mockReturnValue(chat({ messages: [user('1'), failed('f', undefined as any)] }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    expect(findLink(tree.root, 'Retry')).toHaveLength(0);
  });

  it('offers New chat for a too-large conversation', async () => {
    const newChat = jest.fn();
    chatHook.mockReturnValue(chat({ newChat, messages: [user('1'), failed('f', 'newChat')] }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    const links = findLink(tree.root, 'New chat');
    await act(async () => links[0].props.onPress());
    expect(newChat).toHaveBeenCalled();
  });

  it('shows no tokens and no language picker', async () => {
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    const text = textOf(tree.root).toLowerCase();
    expect(text).not.toContain('token');
    expect(text).not.toContain('python');
    expect(text).toContain('ask anything');
  });

  const input = (root: ReactTestRenderer.ReactTestInstance) =>
    root.find(node => node.props.placeholder === 'Ask a question' && !!node.props.onChangeText);
  const sendButton = (root: ReactTestRenderer.ReactTestInstance) =>
    root.find(
      node => typeof node.type !== 'string' && node.props.accessibilityLabel === 'Send',
    );

  it('sends 500 characters and clears the box', async () => {
    const send = jest.fn(() => true);
    chatHook.mockReturnValue(chat({ send }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    await act(async () => input(tree.root).props.onChangeText('a'.repeat(500)));
    await act(async () => sendButton(tree.root).props.onPress());
    expect(send).toHaveBeenCalledTimes(1);
    expect(input(tree.root).props.value).toBe('');
  });

  it('blocks 501 characters', async () => {
    const send = jest.fn(() => true);
    chatHook.mockReturnValue(chat({ send }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    await act(async () => input(tree.root).props.onChangeText('a'.repeat(501)));
    expect(sendButton(tree.root).props.disabled).toBe(true);
  });

  it('shows Stop instead of Send while streaming', async () => {
    const stop = jest.fn();
    chatHook.mockReturnValue(chat({ stop, streaming: true }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    const button = tree.root.find(
      node => typeof node.type !== 'string' && node.props.accessibilityLabel === 'Stop reply',
    );
    await act(async () => button.props.onPress());
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('locks sending and links to the plan when the allowance is used', async () => {
    usageApi.mockResolvedValue(usage({ is_prime: true, active: false }));
    const navigation = planNav();
    const tree = await render(<AiChatScreen {...planProps(navigation)} />);
    expect(textOf(tree.root)).toContain('full WebNest AI allowance');
    await act(async () => input(tree.root).props.onChangeText('hello'));
    expect(sendButton(tree.root).props.disabled).toBe(true);
    const plan = tree.root.find(
      node => typeof node.type !== 'string' && node.props.title === 'View plan',
    );
    await act(async () => plan.props.onPress());
    expect(navigation.replace).toHaveBeenCalledWith('PrimePlan');
  });

  it('keeps sending disabled under a daily cap', async () => {
    chatHook.mockReturnValue(chat({ blockedMessage: 'You have used your allowance for today.' }));
    const tree = await render(<AiChatScreen {...planProps(planNav())} />);
    await act(async () => input(tree.root).props.onChangeText('hello'));
    expect(sendButton(tree.root).props.disabled).toBe(true);
    expect(textOf(tree.root)).toContain('allowance for today');
  });
});

describe('Prime option at login', () => {
  const form = (root: ReactTestRenderer.ReactTestInstance) => {
    const fields = root.findAll(
      node => typeof node.type !== 'string' && !!node.props.label && !!node.props.onChangeText,
    );
    return (label: string) => fields.find(field => field.props.label === label);
  };
  const logIn = (root: ReactTestRenderer.ReactTestInstance) =>
    root.find(node => typeof node.type !== 'string' && node.props.title === 'Log in');
  const prime = (root: ReactTestRenderer.ReactTestInstance) =>
    root.find(node => typeof node.type !== 'string' && node.props.accessibilityRole === 'checkbox');

  async function fillAndSubmit(root: ReactTestRenderer.ReactTestInstance) {
    const field = form(root);
    await act(async () => {
      field('Email')?.props.onChangeText('a@x.co');
      field('Password')?.props.onChangeText('secret-pass');
    });
    await act(async () => {
      logIn(root).props.onPress();
    });
    await act(async () => {
      for (let i = 0; i < 30; i += 1) {
        await Promise.resolve();
      }
    });
  }

  const loginProps = (navigation: object) => ({ navigation, route: {} } as any);
  const unverified = () => ({
    isAxiosError: true,
    response: { status: 401, data: { detail: 'Please verify your email address before logging in' } },
  });

  it('is offered, unticked, without showing tokens', async () => {
    const tree = await render(<LoginScreen {...loginProps(planNav())} />);
    const text = textOf(tree.root);
    expect(text).toContain('Become a WebNest Prime Member');
    expect(text).toContain('₹299');
    expect(text.toLowerCase()).not.toContain('token');
    expect(prime(tree.root).props.accessibilityState.checked).toBe(false);
  });

  it('a normal login does not open the plan screen', async () => {
    const tree = await render(<LoginScreen {...loginProps(planNav())} />);
    await fillAndSubmit(tree.root);
    expect(mockAuth.login).toHaveBeenCalledWith('a@x.co', 'secret-pass');
    expect(await takePrimeIntent('a@x.co')).toBe(false);
  });

  it('ticking it opens the plan screen after logging in', async () => {
    const tree = await render(<LoginScreen {...loginProps(planNav())} />);
    await act(async () => prime(tree.root).props.onPress());
    await fillAndSubmit(tree.root);
    expect(await takePrimeIntent('a@x.co')).toBe(true);
    // Only once.
    expect(await takePrimeIntent('a@x.co')).toBe(false);
  });

  it('a wrong password drops the wish', async () => {
    mockAuth.login.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { detail: 'Wrong password' } } });
    const tree = await render(<LoginScreen {...loginProps(planNav())} />);
    await act(async () => prime(tree.root).props.onPress());
    await fillAndSubmit(tree.root);
    expect(await takePrimeIntent('a@x.co')).toBe(false);
  });

  it('an unverified account still reaches the plan screen after verifying', async () => {
    mockAuth.login.mockRejectedValue(unverified());
    const navigation = planNav();
    const tree = await render(<LoginScreen {...loginProps(navigation)} />);
    await act(async () => prime(tree.root).props.onPress());
    await fillAndSubmit(tree.root);
    expect(navigation.navigate).toHaveBeenCalledWith('VerifyOtp', { email: 'a@x.co', sendCode: true });
    expect(await takePrimeIntent('a@x.co')).toBe(true);
  });

  it('an unverified account that did not tick it is not sent to payment', async () => {
    mockAuth.login.mockRejectedValue(unverified());
    const navigation = planNav();
    const tree = await render(<LoginScreen {...loginProps(navigation)} />);
    await fillAndSubmit(tree.root);
    expect(navigation.navigate).toHaveBeenCalledWith('VerifyOtp', { email: 'a@x.co', sendCode: true });
    expect(await takePrimeIntent('a@x.co')).toBe(false);
  });

  it('the new-user link opens signup with Prime chosen', async () => {
    const navigation = planNav();
    const tree = await render(<LoginScreen {...loginProps(navigation)} />);
    const link = tree.root
      .findAll(node => typeof node.type !== 'string' && !!node.props.onPress)
      .find(node => textOf(node).includes('Join as a Prime member'));
    await act(async () => link?.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('Signup', { plan: 'prime' });
  });
});

describe('Prime option at signup', () => {
  const radios = (root: ReactTestRenderer.ReactTestInstance) =>
    root.findAll(node => typeof node.type !== 'string' && node.props.accessibilityRole === 'radio', {
      deep: false,
    });
  const signupProps = (params?: object) =>
    ({ navigation: { replace: jest.fn(), navigate: jest.fn() }, route: { params } } as any);
  const submitLabel = (root: ReactTestRenderer.ReactTestInstance, label: string) =>
    root.findAll(node => typeof node.type !== 'string' && node.props.title === label);

  it('defaults to the free account, without showing tokens', async () => {
    const tree = await render(<SignupScreen {...signupProps()} />);
    expect(radios(tree.root)[0].props.accessibilityState.selected).toBe(true);
    expect(submitLabel(tree.root, 'Create account').length).toBeGreaterThan(0);
    expect(textOf(tree.root).toLowerCase()).not.toContain('token');
  });

  it('starts on Prime when arriving from the login link', async () => {
    const tree = await render(<SignupScreen {...signupProps({ plan: 'prime' })} />);
    expect(radios(tree.root)[1].props.accessibilityState.selected).toBe(true);
    expect(submitLabel(tree.root, 'Continue to Prime').length).toBeGreaterThan(0);
  });
});
