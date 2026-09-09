import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';

import { clearSession, getSession, setSession } from './tokenStore';
import { TokenResponse } from '../types/api';

export const API_BASE_URL =
  Config.API_BASE_URL || 'https://webneststudiobackend-n00h.onrender.com';

const COLD_START_TIMEOUT = 60000;
const WARM_TIMEOUT = 10000;
let hasCompletedFirstRequest = false;
let refreshPromise: Promise<boolean> | null = null;

type RetriableConfig = InternalAxiosRequestConfig & {
  _retriedAuth?: boolean;
  _retried503?: boolean;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: COLD_START_TIMEOUT,
});

async function performRefresh() {
  const session = await getSession();
  if (!session?.refreshToken) {
    return false;
  }

  try {
    const { data } = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/auth/refresh`,
      { refresh_token: session.refreshToken },
      { timeout: WARM_TIMEOUT },
    );
    await setSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return true;
  } catch {
    await clearSession();
    return false;
  }
}

api.interceptors.request.use(async config => {
  config.timeout = hasCompletedFirstRequest ? WARM_TIMEOUT : COLD_START_TIMEOUT;
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  response => {
    hasCompletedFirstRequest = true;
    return response;
  },
  async (error: AxiosError) => {
    hasCompletedFirstRequest = true;
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const path = config?.url ?? '';
    const isAuthFreePath = [
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/refresh',
      '/api/auth/verify-otp',
    ].some(item => path.startsWith(item));

    if (status === 503 && config && !config._retried503) {
      config._retried503 = true;
      await new Promise<void>(resolve => {
        setTimeout(resolve, 2000);
      });
      return api(config);
    }

    if (status === 401 && config && !config._retriedAuth && !isAuthFreePath) {
      config._retriedAuth = true;
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        const session = await getSession();
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
        return api(config);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as
    | { detail?: string; errors?: Array<{ msg?: string }> }
    | undefined;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map(item => item.msg).filter(Boolean).join(' ');
  }

  return data?.detail || fallback;
}
