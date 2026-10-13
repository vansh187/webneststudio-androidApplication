import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

import { clearSession, getSession, setSession } from '../../api/tokenStore';
import { isUnverifiedEmailError } from '../../api/client';
import { OtpPurpose, webnestApi } from '../../api/webnestApi';
import { unregisterFromPush } from '../notifications/push';
import { User } from '../../types/api';
import {
  BiometryType,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricCredentials,
  getSupportedBiometry,
  isBiometricLoginEnabled,
} from './biometrics';

type AuthContextValue = {
  user: User | null;
  booting: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    full_name?: string;
    email: string;
    phone_number?: string;
    password: string;
  }) => Promise<User>;
  /**
   * Confirms the email. If this session already knows the password for that
   * email (from signup or a login that was refused as unverified) it signs in
   * too and resolves `true`; otherwise resolves `false` and the UI routes to Login.
   */
  verifyOtp: (email: string, otpCode: string) => Promise<boolean>;
  resendOtp: (email: string, purpose?: OtpPurpose) => Promise<void>;
  /** Sets a new password from a `password_reset` code, then signs in with it. */
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Biometric login
  biometry: BiometryType | null;
  biometricEnabled: boolean;
  enableBiometrics: (email: string, password: string) => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  /** Prompts for fingerprint, logs in with the stored credentials. Returns false on cancel/failure. */
  loginWithBiometrics: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [biometry, setBiometry] = useState<BiometryType | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  // Held in memory only (never persisted) so verifying an email can finish the
  // sign-in without making the user type their password a second time.
  const pendingCredentials = useRef<{ email: string; password: string } | null>(null);

  const refreshUser = useCallback(async () => {
    const profile = await webnestApi.me();
    setUser(profile);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const tokens = await webnestApi.login(email, password);
      await setSession({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
    } catch (err) {
      if (isUnverifiedEmailError(err)) {
        pendingCredentials.current = { email, password };
      }
      throw err;
    }
    pendingCredentials.current = null;
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let mounted = true;

    // Both helpers resolve to a safe default on any internal error, so no catch.
    Promise.all([getSupportedBiometry(), isBiometricLoginEnabled()]).then(
      ([type, enabled]) => {
        if (mounted) {
          setBiometry(type);
          setBiometricEnabled(enabled && type !== null);
        }
      },
    );

    getSession()
      .then(session => (session ? webnestApi.me() : null))
      .then(profile => {
        if (mounted && profile) {
          setUser(profile);
        }
      })
      .catch(() => clearSession())
      .finally(() => {
        if (mounted) {
          setBooting(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      login: signIn,
      signup: async payload => {
        const created = await webnestApi.signup(payload);
        if (!created.is_verified) {
          pendingCredentials.current = { email: payload.email, password: payload.password };
        }
        return created;
      },
      verifyOtp: async (email, otpCode) => {
        await webnestApi.verifyOtp(email, otpCode);
        const pending = pendingCredentials.current;
        if (!pending || pending.email.toLowerCase() !== email.toLowerCase()) {
          return false;
        }
        try {
          await signIn(pending.email, pending.password);
          return true;
        } catch {
          // Verified, but the remembered password didn't work (e.g. it was
          // typed into Signup for an account that already existed).
          pendingCredentials.current = null;
          return false;
        }
      },
      resendOtp: async (email, purpose = 'signup') => {
        await webnestApi.resendOtp(email, purpose);
      },
      resetPassword: async (email, otpCode, newPassword) => {
        await webnestApi.resetPassword(email, otpCode, newPassword);
        await signIn(email, newPassword);
      },
      logout: async () => {
        pendingCredentials.current = null;
        // Before clearSession: the unregister call needs the access token.
        await unregisterFromPush();
        await clearSession();
        setUser(null);
      },
      deleteAccount: async () => {
        await webnestApi.deleteAccount();
        await disableBiometricLogin();
        setBiometricEnabled(false);
        await clearSession();
        setUser(null);
      },
      refreshUser,

      biometry,
      biometricEnabled,
      enableBiometrics: async (email, password) => {
        const ok = await enableBiometricLogin(email, password);
        if (ok) {
          setBiometricEnabled(true);
        }
        return ok;
      },
      disableBiometrics: async () => {
        await disableBiometricLogin();
        setBiometricEnabled(false);
      },
      loginWithBiometrics: async () => {
        const creds = await getBiometricCredentials();
        if (!creds) {
          return false;
        }
        try {
          await signIn(creds.email, creds.password);
          return true;
        } catch (err) {
          // Any 4xx = the stored credentials are no longer valid (password
          // changed, account disabled, bad request). Clear the biometric entry
          // so it can't keep failing. A network error (no response) is left
          // alone — that's transient.
          const status = axios.isAxiosError(err) ? err.response?.status : undefined;
          if (status !== undefined && status >= 400 && status < 500) {
            await disableBiometricLogin();
            setBiometricEnabled(false);
          }
          throw err;
        }
      },
    }),
    [booting, user, biometry, biometricEnabled, refreshUser, signIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
