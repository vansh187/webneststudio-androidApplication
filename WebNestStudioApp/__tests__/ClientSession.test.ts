import axios from 'axios';

import { api, refreshSession } from '../src/api/client';
import { clearSession, getSession, setSession } from '../src/api/tokenStore';

jest.mock('../src/api/tokenStore', () => ({
  getSession: jest.fn(),
  setSession: jest.fn(async () => undefined),
  clearSession: jest.fn(async () => undefined),
}));

const session = { accessToken: 'old', refreshToken: 'refresh' };
const tokens = { data: { access_token: 'new', refresh_token: 'refresh-2' } };

function httpError(status: number, config: any = {}) {
  const error: any = new Error(`status ${status}`);
  error.isAxiosError = true;
  error.config = config;
  error.response = { status, data: { detail: `E${status}` } };
  return error;
}

function networkError(config: any = {}) {
  const error: any = new Error('Network Error');
  error.isAxiosError = true;
  error.config = config;
  return error;
}

let post: jest.SpyInstance;
let seen: any[];

beforeEach(() => {
  jest.clearAllMocks();
  (getSession as jest.Mock).mockResolvedValue(session);
  post = jest.spyOn(axios, 'post');
  seen = [];
});

afterEach(() => {
  post.mockRestore();
});

/** Answers each request in turn: a status, or 'network'. Records what was sent. */
function answer(...replies: Array<number | 'network'>) {
  api.defaults.adapter = async config => {
    seen.push({ timeout: config.timeout, auth: config.headers.Authorization, url: config.url });
    const reply = replies.shift() ?? 200;
    if (reply === 'network') {
      throw networkError(config);
    }
    if (reply >= 400) {
      throw httpError(reply, config);
    }
    return { data: { ok: true }, status: reply, statusText: 'OK', headers: {}, config };
  };
}

describe('refreshSession', () => {
  it('stores the new tokens on success', async () => {
    post.mockResolvedValue(tokens);
    await expect(refreshSession()).resolves.toBe(true);
    expect(setSession).toHaveBeenCalledWith({ accessToken: 'new', refreshToken: 'refresh-2' });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403])('ends the session when the server refuses the token (%i)', async status => {
    post.mockRejectedValue(httpError(status));
    await expect(refreshSession()).resolves.toBe(false);
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('keeps the session through a network error or timeout', async () => {
    post.mockRejectedValue(networkError());
    await expect(refreshSession()).resolves.toBe(false);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it.each([500, 503])('keeps the session through a server error (%i)', async status => {
    post.mockRejectedValue(httpError(status));
    await expect(refreshSession()).resolves.toBe(false);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('returns false with no refresh token, without calling the server', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(refreshSession()).resolves.toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('shares one refresh between callers', async () => {
    post.mockResolvedValue(tokens);
    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(results).toEqual([true, true, true]);
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('api interceptors', () => {
  it('sends the bearer token', async () => {
    answer(200);
    await api.get('/api/thing');
    expect(seen[0].auth).toBe('Bearer old');
  });

  it('uses the 60s cold-start timeout, then 10s for every later request', async () => {
    answer(200, 200);
    jest.isolateModules(() => {});
    await api.get('/api/one');
    await api.get('/api/two');
    expect(seen[seen.length - 1].timeout).toBe(10000);
  });

  it('respects a timeout set by the caller', async () => {
    answer(200);
    await api.post('/api/assistant/payments/verify', {}, { timeout: 30000 });
    expect(seen[0].timeout).toBe(30000);
  });

  it('refreshes on a 401 and retries once with the new token', async () => {
    answer(401, 200);
    post.mockResolvedValue(tokens);
    (getSession as jest.Mock)
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session)
      .mockResolvedValue({ accessToken: 'new', refreshToken: 'refresh-2' });
    await expect(api.get('/api/me')).resolves.toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
    expect(seen[1].auth).toBe('Bearer new');
  });

  it('does not refresh for a wrong password on login', async () => {
    answer(401);
    await expect(api.post('/api/auth/login', {})).rejects.toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps the session and fails the request when a refresh hits a network error', async () => {
    answer(401);
    post.mockRejectedValue(networkError());
    await expect(api.get('/api/me')).rejects.toBeTruthy();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('retries a 503 once', async () => {
    answer(503, 200);
    await expect(api.get('/api/thing')).resolves.toBeTruthy();
    expect(seen).toHaveLength(2);
  });

  it('gives up after a second 503', async () => {
    answer(503, 503);
    await expect(api.get('/api/thing')).rejects.toBeTruthy();
    expect(seen).toHaveLength(2);
  });

  it('keeps a caller timeout on the 503 retry', async () => {
    answer(503, 200);
    await api.post('/api/assistant/payments/verify', {}, { timeout: 30000 });
    expect(seen.map(item => item.timeout)).toEqual([30000, 30000]);
  });
});
