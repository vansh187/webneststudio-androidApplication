import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { webnestApi } from '../../api/webnestApi';
import { useAuth } from '../auth/AuthContext';

export const moderationKeys = {
  reports: (status: 'open' | 'resolved') => ['admin', 'reports', status] as const,
};

/** Admin-only. Open reports by default — resolved ones aren't actionable. */
export function useAdminReports(status: 'open' | 'resolved' = 'open') {
  const auth = useAuth();
  const isAdmin = auth.user?.role === 'admin';

  return useQuery({
    queryKey: moderationKeys.reports(status),
    enabled: isAdmin,
    staleTime: 10000,
    queryFn: () => webnestApi.adminListReports(status),
  });
}

function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
}

export function useResolveReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (reportId: string) => webnestApi.adminResolveReport(reportId),
    onSuccess: () => invalidate(),
  });
}

export function useBlockUser() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (userId: string) => webnestApi.adminBlockUser(userId),
    onSuccess: () => invalidate(),
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (userId: string) => webnestApi.adminUnblockUser(userId),
    onSuccess: () => invalidate(),
  });
}
