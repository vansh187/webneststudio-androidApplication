import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { AssistantUsage } from '../../api/assistantApi';
import { AssistantLanguage, streamAssistantChat, StreamResult } from '../../api/assistantStream';
import type { SseEvent } from './sse';
import { useAuth } from '../auth/AuthContext';
import { PRIME_QUERY_ROOT, primeKeys } from '../prime/primeQueries';
import { clearChat, loadChat, openChat, saveChat } from './chatStore';
import { AiMessage, canSendText, toRequestMessages } from './history';

const BUSY_RETRY_MS = 2000;
// Deltas can arrive many times a second, and each paint re-parses the whole reply.
const FLUSH_MS = 80;
// setTimeout can't wait longer than a signed 32-bit number of milliseconds.
const MAX_TIMER_MS = 2147483647;
const GENERIC_FAILURE = 'Something went wrong. Please try again.';
// The API requires a language. Customers aren't asked to choose one.
const REQUEST_LANGUAGE: AssistantLanguage = 'python';

let nextId = 0;
const newId = () => `${Date.now()}-${(nextId += 1)}`;

/** Ends any in-progress reply: keeps its text as stopped, drops it if it has none. */
function settleStreaming(messages: AiMessage[], unpainted: string) {
  return messages.flatMap(message => {
    if (message.status !== 'streaming') {
      return [message];
    }
    const content = message.content + unpainted;
    return content ? [{ ...message, content, status: 'stopped' as const }] : [];
  });
}

type Options = {
  /** 402: there's no usable pass any more. */
  onPaymentRequired: () => void;
  /** 401 that a token refresh couldn't fix. */
  onSessionLost: () => void;
};

export function useAssistantChat({ onPaymentRequired, onSessionLost }: Options) {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id as string;
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [streaming, setStreamingState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const activeStream = useRef<{ abort: () => void } | null>(null);
  // Bumped per reply, so a late event from a stopped reply can't touch the next one.
  const replyToken = useRef(0);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Text received but not painted yet.
  const unpainted = useRef('');
  // Read by the stable callbacks below, so message rows only re-render when
  // their own message changes.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const streamingRef = useRef(false);
  const blockedRef = useRef(false);
  blockedRef.current = blockedMessage !== null;
  const hydratedRef = useRef(false);

  const setStreaming = useCallback((value: boolean) => {
    // Set here as well as in state, so a double tap can't start two replies.
    streamingRef.current = value;
    setStreamingState(value);
  }, []);

  useEffect(() => {
    let cancelled = false;
    openChat(userId);
    loadChat(userId).then(stored => {
      if (cancelled) {
        return;
      }
      if (stored) {
        setMessages(stored.messages);
      }
      hydratedRef.current = true;
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (hydrated && !streaming) {
      saveChat(userId, { messages });
    }
  }, [hydrated, messages, streaming, userId]);

  useEffect(
    () => () => {
      replyToken.current += 1;
      activeStream.current?.abort();
      if (busyTimer.current) {
        clearTimeout(busyTimer.current);
      }
      if (blockTimer.current) {
        clearTimeout(blockTimer.current);
      }
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
      // Leaving mid-reply: the save effect won't run again, so keep what arrived.
      if (hydratedRef.current) {
        saveChat(userId, { messages: settleStreaming(messagesRef.current, unpainted.current) });
      }
    },
    [userId],
  );

  const patchReply = useCallback((id: string, patch: (message: AiMessage) => AiMessage) => {
    setMessages(current => current.map(item => (item.id === id ? patch(item) : item)));
  }, []);

  const flush = useCallback(
    (id: string) => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      const text = unpainted.current;
      if (text) {
        unpainted.current = '';
        patchReply(id, message => ({ ...message, content: message.content + text }));
      }
    },
    [patchReply],
  );

  const failReply = useCallback(
    (id: string, error: string, action?: AiMessage['action']) => {
      patchReply(id, message => ({ ...message, status: 'failed', error, action }));
      setStreaming(false);
    },
    [patchReply, setStreaming],
  );

  const applyUsageEvent = useCallback(
    (data: Partial<AssistantUsage>) => {
      if (!data.access) {
        return;
      }
      queryClient.setQueryData<AssistantUsage>(primeKeys.usage(userId), current =>
        current ? { ...current, access: data.access } : current,
      );
    },
    [queryClient, userId],
  );

  const blockSendingFor = useCallback((seconds: number, detail: string) => {
    setBlockedMessage(detail);
    if (blockTimer.current) {
      clearTimeout(blockTimer.current);
    }
    blockTimer.current = setTimeout(
      () => setBlockedMessage(null),
      Math.min(seconds * 1000, MAX_TIMER_MS),
    );
  }, []);

  const startReply = useCallback(
    (history: AiMessage[], isBusyRetry = false) => {
      replyToken.current += 1;
      const token = replyToken.current;
      const replyId = newId();
      unpainted.current = '';
      setStreaming(true);
      setMessages([...history, { id: replyId, role: 'assistant', content: '', status: 'streaming' }]);
      // The question survives the app being killed while the reply streams.
      saveChat(userId, { messages: history });

      const onEvent = ({ type, data }: SseEvent) => {
        if (token !== replyToken.current) {
          return;
        }
        if (type === 'text') {
          unpainted.current += data.delta ?? '';
          if (!flushTimer.current) {
            flushTimer.current = setTimeout(() => flush(replyId), FLUSH_MS);
          }
          return;
        }
        flush(replyId);
        if (type === 'usage') {
          applyUsageEvent(data);
          patchReply(replyId, message => ({ ...message, provider: data.provider_name }));
        } else if (type === 'done') {
          patchReply(replyId, message => ({
            ...message,
            status: 'done',
            cutShort: data.finish_reason === 'length',
          }));
        } else if (type === 'error') {
          failReply(replyId, data.message || GENERIC_FAILURE, 'retry');
        }
      };

      const onFinish = (result: StreamResult) => {
        if (token !== replyToken.current) {
          return;
        }
        activeStream.current = null;
        flush(replyId);
        switch (result.kind) {
          case 'finished':
            setStreaming(false);
            return;
          case 'lost':
            failReply(replyId, 'Connection lost', 'retry');
            return;
          case 'auth':
            failReply(replyId, 'Please log in again.');
            onSessionLost();
            return;
          case 'aborted':
            return;
          case 'refused':
            break;
        }
        const { status, detail, retryAfter } = result;
        if (status === 429 && !retryAfter && !isBusyRetry && /streaming/i.test(detail ?? '')) {
          // A send straight after Stop can beat the server's cleanup.
          busyTimer.current = setTimeout(() => startReply(history, true), BUSY_RETRY_MS);
          return;
        }
        if (status === 402) {
          queryClient.invalidateQueries({ queryKey: [PRIME_QUERY_ROOT] });
          failReply(replyId, detail || 'Unlock WebNest AI to continue.');
          onPaymentRequired();
        } else if (status === 413) {
          failReply(replyId, detail || 'Please start a new chat.', 'newChat');
        } else if (status === 429 && retryAfter) {
          const text = detail || 'You have used your AI assistant allowance.';
          failReply(replyId, text);
          blockSendingFor(retryAfter, text);
        } else {
          failReply(replyId, detail || GENERIC_FAILURE, 'retry');
        }
      };

      activeStream.current = streamAssistantChat(
        { mode: 'ask', messages: toRequestMessages(history), context: { language: REQUEST_LANGUAGE } },
        { onEvent, onFinish },
      );
    },
    [
      applyUsageEvent,
      blockSendingFor,
      failReply,
      flush,
      onPaymentRequired,
      onSessionLost,
      patchReply,
      queryClient,
      setStreaming,
      userId,
    ],
  );

  const send = useCallback(
    (text: string) => {
      if (streamingRef.current || blockedRef.current || !canSendText(text)) {
        return false;
      }
      startReply([...messagesRef.current, { id: newId(), role: 'user', content: text.trim() }]);
      return true;
    },
    [startReply],
  );

  const retry = useCallback(
    (replyId: string) => {
      if (streamingRef.current || blockedRef.current) {
        return;
      }
      const current = messagesRef.current;
      const index = current.findIndex(message => message.id === replyId);
      // Only the latest reply: retrying an older one would throw away what followed it.
      if (index !== -1 && index === current.length - 1) {
        startReply(current.slice(0, index));
      }
    },
    [startReply],
  );

  const stop = useCallback(() => {
    // Invalidate first: the abort's own finish callback has nothing left to do.
    replyToken.current += 1;
    if (busyTimer.current) {
      clearTimeout(busyTimer.current);
    }
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    activeStream.current?.abort();
    activeStream.current = null;
    const text = unpainted.current;
    unpainted.current = '';
    setMessages(current => settleStreaming(current, text));
    setStreaming(false);
  }, [setStreaming]);

  const newChat = useCallback(() => {
    stop();
    setMessages([]);
    clearChat(userId);
  }, [stop, userId]);

  return {
    messages,
    streaming,
    hydrated,
    blockedMessage,
    send,
    retry,
    stop,
    newChat,
  };
}
