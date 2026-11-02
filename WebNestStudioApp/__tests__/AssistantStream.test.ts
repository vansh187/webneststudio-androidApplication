import { streamAssistantChat, StreamResult } from '../src/api/assistantStream';
import { refreshSession } from '../src/api/client';
import { getSession } from '../src/api/tokenStore';
import type { SseEvent } from '../src/features/assistant/sse';

jest.mock('../src/api/tokenStore', () => ({
  getSession: jest.fn(async () => ({ accessToken: 'token-1', refreshToken: 'r' })),
  setSession: jest.fn(),
  clearSession: jest.fn(),
}));

jest.mock('../src/api/client', () => ({
  API_BASE_URL: 'https://api.test',
  refreshSession: jest.fn(async () => true),
}));

class FakeXhr {
  static instances: FakeXhr[] = [];
  readyState = 0;
  status = 0;
  responseText = '';
  headers: Record<string, string> = {};
  responseHeaders: Record<string, string> = {};
  body = '';
  aborted = false;
  onreadystatechange: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }
  open() {}
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  getResponseHeader(name: string) {
    return this.responseHeaders[name] ?? null;
  }
  send(body: string) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
  }
  stream(text: string, status = 200) {
    this.status = status;
    this.readyState = 3;
    this.responseText += text;
    this.onreadystatechange?.();
  }
  end(status = this.status) {
    this.status = status;
    this.readyState = 4;
    this.onreadystatechange?.();
  }
}

const request = {
  mode: 'ask' as const,
  messages: [{ role: 'user' as const, content: 'hi' }],
  context: { language: 'python' as const },
};

async function start() {
  const events: SseEvent[] = [];
  const results: StreamResult[] = [];
  const handle = streamAssistantChat(request, {
    onEvent: event => events.push(event),
    onFinish: result => results.push(result),
  });
  await flush();
  return { events, results, handle, xhr: FakeXhr.instances[FakeXhr.instances.length - 1] };
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  FakeXhr.instances = [];
  (globalThis as any).XMLHttpRequest = FakeXhr;
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('assistant stream', () => {
  it('delivers text piece by piece and finishes on done', async () => {
    const { events, results, xhr } = await start();
    expect(xhr.headers.Authorization).toBe('Bearer token-1');
    expect(JSON.parse(xhr.body)).toEqual(request);

    xhr.stream('event: text\ndata: {"delta":"He');
    expect(events).toEqual([]);
    xhr.stream('llo"}\n\n');
    expect(events).toEqual([{ type: 'text', data: { delta: 'Hello' } }]);

    xhr.stream('event: done\ndata: {"finish_reason":"stop"}\n\n');
    xhr.end();
    expect(events).toHaveLength(2);
    expect(results).toEqual([{ kind: 'finished' }]);
  });

  it('reports a stream that ends with neither done nor error as lost', async () => {
    const { results, xhr } = await start();
    xhr.stream('event: text\ndata: {"delta":"Hi"}\n\n');
    xhr.end();
    expect(results).toEqual([{ kind: 'lost' }]);
  });

  it('counts an error event as a finished stream', async () => {
    const { events, results, xhr } = await start();
    xhr.stream('event: error\ndata: {"code":"provider_error","message":"Stopped"}\n\n');
    xhr.end();
    expect(events[0].type).toBe('error');
    expect(results).toEqual([{ kind: 'finished' }]);
  });

  it('gives up after 60 seconds of silence, but pings keep it alive', async () => {
    const { results, xhr } = await start();
    jest.advanceTimersByTime(50000);
    xhr.stream(': ping\n\n');
    jest.advanceTimersByTime(50000);
    expect(results).toEqual([]);
    jest.advanceTimersByTime(10000);
    expect(results).toEqual([{ kind: 'lost' }]);
    expect(xhr.aborted).toBe(true);
  });

  it('returns the status, detail and Retry-After of a refusal', async () => {
    const { results, xhr } = await start();
    xhr.responseHeaders['Retry-After'] = '3600';
    xhr.status = 429;
    xhr.readyState = 4;
    xhr.responseText = '{"detail":"You have used your AI assistant allowance for today."}';
    xhr.onreadystatechange?.();
    expect(results).toEqual([
      {
        kind: 'refused',
        status: 429,
        detail: 'You have used your AI assistant allowance for today.',
        retryAfter: 3600,
      },
    ]);
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const { results, xhr } = await start();
    (getSession as jest.Mock).mockResolvedValueOnce({ accessToken: 'token-2', refreshToken: 'r' });
    xhr.end(401);
    await flush();
    await flush();
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(FakeXhr.instances).toHaveLength(2);
    expect(FakeXhr.instances[1].headers.Authorization).toBe('Bearer token-2');

    FakeXhr.instances[1].end(401);
    await flush();
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ kind: 'auth' }]);
  });

  it('sends the user to login when the server refused the refresh', async () => {
    (refreshSession as jest.Mock).mockResolvedValueOnce(false);
    const { results, xhr } = await start();
    // client.ts cleared the session because the refresh got a 4xx.
    (getSession as jest.Mock).mockResolvedValueOnce(null);
    xhr.end(401);
    await flush();
    await flush();
    expect(results).toEqual([{ kind: 'auth' }]);
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it('offers Retry, not logout, when the refresh hit a network problem', async () => {
    (refreshSession as jest.Mock).mockResolvedValueOnce(false);
    const { results, xhr } = await start();
    xhr.end(401);
    await flush();
    await flush();
    expect(results).toEqual([{ kind: 'lost' }]);
  });

  it.each([
    ['a connection reset', (xhr: FakeXhr) => xhr.onerror?.()],
    ['status 0', (xhr: FakeXhr) => xhr.end(0)],
  ])('keeps a finished reply finished after %s', async (_name, breakIt) => {
    const { results, xhr } = await start();
    xhr.stream('event: done\ndata: {"finish_reason":"stop"}\n\n');
    breakIt(xhr);
    expect(results).toEqual([{ kind: 'finished' }]);
  });

  it('keeps a finished reply finished when the connection never closes', async () => {
    const { results, xhr } = await start();
    xhr.stream('event: done\ndata: {"finish_reason":"stop"}\n\n');
    expect(results).toEqual([]);
    jest.advanceTimersByTime(5000);
    expect(results).toEqual([{ kind: 'finished' }]);
    expect(xhr.aborted).toBe(true);
  });

  it('treats an error event followed by a dropped connection as finished', async () => {
    const { results, xhr } = await start();
    xhr.stream('event: error\ndata: {"code":"provider_error","message":"x"}\n\n');
    xhr.onerror?.();
    expect(results).toEqual([{ kind: 'finished' }]);
  });

  it('reports a dropped connection before done as lost', async () => {
    const { results, xhr } = await start();
    xhr.stream('event: text\ndata: {"delta":"Hi"}\n\n');
    xhr.onerror?.();
    expect(results).toEqual([{ kind: 'lost' }]);
  });

  it('reports exactly once when stopped during a token refresh', async () => {
    let finishRefresh: (value: boolean) => void = () => {};
    (refreshSession as jest.Mock).mockReturnValueOnce(
      new Promise<boolean>(resolve => {
        finishRefresh = resolve;
      }),
    );
    const { handle, results, xhr } = await start();
    xhr.end(401);
    await flush();
    handle.abort();
    finishRefresh(true);
    await flush();
    await flush();
    expect(results).toEqual([{ kind: 'aborted' }]);
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it('stops the request on abort', async () => {
    const { handle, results, xhr } = await start();
    handle.abort();
    expect(xhr.aborted).toBe(true);
    expect(results).toEqual([{ kind: 'aborted' }]);
  });
});
