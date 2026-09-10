import { useQuery } from '@tanstack/react-query';

import { getHttpStatus } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import type { ProjectSummary } from '../../types/api';
import { useAuth } from '../auth/AuthContext';
import { useIsAppActive } from '../chat/useIsAppActive';
import { normalizeDetail, normalizeSummary } from './normalize';

export const projectKeys = {
  all: ['me', 'projects'] as const,
  detail: (id: string) => ['me', 'project', id] as const,
};

const REFRESH_MS = 60000; // gentle poll so admin stage updates land without a manual pull
// Terminal client errors — never worth retrying, and the interceptor already
// handles the 401 refresh / 503 cold-start cases before we get here.
const NON_RETRYABLE = [400, 401, 403, 404];

/**
 * The client's projects, newest activity first. Polls only while the app is
 * foregrounded; falls back to pull-to-refresh + staleTime otherwise.
 */
export function useMyProjects() {
  const auth = useAuth();
  const active = useIsAppActive();

  return useQuery({
    queryKey: projectKeys.all,
    enabled: auth.isAuthenticated,
    staleTime: 30000,
    refetchInterval: active ? REFRESH_MS : false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ProjectSummary[]> => {
      const raw = await webnestApi.listMyProjects();
      const list = Array.isArray(raw) ? raw : [];
      return list
        .map(normalizeSummary)
        .filter((p): p is ProjectSummary => p !== null);
    },
  });
}

/** A single project with its full SDLC pipeline. */
export function useMyProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? 'none'),
    enabled: Boolean(id),
    staleTime: 15000,
    queryFn: async () => normalizeDetail(await webnestApi.getMyProject(id as string)),
    retry: (failureCount, error) => {
      const status = getHttpStatus(error);
      if (status && NON_RETRYABLE.includes(status)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
