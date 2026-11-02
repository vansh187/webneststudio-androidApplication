import { useQuery } from '@tanstack/react-query';

import { assistantApi } from '../../api/assistantApi';
import { useAuth } from '../auth/AuthContext';

/** Everything Prime lives under this key, so it can be dropped together on logout. */
export const PRIME_QUERY_ROOT = 'assistant';

// Keyed by user so one account can never be shown another account's membership.
export const primeKeys = {
  membership: (userId?: string) => [PRIME_QUERY_ROOT, 'membership', userId] as const,
  usage: (userId?: string) => [PRIME_QUERY_ROOT, 'usage', userId] as const,
};

export function useMembership() {
  const userId = useAuth().user?.id;
  return useQuery({
    queryKey: primeKeys.membership(userId),
    queryFn: assistantApi.membership,
    enabled: Boolean(userId),
  });
}

export function useAssistantUsage() {
  const userId = useAuth().user?.id;
  return useQuery({
    queryKey: primeKeys.usage(userId),
    queryFn: assistantApi.usage,
    enabled: Boolean(userId),
  });
}
