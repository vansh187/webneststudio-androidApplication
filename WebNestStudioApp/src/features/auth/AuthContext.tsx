import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import { clearSession, getSession, setSession } from '../../api/tokenStore';
import { webnestApi } from '../../api/webnestApi';
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
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
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

  async function refreshUser() {
    const profile = await webnestApi.me();
    setUser(profile);
  }

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
      login: async (email, password) => {
        const tokens = await webnestApi.login(email, password);
        await setSession({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        await refreshUser();
      },
      signup: webnestApi.signup,
      // Verify only confirms the email — there is no session yet, so we do NOT
      // set the user here. The UI then routes to Login to establish a session.
      verifyOtp: async (email, otpCode) => {
        await webnestApi.verifyOtp(email, otpCode);
      },
      resendOtp: async email => {
        await webnestApi.resendOtp(email);
      },
      logout: async () => {
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
          const tokens = await webnestApi.login(creds.email, creds.password);
          await setSession({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          });
          await refreshUser();
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
    [booting, user, biometry, biometricEnabled],
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
