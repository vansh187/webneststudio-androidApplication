import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { clearSession, getSession, setSession } from '../../api/tokenStore';
import { webnestApi } from '../../api/webnestApi';
import { User } from '../../types/api';

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
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  async function refreshUser() {
    const profile = await webnestApi.me();
    setUser(profile);
  }

  useEffect(() => {
    let mounted = true;
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
      refreshUser,
    }),
    [booting, user],
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
