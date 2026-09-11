import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { webnestApi } from '../../api/webnestApi';
import type {
  AdminProjectCreatePayload,
  AdminProjectRow,
  AdminProjectUpdatePayload,
} from '../../types/api';
import { useAuth } from '../auth/AuthContext';
import { normalizeAdminRow } from './normalize';

export const adminProjectKeys = {
  list: (filters: { clientEmail?: string; status?: string }) =>
    ['admin', 'projects', filters] as const,
  detail: (id: string) => ['admin', 'project', id] as const,
};

/** Admin-only list, filterable by client email / lifecycle status. */
export function useAdminProjects(filters: { clientEmail?: string; status?: string } = {}) {
  const auth = useAuth();
  const isAdmin = auth.user?.role === 'admin';

  return useQuery({
    queryKey: adminProjectKeys.list(filters),
    enabled: isAdmin,
    staleTime: 15000,
    queryFn: async (): Promise<{ projects: AdminProjectRow[]; total: number }> => {
      const { projects, total } = await webnestApi.adminListProjects({
        clientEmail: filters.clientEmail,
        status: filters.status,
      });
      return { projects: projects.map(normalizeAdminRow), total };
    },
  });
}

export function useAdminProject(id: string | undefined) {
  const auth = useAuth();
  const isAdmin = auth.user?.role === 'admin';

  return useQuery({
    queryKey: adminProjectKeys.detail(id ?? 'none'),
    enabled: isAdmin && Boolean(id),
    staleTime: 10000,
    queryFn: async () => normalizeAdminRow(await webnestApi.adminGetProject(id as string)),
  });
}

function useInvalidateAdminProjects() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: adminProjectKeys.detail(id) });
    }
  };
}

export function useCreateAdminProject() {
  const invalidate = useInvalidateAdminProjects();
  return useMutation({
    mutationFn: async (payload: AdminProjectCreatePayload) =>
      normalizeAdminRow(await webnestApi.adminCreateProject(payload)),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAdminProject(id: string) {
  const invalidate = useInvalidateAdminProjects();
  return useMutation({
    mutationFn: async (payload: AdminProjectUpdatePayload) =>
      normalizeAdminRow(await webnestApi.adminUpdateProject(id, payload)),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateAdminProjectStage(id: string) {
  const invalidate = useInvalidateAdminProjects();
  return useMutation({
    mutationFn: async (input: { stageKey: string; state?: 'pending' | 'in_progress' | 'done'; note?: string }) =>
      normalizeAdminRow(
        await webnestApi.adminUpdateProjectStage(id, input.stageKey, {
          state: input.state,
          note: input.note,
        }),
      ),
    onSuccess: () => invalidate(id),
  });
}

export function useArchiveAdminProject() {
  const invalidate = useInvalidateAdminProjects();
  return useMutation({
    mutationFn: (id: string) => webnestApi.adminArchiveProject(id),
    onSuccess: () => invalidate(),
  });
}
