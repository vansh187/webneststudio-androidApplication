import { createSseParser, SseEvent } from '../features/assistant/sse';
import { API_BASE_URL, refreshSession } from './client';
import { getSession } from './tokenStore';

// Pings keep a quiet reply alive, so this much silence means the connection died.
const IDLE_TIMEOUT = 60000;
// After `done` or `error` the reply is complete. If the connection doesn't close
// by itself, don't leave the screen waiting on it.
const END_GRACE = 5000;

export type AssistantLanguage = 'python' | 'java' | 'web' | 'backend';

export type AssistantChatRequest = {
  mode: 'ask';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: { language: AssistantLanguage };
};

export type StreamResult =
  /** The server sent `done` or `error`. */
  | { kind: 'finished' }
  /** The connection dropped, went silent, or closed with no `done` or `error`, or the token couldn't be refreshed right now. */
  | { kind: 'lost' }
  /** The caller stopped the reply. */
  | { kind: 'aborted' }
  /** The token is gone and refreshing it failed: back to login. */
  | { kind: 'auth' }
  /** The server refused before streaming started. */
  | { kind: 'refused'; status: number; detail: string | null; retryAfter: number | null };

type Handlers = {
  onEvent: (event: SseEvent) => void;
  onFinish: (result: StreamResult) => void;
};

function readDetail(body: string): string | null {
  try {
    const data = JSON.parse(body) as { detail?: unknown; errors?: Array<{ msg?: string }> };
    const first = data.errors?.find(item => item.msg)?.msg;
    if (first) {
      return first;
    }
    return typeof data.detail === 'string' ? data.detail : null;
  } catch {
    return null;
  }
}

function open(
  request: AssistantChatRequest,
  accessToken: string,
  onEvent: Handlers['onEvent'],
  onFinish: Handlers['onFinish'],
) {
  // axios would buffer the whole response and cut it off at its 10s timeout.
  const xhr = new XMLHttpRequest();
  const parser = createSseParser(event => {
    if (event.type === 'done' || event.type === 'error') {
      sawEnd = true;
      armTimer(END_GRACE);
    }
    onEvent(event);
  });
  let sawEnd = false;
  let offset = 0;
  let settled = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const settle = (result: StreamResult) => {
    if (settled) {
      return;
    }
    settled = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    onFinish(result);
  };

  // Whatever ends the connection after `done` or `error`, the reply itself is complete.
  const endOfConnection = (): StreamResult => (sawEnd ? { kind: 'finished' } : { kind: 'lost' });

  function armTimer(ms: number) {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      settle(endOfConnection());
      xhr.abort();
    }, ms);
  }

  const touch = () => {
    if (!sawEnd) {
      armTimer(IDLE_TIMEOUT);
    }
  };

  xhr.onreadystatechange = () => {
    if (settled || xhr.readyState < 2) {
      return;
    }
    touch();
    if (xhr.status === 200 && xhr.readyState >= 3) {
      const text = xhr.responseText ?? '';
      if (text.length > offset) {
        parser.feed(text.slice(offset));
        offset = text.length;
      }
    }
    if (xhr.readyState !== 4) {
      return;
    }
    if (xhr.status === 0) {
      settle(endOfConnection());
    } else if (xhr.status === 200) {
      parser.flush();
      settle(endOfConnection());
    } else {
      const retryAfter = Number(xhr.getResponseHeader('Retry-After'));
      settle({
        kind: 'refused',
        status: xhr.status,
        detail: readDetail(xhr.responseText ?? ''),
        retryAfter: retryAfter > 0 ? retryAfter : null,
      });
    }
  };
  xhr.onerror = () => settle(endOfConnection());

  xhr.open('POST', `${API_BASE_URL}/api/assistant/chat`);
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  touch();
  xhr.send(JSON.stringify(request));

  return () => {
    settle({ kind: 'aborted' });
    xhr.abort();
  };
}

/** Streams one reply. A 401 refreshes the token once and starts again. */
export function streamAssistantChat(request: AssistantChatRequest, handlers: Handlers) {
  let stopped = false;
  let finished = false;
  let abortCurrent: (() => void) | null = null;

  const finish = (result: StreamResult) => {
    if (!finished) {
      finished = true;
      handlers.onFinish(result);
    }
  };

  const run = async (mayRefresh: boolean) => {
    const session = await getSession();
    if (stopped) {
      return;
    }
    if (!session?.accessToken) {
      finish({ kind: 'auth' });
      return;
    }
    abortCurrent = open(request, session.accessToken, handlers.onEvent, async result => {
      if (result.kind !== 'refused' || result.status !== 401) {
        finish(result);
        return;
      }
      if (!mayRefresh) {
        finish({ kind: 'auth' });
        return;
      }
      if (await refreshSession()) {
        if (!stopped) {
          run(false).catch(() => finish({ kind: 'lost' }));
        }
        return;
      }
      // A failed refresh only ends the session if the server refused the token.
      // If the session survived, it was a network problem: offer Retry instead.
      const survived = await getSession().catch(() => null);
      finish(survived?.accessToken ? { kind: 'lost' } : { kind: 'auth' });
    });
  };

  run(true).catch(() => finish({ kind: 'lost' }));

  return {
    abort() {
      if (stopped) {
        return;
      }
      stopped = true;
      abortCurrent?.();
      finish({ kind: 'aborted' });
    },
  };
}
