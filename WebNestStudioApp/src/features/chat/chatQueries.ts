import { useQuery } from '@tanstack/react-query';

import { webnestApi } from '../../api/webnestApi';
import type { Conversation } from '../../types/api';
import { useIsAppActive } from './useIsAppActive';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
};

const LIST_POLL_MS = 8000; // Chat tab open
const BADGE_POLL_MS = 20000; // app-wide, just to keep the tab badge fresh

/**
 * Conversation list, polled while the app is foregrounded.
 * `pollMs` lets the always-mounted badge poll at a gentler cadence than the
 * open Chat list. Both calls share one query cache (same key), so react-query
 * dedupes overlapping requests.
 */
export function useConversations(pollMs: number = LIST_POLL_MS) {
  const active = useIsAppActive();
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: webnestApi.listConversations,
    refetchInterval: active ? pollMs : false,
    refetchOnWindowFocus: false,
    staleTime: 2000,
  });
}

/** Total unread across all conversations — drives the Chat tab badge. */
export function useUnreadCount(): number {
  const { data } = useConversations(BADGE_POLL_MS);
  if (!Array.isArray(data)) {
    return 0;
  }
  return data.reduce((sum, c: Conversation) => {
    const n = Number((c as Conversation)?.unread_count);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(id ?? 'none'),
    queryFn: () => webnestApi.getConversation(id as string),
    enabled: Boolean(id),
    staleTime: 5000,
  });
}
