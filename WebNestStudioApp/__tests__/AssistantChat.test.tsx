/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StreamResult, streamAssistantChat } from '../src/api/assistantStream';
import { closeChat, loadChat, saveChat } from '../src/features/assistant/chatStore';
import type { AiMessage } from '../src/features/assistant/history';
import { useAssistantChat } from '../src/features/assistant/useAssistantChat';

jest.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('../src/api/assistantStream', () => ({
  streamAssistantChat: jest.fn(),
}));

const USER = 'user-1';
const stream = streamAssistantChat as jest.Mock;

type Handlers = {
  onEvent: (event: { type: string; data: any }) => void;
  onFinish: (result: StreamResult) => void;
};

let chat: ReturnType<typeof useAssistantChat>;
let tree: ReactTestRenderer.ReactTestRenderer | null;
let onPaymentRequired: jest.Mock;
let onSessionLost: jest.Mock;
let renders: number;

function Probe() {
  renders += 1;
  chat = useAssistantChat({ onPaymentRequired, onSessionLost });
  return null;
}

const act = ReactTestRenderer.act;

async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }
  });
}

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    tree = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  await settle();
}

async function unmount() {
  await act(async () => {
    tree?.unmount();
  });
  tree = null;
  await settle();
}

function handlers(index = stream.mock.calls.length - 1): Handlers {
  return stream.mock.calls[index][1];
}

async function emit(fn: () => void) {
  await act(async () => {
    fn();
  });
}

async function send(text: string) {
  let result = false;
  await emit(() => {
    result = chat.send(text);
  });
  return result;
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function reply(text: string) {
  const h = handlers();
  await emit(() => {
    h.onEvent({ type: 'text', data: { delta: text } });
    h.onEvent({ type: 'done', data: { finish_reason: 'stop' } });
    h.onFinish({ kind: 'finished' });
  });
}

const last = (): AiMessage => chat.messages[chat.messages.length - 1];
const refused = (status: number, detail: string | null, retryAfter: number | null = null): StreamResult => ({
  kind: 'refused',
  status,
  detail,
  retryAfter,
});

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  await AsyncStorage.clear();
  onPaymentRequired = jest.fn();
  onSessionLost = jest.fn();
  renders = 0;
  tree = null;
  stream.mockImplementation(() => ({ abort: jest.fn() }));
});

afterEach(async () => {
  if (tree) {
    await unmount();
  }
  jest.useRealTimers();
});

describe('sending', () => {
  it('sends ask mode with the conversation and a language the API accepts', async () => {
    await mount();
    await send('  What is a list?  ');
    await reply('A sequence.');
    await send('Show one');

    const body = stream.mock.calls[1][0];
    expect(body).toEqual({
      mode: 'ask',
      context: { language: 'python' },
      messages: [
        { role: 'user', content: 'What is a list?' },
        { role: 'assistant', content: 'A sequence.' },
        { role: 'user', content: 'Show one' },
      ],
    });
  });

  it('starts one reply on a double tap', async () => {
    await mount();
    await emit(() => {
      chat.send('one');
      chat.send('two');
    });
    expect(stream).toHaveBeenCalledTimes(1);
    expect(chat.messages.filter(message => message.role === 'user')).toHaveLength(1);
  });

  it('refuses blank text, over-long text and sending while streaming', async () => {
    await mount();
    expect(await send('   ')).toBe(false);
    expect(await send('a'.repeat(501))).toBe(false);
    expect(await send('a'.repeat(500))).toBe(true);
    expect(await send('again')).toBe(false);
    expect(stream).toHaveBeenCalledTimes(1);
  });
});

describe('streaming text', () => {
  it('paints many deltas once per interval, not once per delta', async () => {
    await mount();
    await send('q');
    const h = handlers();
    const before = renders;
    for (let i = 0; i < 50; i += 1) {
      await emit(() => h.onEvent({ type: 'text', data: { delta: 'x' } }));
    }
    expect(renders).toBe(before);
    expect(last().content).toBe('');

    await advance(100);
    expect(last().content).toBe('x'.repeat(50));
    expect(renders - before).toBeLessThanOrEqual(2);
  });

  it('paints the text still waiting when the reply ends', async () => {
    await mount();
    await send('q');
    await reply('all of it');
    expect(last().content).toBe('all of it');
    expect(last().status).toBe('done');
    expect(chat.streaming).toBe(false);
  });

  it('keeps emoji and Hindi split across deltas intact', async () => {
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => {
      h.onEvent({ type: 'text', data: { delta: 'नम' } });
      h.onEvent({ type: 'text', data: { delta: 'स्ते 😀' } });
    });
    await advance(100);
    expect(last().content).toBe('नमस्ते 😀');
  });

  it('marks a reply cut short by the length limit', async () => {
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => {
      h.onEvent({ type: 'done', data: { finish_reason: 'length' } });
      h.onFinish({ kind: 'finished' });
    });
    expect(last().cutShort).toBe(true);
  });

  it('shows the provider from the usage event', async () => {
    await mount();
    await send('q');
    const h = handlers();
    await emit(() =>
      h.onEvent({ type: 'usage', data: { provider_name: 'Anthropic', input_tokens: 1 } }),
    );
    expect(last().provider).toBe('Anthropic');
  });

  it('ignores late events from a stopped reply', async () => {
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => chat.stop());
    await emit(() => h.onEvent({ type: 'text', data: { delta: 'late' } }));
    await advance(100);
    expect(chat.messages.map(message => message.content).join()).not.toContain('late');
  });
});

describe('failures', () => {
  it('keeps the text and offers Retry on a stream error', async () => {
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => {
      h.onEvent({ type: 'text', data: { delta: 'partial' } });
      h.onEvent({ type: 'error', data: { code: 'provider_error', message: 'Stopped responding' } });
      h.onFinish({ kind: 'finished' });
    });
    expect(last()).toEqual(
      expect.objectContaining({
        content: 'partial',
        status: 'failed',
        error: 'Stopped responding',
        action: 'retry',
      }),
    );
  });

  it('offers Retry when the connection is lost', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish({ kind: 'lost' }));
    expect(last().error).toBe('Connection lost');
    expect(last().action).toBe('retry');
  });

  it('a 402 opens the plan screen and offers no Retry', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish(refused(402, 'Unlock WebNest AI to continue.')));
    expect(onPaymentRequired).toHaveBeenCalledTimes(1);
    expect(last().error).toBe('Unlock WebNest AI to continue.');
    expect(last().action).toBeUndefined();
  });

  it('a daily cap blocks sending until Retry-After and offers no Retry', async () => {
    await mount();
    await send('q');
    await emit(() =>
      handlers().onFinish(refused(429, 'You have used your AI assistant allowance for today.', 60)),
    );
    expect(last().action).toBeUndefined();
    expect(chat.blockedMessage).toMatch(/allowance/);
    expect(await send('again')).toBe(false);

    await advance(60000);
    expect(chat.blockedMessage).toBeNull();
    expect(await send('again')).toBe(true);
  });

  it('a lost session signs out and offers no Retry', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish({ kind: 'auth' }));
    expect(onSessionLost).toHaveBeenCalledTimes(1);
    expect(last().action).toBeUndefined();
  });

  it('a too-large conversation offers New chat', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish(refused(413, 'This conversation is too large.')));
    expect(last().action).toBe('newChat');
  });

  it('a 503 shows the server message with Retry', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish(refused(503, 'The AI assistant is switched off.')));
    expect(last().error).toBe('The AI assistant is switched off.');
    expect(last().action).toBe('retry');
  });

  it('retries once after 2s on "still streaming", then shows the error', async () => {
    await mount();
    await send('q');
    const busy = 'Another reply is still streaming. Wait for it to finish.';
    await emit(() => handlers().onFinish(refused(429, busy)));
    expect(chat.streaming).toBe(true);
    await advance(2000);
    expect(stream).toHaveBeenCalledTimes(2);

    await emit(() => handlers().onFinish(refused(429, busy)));
    await advance(5000);
    expect(stream).toHaveBeenCalledTimes(2);
    expect(last().error).toBe(busy);
  });
});

describe('Retry', () => {
  it('re-asks the latest question and replaces the failed reply', async () => {
    await mount();
    await send('q1');
    await emit(() => handlers().onFinish({ kind: 'lost' }));
    const failedId = last().id;
    await emit(() => chat.retry(failedId));

    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'q1' }]);
    expect(chat.messages.some(message => message.id === failedId)).toBe(false);
  });

  it('refuses an older failed reply, so later messages are never lost', async () => {
    await mount();
    await send('q1');
    await emit(() => handlers().onFinish({ kind: 'lost' }));
    const oldFailedId = last().id;
    await send('q2');
    await reply('a2');
    const before = chat.messages;

    await emit(() => chat.retry(oldFailedId));

    expect(stream).toHaveBeenCalledTimes(2);
    expect(chat.messages).toBe(before);
  });

  it('does nothing while blocked by a cap', async () => {
    await mount();
    await send('q');
    await emit(() => handlers().onFinish(refused(429, 'allowance', 60)));
    await emit(() => chat.retry(last().id));
    expect(stream).toHaveBeenCalledTimes(1);
  });
});

describe('Stop', () => {
  it('aborts, keeps the text received and allows the next question', async () => {
    const abort = jest.fn();
    stream.mockImplementation(() => ({ abort }));
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => h.onEvent({ type: 'text', data: { delta: 'partial' } }));
    await emit(() => chat.stop());

    expect(abort).toHaveBeenCalledTimes(1);
    expect(last()).toEqual(expect.objectContaining({ content: 'partial', status: 'stopped' }));
    expect(chat.streaming).toBe(false);
    expect(await send('next')).toBe(true);
  });

  it('removes an empty reply', async () => {
    await mount();
    await send('q');
    await emit(() => chat.stop());
    expect(chat.messages.map(message => message.role)).toEqual(['user']);
  });
});

describe('saving', () => {
  it('saves the question as soon as it is sent', async () => {
    await mount();
    await send('survive a kill');
    await settle();
    const stored = await loadChat(USER);
    expect(stored?.messages.map(message => message.content)).toEqual(['survive a kill']);
  });

  it('keeps the partial reply when the screen closes mid-stream', async () => {
    const abort = jest.fn();
    stream.mockImplementation(() => ({ abort }));
    await mount();
    await send('q');
    const h = handlers();
    await emit(() => h.onEvent({ type: 'text', data: { delta: 'painted ' } }));
    await advance(100);
    await emit(() => h.onEvent({ type: 'text', data: { delta: 'unpainted' } }));
    await unmount();

    expect(abort).toHaveBeenCalledTimes(1);
    const stored = await loadChat(USER);
    expect(stored?.messages[1]).toEqual(
      expect.objectContaining({ content: 'painted unpainted', status: 'stopped' }),
    );
  });

  it('keeps only the question when the screen closes before any text', async () => {
    await mount();
    await send('q');
    await unmount();
    const stored = await loadChat(USER);
    expect(stored?.messages.map(message => message.role)).toEqual(['user']);
  });

  it('restores the conversation on reopening', async () => {
    await mount();
    await send('q');
    await reply('a');
    await settle();
    await unmount();
    await mount();
    expect(chat.messages.map(message => message.content)).toEqual(['q', 'a']);
  });

  it('New chat empties the conversation and storage', async () => {
    await mount();
    await send('q');
    await reply('a');
    await emit(() => chat.newChat());
    await settle();
    expect(chat.messages).toEqual([]);
    expect((await loadChat(USER))?.messages ?? []).toEqual([]);
  });
});

describe('logout', () => {
  it('a chat screen closing after logout cannot bring the chat back', async () => {
    await mount();
    await send('private');
    await reply('answer');
    await settle();

    await closeChat(USER);
    await unmount();
    expect(await loadChat(USER)).toBeNull();
  });

  it('a later sign-in on the same account can save again', async () => {
    await closeChat(USER);
    await saveChat(USER, { messages: [] });
    expect(await loadChat(USER)).toBeNull();

    await mount();
    await send('fresh');
    await settle();
    expect((await loadChat(USER))?.messages[0].content).toBe('fresh');
  });

  it("never reads another account's chat", async () => {
    await saveChat('user-2', {
      messages: [{ id: '1', role: 'user', content: 'someone else' }],
    });
    await mount();
    expect(chat.messages).toEqual([]);
  });
});
