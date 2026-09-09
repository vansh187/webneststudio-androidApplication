import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import type { ChatMessage } from '../../types/api';
import { useIsAppActive } from './useIsAppActive';

const PAGE_SIZE = 30;
const POLL_MS = 3000;

type Status = 'loading' | 'ready' | 'error';

type MessagesState = {
  messages: ChatMessage[]; // ascending by created_at
  status: Status;
  error: string | null; // soft banner; existing messages stay visible
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  refresh: () => void;
  loadOlder: () => void;
  applyLocal: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
};

function isMessage(m: unknown): m is ChatMessage {
  return Boolean(m && typeof m === 'object' && typeof (m as ChatMessage).id === 'string');
}

function mergeAscending(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of a) {
    if (isMessage(m)) byId.set(m.id, m);
  }
  for (const m of b) {
    if (isMessage(m)) byId.set(m.id, m);
  }
  return Array.from(byId.values()).sort((x, y) => {
    const tx = Date.parse(x.created_at || '') || 0;
    const ty = Date.parse(y.created_at || '') || 0;
    return tx - ty;
  });
}

/**
 * Owns a conversation's message list: initial page, 3s tail polling (paused when
 * unfocused/backgrounded), scroll-back pagination, and local patching for
 * optimistic sends / reactions / deletes. Every network call is guarded — a
 * failed poll shows a dismissible banner and never clears what's on screen.
 *
 * Deliberately not react-query: this list grows from *both* ends (poll the head,
 * paginate the tail) and is mutated in place on every optimistic send / reaction
 * / delete. `useInfiniteQuery` models one-directional paging only, so doing this
 * with it would mean hand-written `setQueryData` surgery on the page structure
 * for every mutation — more moving parts than this focused state machine.
 * The conversation list and people search stay on react-query (see chatQueries).
 */
export function useConversationMessages(
  conversationId: string | undefined,
  focused: boolean,
): MessagesState {
  const appActive = useIsAppActive();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const mountedRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runInitial = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setStatus(s => (s === 'ready' ? s : 'loading'));
    try {
      const page = await webnestApi.listMessages(conversationId, { limit: PAGE_SIZE });
      if (!mountedRef.current) return;
      const clean = (page.messages || []).filter(isMessage);
      setMessages(mergeAscending([], clean));
      setHasMoreOlder(Boolean(page.has_more));
      setStatus('ready');
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus(prev => (prev === 'ready' ? 'ready' : 'error'));
      setError(getErrorMessage(err, 'Could not load this conversation.'));
    }
  }, [conversationId]);

  // (re)load whenever the conversation changes
  useEffect(() => {
    setMessages([]);
    setStatus('loading');
    setError(null);
    setHasMoreOlder(false);
    runInitial();
  }, [runInitial]);

  // tail polling
  useEffect(() => {
    if (!conversationId || !focused || !appActive) {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const current = messagesRef.current;
      // Cursor from the newest *confirmed* message — never an optimistic temp id.
      let cursor: string | undefined;
      for (let i = current.length - 1; i >= 0; i--) {
        if (current[i]?.id && !current[i].id.startsWith('temp-')) {
          cursor = current[i].id;
          break;
        }
      }
      if (!cursor) {
        return;
      }
      try {
        // Drain the tail: a long pause can leave >PAGE_SIZE new messages, and a
        // single `after` page would leave a permanent interior gap. Stop on an
        // explicit has_more:false OR a short/empty page — robust whether or not
        // the backend sets has_more for `after` queries.
        for (let guard = 0; guard < 6; guard++) {
          const page = await webnestApi.listMessages(conversationId, {
            after: cursor,
            limit: PAGE_SIZE,
          });
          if (cancelled || !mountedRef.current) return;
          const fresh = (page.messages || []).filter(isMessage);
          if (fresh.length) {
            setMessages(prev => mergeAscending(prev, fresh));
            cursor = fresh[fresh.length - 1].id;
          }
          if (!page.has_more || fresh.length < PAGE_SIZE) {
            break;
          }
        }
        setError(null);
      } catch {
        // Silent: keep showing what we have. A persistent outage surfaces via
        // the conversation list / send failures instead.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [conversationId, focused, appActive]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMoreOlder) {
      return;
    }
    const oldest = messagesRef.current[0];
    if (!oldest) {
      return;
    }
    setLoadingOlder(true);
    try {
      const page = await webnestApi.listMessages(conversationId, { before: oldest.id });
      if (!mountedRef.current) return;
      const older = (page.messages || []).filter(isMessage);
      setMessages(prev => mergeAscending(older, prev));
      setHasMoreOlder(Boolean(page.has_more));
    } catch {
      // keep hasMoreOlder true so the user can try again
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder]);

  const applyLocal = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages(prev => {
        try {
          const next = updater(prev);
          return Array.isArray(next) ? next.filter(isMessage) : prev;
        } catch {
          return prev;
        }
      });
    },
    [],
  );

  return {
    messages,
    status,
    error,
    hasMoreOlder,
    loadingOlder,
    refresh: runInitial,
    loadOlder,
    applyLocal,
  };
}
