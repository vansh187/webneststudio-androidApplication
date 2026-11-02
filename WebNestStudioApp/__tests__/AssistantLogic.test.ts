import { chatAccess, formatPrice, isPaymentConfirmed } from '../src/features/prime/access';
import { canSendText, countChars, toRequestMessages } from '../src/features/assistant/history';
import { parseInline, parseMarkdown } from '../src/features/assistant/markdown';
import { createSseParser, SseEvent } from '../src/features/assistant/sse';
import type { AssistantAccess, AssistantUsage } from '../src/api/assistantApi';
import type { AiMessage } from '../src/features/assistant/history';
import {
  checkoutErrorMessage,
  isCheckoutClosedByUser,
  outcomeOfVerified,
  outcomeOfVerifyError,
} from '../src/features/prime/paymentOutcome';
import { isPendingExpired } from '../src/features/prime/pendingPayment';

const access = (over: Partial<AssistantAccess> = {}): AssistantAccess => ({
  active: true,
  expires_at: '2026-12-02T10:30:00Z',
  price_paise: 29900,
  pass_days: 30,
  tokens_limit: 2000000,
  tokens_used: 48210,
  is_prime: true,
  member_label: 'WebNest Prime Member',
  ...over,
});

const usage = (a?: AssistantAccess, enabled = true): AssistantUsage => ({
  enabled,
  calls_used_today: 0,
  calls_limit: 0,
  provider_name: 'Anthropic',
  access: a,
});

describe('SSE parser', () => {
  const collect = () => {
    const events: SseEvent[] = [];
    return { events, parser: createSseParser(event => events.push(event)) };
  };

  it('reads events and ignores pings', () => {
    const { events, parser } = collect();
    parser.feed('event: text\ndata: {"delta":"Hi"}\n\n: ping\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n');
    expect(events).toEqual([
      { type: 'text', data: { delta: 'Hi' } },
      { type: 'done', data: { finish_reason: 'stop' } },
    ]);
  });

  it('holds an event split anywhere between chunks', () => {
    const { events, parser } = collect();
    const whole = 'event: text\r\ndata: {"delta":"नमस्ते 😀"}\r\n\r\n';
    for (const char of whole) {
      parser.feed(char);
    }
    expect(events).toEqual([{ type: 'text', data: { delta: 'नमस्ते 😀' } }]);
  });

  it('skips a broken event and carries on', () => {
    const { events, parser } = collect();
    parser.feed('event: text\ndata: {oops\n\nevent: done\ndata: {}\n\n');
    expect(events.map(event => event.type)).toEqual(['done']);
  });

  it('flushes a final event with no closing blank line', () => {
    const { events, parser } = collect();
    parser.feed('event: done\ndata: {}');
    expect(events).toEqual([]);
    parser.flush();
    expect(events.map(event => event.type)).toEqual(['done']);
  });
});

describe('chat history', () => {
  const user = (id: number): AiMessage => ({ id: `u${id}`, role: 'user', content: `q${id}` });
  const reply = (id: number, content = `a${id}`): AiMessage => ({ id: `a${id}`, role: 'assistant', content });

  it('leaves out replies with no text', () => {
    expect(toRequestMessages([user(1), reply(1, '  '), user(2)])).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'user', content: 'q2' },
    ]);
  });

  it('sends only the last 20, starting with a user message', () => {
    const long: AiMessage[] = [];
    for (let i = 0; i < 15; i += 1) {
      long.push(user(i), reply(i));
    }
    const sent = toRequestMessages([...long, user(15)]);
    expect(sent.length).toBeLessThanOrEqual(20);
    expect(sent[0].role).toBe('user');
    expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'q15' });
  });

  it('allows 500 characters, blocks 501 and blank text', () => {
    expect(canSendText('a'.repeat(500))).toBe(true);
    expect(canSendText('a'.repeat(501))).toBe(false);
    expect(canSendText('   ')).toBe(false);
  });

  it('counts an emoji as one character', () => {
    expect(countChars('😀😀')).toBe(2);
    expect(canSendText('😀'.repeat(500))).toBe(true);
  });
});

describe('markdown', () => {
  it('reads a code block with a language and path', () => {
    expect(parseMarkdown('Look:\n```python app/main.py\nprint(1)\n```\nDone')).toEqual([
      { type: 'paragraph', text: 'Look:' },
      { type: 'code', language: 'python', path: 'app/main.py', code: 'print(1)' },
      { type: 'paragraph', text: 'Done' },
    ]);
  });

  it('treats an unclosed fence as a code block still streaming', () => {
    expect(parseMarkdown('```js\nconst a')).toEqual([
      { type: 'code', language: 'js', path: null, code: 'const a' },
    ]);
  });

  it('reads headings and lists', () => {
    expect(parseMarkdown('## Title\n- one\n2. two')).toEqual([
      { type: 'heading', level: 2, text: 'Title' },
      { type: 'bullet', text: 'one', indent: 0 },
      { type: 'number', marker: '2.', text: 'two', indent: 0 },
    ]);
  });

  it('reads inline styles and leaves half-written markers as text', () => {
    expect(parseInline('a **b** `c` *d* [e](https://x.co)')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'c' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'e', url: 'https://x.co' },
    ]);
    expect(parseInline('half **bold')).toEqual([{ type: 'text', text: 'half **bold' }]);
  });
});

describe('Prime access', () => {
  it('maps each server state from the integration doc', () => {
    expect(chatAccess(usage(access({ active: false, is_prime: false })))).toBe('locked');
    expect(chatAccess(usage(access()))).toBe('open');
    expect(chatAccess(usage(access({ active: false })))).toBe('allowanceUsed');
    expect(chatAccess(usage(undefined))).toBe('unavailable');
    expect(chatAccess(usage(access(), false))).toBe('unavailable');
  });

  it('needs both is_prime and active to confirm a payment', () => {
    expect(isPaymentConfirmed(access())).toBe(true);
    // A repeat buyer out of tokens is is_prime before the new payment lands.
    expect(isPaymentConfirmed(access({ active: false }))).toBe(false);
    expect(isPaymentConfirmed(access({ is_prime: false }))).toBe(false);
    expect(isPaymentConfirmed(undefined)).toBe(false);
  });

  it('formats server values for display', () => {
    expect(formatPrice(29900)).toBe('₹299');
  });
});

describe('payment outcomes', () => {
  const httpError = (status: number) => ({ isAxiosError: true, response: { status } });

  it('treats only 400 and 404 as rejected', () => {
    expect(outcomeOfVerifyError(httpError(400))).toBe('rejected');
    expect(outcomeOfVerifyError(httpError(404))).toBe('rejected');
    expect(outcomeOfVerifyError(httpError(503))).toBe('confirming');
    expect(outcomeOfVerifyError({ isAxiosError: true })).toBe('confirming');
    expect(outcomeOfVerifyError(new Error('boom'))).toBe('confirming');
  });

  it('keeps confirming when verify returns 200 with the pass not active yet', () => {
    expect(outcomeOfVerified(access())).toBe('paid');
    expect(outcomeOfVerified(access({ active: false }))).toBe('confirming');
  });

  it('recognises a checkout closed by the user', () => {
    expect(isCheckoutClosedByUser({ code: 0, description: 'cancelled' })).toBe(true);
    expect(isCheckoutClosedByUser({ code: 2, description: 'network' })).toBe(false);
  });

  it('unwraps a JSON description from the SDK', () => {
    expect(checkoutErrorMessage({ code: 2, description: 'Card declined' })).toBe('Card declined');
    expect(
      checkoutErrorMessage({ code: 2, description: '{"error":{"description":"Bank said no"}}' }),
    ).toBe('Bank said no');
    expect(checkoutErrorMessage({ code: 2 })).toMatch(/did not go through/);
  });

  it('expires a pending record after 24 hours', () => {
    const created = new Date('2026-11-02T00:00:00Z');
    const pending = { payment_id: 'pay_1', created_at: created.toISOString() };
    expect(isPendingExpired(pending, created.getTime() + 23 * 3600000)).toBe(false);
    expect(isPendingExpired(pending, created.getTime() + 25 * 3600000)).toBe(true);
  });
});
