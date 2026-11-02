/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AxiosError, AxiosResponse } from 'axios';

import { getRetryAfterSeconds, isUnverifiedEmailError } from '../src/api/client';
import { webnestApi } from '../src/api/webnestApi';
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext';
import { LoginScreen } from '../src/screens/LoginScreen';
import { SignupScreen } from '../src/screens/SignupScreen';
import { VerifyOtpScreen } from '../src/screens/VerifyOtpScreen';

jest.mock('../src/api/webnestApi', () => ({
  webnestApi: {
    login: jest.fn(),
    signup: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    resetPassword: jest.fn(),
    me: jest.fn(),
  },
}));
jest.mock('../src/features/auth/biometrics', () => ({
  getSupportedBiometry: jest.fn(async () => null),
  isBiometricLoginEnabled: jest.fn(async () => false),
  enableBiometricLogin: jest.fn(async () => false),
  disableBiometricLogin: jest.fn(async () => undefined),
  getBiometricCredentials: jest.fn(async () => null),
}));

const api = webnestApi as jest.Mocked<typeof webnestApi>;

function httpError(status: number, detail: string) {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data: { detail },
  } as AxiosResponse);
}

const UNVERIFIED = () => httpError(401, 'Please verify your email address before logging in');
const TOKENS = { access_token: 'a', refresh_token: 'r', token_type: 'bearer' };
const USER = {
  id: 'u1',
  full_name: 'Test',
  email: 'jane@example.com',
  phone_number: null,
  role: 'client',
  is_verified: false,
  is_active: true,
  last_login_at: null,
  created_at: '2026-10-14T00:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

describe('auth error helpers', () => {
  it('recognises the unverified-email 401 only', () => {
    expect(isUnverifiedEmailError(UNVERIFIED())).toBe(true);
    expect(isUnverifiedEmailError(httpError(401, 'Invalid email or password'))).toBe(false);
    expect(isUnverifiedEmailError(new Error('nope'))).toBe(false);
  });

  it('reads the resend cooldown from a 429', () => {
    expect(getRetryAfterSeconds(httpError(429, 'Please wait 42s before requesting another code'))).toBe(42);
    expect(getRetryAfterSeconds(httpError(422, 'Please wait 42s'))).toBeUndefined();
  });
});

async function renderAuth() {
  let auth!: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return null;
  }
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  return () => auth;
}

describe('AuthProvider verification', () => {
  it('signs in right after verifying an email it just signed up', async () => {
    api.signup.mockResolvedValue(USER);
    api.verifyOtp.mockResolvedValue({ ...USER, is_verified: true });
    api.login.mockResolvedValue(TOKENS);
    api.me.mockResolvedValue({ ...USER, is_verified: true });
    const auth = await renderAuth();

    await ReactTestRenderer.act(async () => {
      await auth().signup({ email: USER.email, password: 'secret123' });
    });
    let signedIn = false;
    await ReactTestRenderer.act(async () => {
      signedIn = await auth().verifyOtp(USER.email, '123456');
    });

    expect(signedIn).toBe(true);
    expect(api.login).toHaveBeenCalledWith(USER.email, 'secret123');
    expect(auth().isAuthenticated).toBe(true);
  });

  it('remembers a login refused as unverified, and finishes it on verify', async () => {
    api.login.mockRejectedValueOnce(UNVERIFIED()).mockResolvedValueOnce(TOKENS);
    api.verifyOtp.mockResolvedValue({ ...USER, is_verified: true });
    api.me.mockResolvedValue({ ...USER, is_verified: true });
    const auth = await renderAuth();

    await ReactTestRenderer.act(async () => {
      await expect(auth().login(USER.email, 'secret123')).rejects.toBeInstanceOf(AxiosError);
    });
    await ReactTestRenderer.act(async () => {
      await auth().verifyOtp(USER.email, '123456');
    });

    expect(api.login).toHaveBeenLastCalledWith(USER.email, 'secret123');
    expect(auth().isAuthenticated).toBe(true);
  });

  it('only verifies (no sign-in) when it has no password for that email', async () => {
    api.verifyOtp.mockResolvedValue({ ...USER, is_verified: true });
    const auth = await renderAuth();

    let signedIn = true;
    await ReactTestRenderer.act(async () => {
      signedIn = await auth().verifyOtp(USER.email, '123456');
    });

    expect(signedIn).toBe(false);
    expect(api.login).not.toHaveBeenCalled();
  });
});

function fill(root: ReactTestRenderer.ReactTestInstance, label: string, value: string) {
  const input = root.find(n => n.props.label === label && typeof n.props.onChangeText === 'function');
  input.props.onChangeText(value);
}

function press(root: ReactTestRenderer.ReactTestInstance, title: string) {
  root.find(n => n.props.title === title && typeof n.props.onPress === 'function').props.onPress();
}

async function renderScreen(
  Component: React.ComponentType<any>,
  navigation: object,
  params?: object,
  children?: React.ReactNode,
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <AuthProvider>
        {children}
        <Component navigation={navigation} route={{ params }} />
      </AuthProvider>,
    );
  });
  return tree.root;
}

function resendTitle(root: ReactTestRenderer.ReactTestInstance) {
  return root.find(
    n => typeof n.props.title === 'string' && n.props.title.startsWith('Resend code') && n.props.onPress,
  ).props.title as string;
}

describe('screens route unverified accounts to verification', () => {
  it('Login sends an unverified account to VerifyOtp with a fresh code', async () => {
    api.login.mockRejectedValue(UNVERIFIED());
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(LoginScreen, navigation);

    await ReactTestRenderer.act(async () => {
      fill(root, 'Email', ' jane@example.com ');
      fill(root, 'Password', 'secret123');
    });
    await ReactTestRenderer.act(async () => {
      press(root, 'Log in');
    });

    expect(api.login).toHaveBeenCalledWith('jane@example.com', 'secret123');
    expect(navigation.navigate).toHaveBeenCalledWith('VerifyOtp', {
      email: 'jane@example.com',
      sendCode: true,
    });
  });

  it('Signup with an existing unverified email goes to VerifyOtp instead of dead-ending', async () => {
    api.signup.mockRejectedValue(httpError(409, 'An account with this email already exists'));
    api.login.mockRejectedValue(UNVERIFIED());
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(SignupScreen, navigation);

    await ReactTestRenderer.act(async () => {
      fill(root, 'Full name', 'Jane Doe');
      fill(root, 'Email', 'jane@example.com');
      fill(root, 'Phone', '9999999999');
      fill(root, 'Password', 'secret123');
    });
    await ReactTestRenderer.act(async () => {
      press(root, 'Create account');
    });

    expect(navigation.replace).toHaveBeenCalledWith('VerifyOtp', {
      email: 'jane@example.com',
      sendCode: true,
    });
  });
});

describe('VerifyOtp screen', () => {
  it('sends a code on arrival when asked to, then starts the resend cooldown', async () => {
    api.resendOtp.mockResolvedValue({ message: 'sent' });
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(VerifyOtpScreen, navigation, {
      email: USER.email,
      sendCode: true,
    });

    expect(api.resendOtp).toHaveBeenCalledTimes(1);
    expect(api.resendOtp).toHaveBeenCalledWith(USER.email, 'signup');
    expect(resendTitle(root)).toMatch(/^Resend code in \d+s$/);
  });

  it('treats a 429 on arrival as "a code is already on its way"', async () => {
    api.resendOtp.mockRejectedValue(httpError(429, 'Please wait 42s before requesting another code'));
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(VerifyOtpScreen, navigation, {
      email: USER.email,
      sendCode: true,
    });

    expect(resendTitle(root)).toBe('Resend code in 42s');
  });

  it('does not send another code straight after signup (the backend just sent one)', async () => {
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(VerifyOtpScreen, navigation, { email: USER.email });

    expect(api.resendOtp).not.toHaveBeenCalled();
    expect(resendTitle(root)).toMatch(/^Resend code in \d+s$/);
  });

  it('signs straight in after a login that was refused as unverified', async () => {
    api.login.mockRejectedValueOnce(UNVERIFIED()).mockResolvedValueOnce(TOKENS);
    api.resendOtp.mockResolvedValue({ message: 'sent' });
    api.verifyOtp.mockResolvedValue({ ...USER, is_verified: true });
    api.me.mockResolvedValue({ ...USER, is_verified: true });
    let auth!: ReturnType<typeof useAuth>;
    function Probe() {
      auth = useAuth();
      return null;
    }
    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const root = await renderScreen(
      VerifyOtpScreen,
      navigation,
      { email: USER.email, sendCode: true },
      <Probe />,
    );

    await ReactTestRenderer.act(async () => {
      await expect(auth.login(USER.email, 'secret123')).rejects.toBeInstanceOf(AxiosError);
    });
    await ReactTestRenderer.act(async () => {
      fill(root, 'Verification code', '123456');
    });
    await ReactTestRenderer.act(async () => {
      press(root, 'Verify & continue');
    });

    expect(api.verifyOtp).toHaveBeenCalledWith(USER.email, '123456');
    expect(api.login).toHaveBeenLastCalledWith(USER.email, 'secret123');
    expect(auth.isAuthenticated).toBe(true);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
