import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { webnestApi } from '../../api/webnestApi';
import type { UserSearchResult } from '../../types/api';
import { chatKeys } from './chatQueries';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Debounced people search against /api/users/search (registered users only). */
export function usePeopleSearch() {
  const [q, setQ] = useState('');
  const term = useDebouncedValue(q, 300).trim();
  const enabled = term.length >= 2;

  const query = useQuery({
    queryKey: chatKeys.userSearch(term),
    queryFn: () => webnestApi.searchUsers(term),
    enabled,
    staleTime: 10000,
  });

  const results: UserSearchResult[] = Array.isArray(query.data)
    ? query.data.filter(u => u && typeof u.id === 'string')
    : [];

  return {
    q,
    setQ,
    term,
    enabled,
    results,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
