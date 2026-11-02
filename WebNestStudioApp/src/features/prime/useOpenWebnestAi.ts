import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { assistantApi } from '../../api/assistantApi';
import { useAuth } from '../auth/AuthContext';
import { chatAccess } from './access';
import { primeKeys } from './primeQueries';
import { takePrimeIntent } from './signupIntent';

/** The WebNest AI entry: chat when it's open, otherwise the Prime plan screen. */
export function useOpenWebnestAi() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id;

  return useCallback(async () => {
    try {
      const usage = await queryClient.fetchQuery({
        queryKey: primeKeys.usage(userId),
        queryFn: assistantApi.usage,
        staleTime: 15000,
      });
      navigation.navigate(chatAccess(usage) === 'open' ? 'AiChat' : 'PrimePlan');
    } catch {
      // The plan screen shows the error and offers a retry.
      navigation.navigate('PrimePlan');
    }
  }, [navigation, queryClient, userId]);
}

/** Someone who chose Prime at signup lands on the plan screen once signed in. */
export function usePrimeSignupRedirect() {
  const navigation = useNavigation<any>();
  const email = useAuth().user?.email;

  useEffect(() => {
    if (!email) {
      return;
    }
    let cancelled = false;
    takePrimeIntent(email).then(wanted => {
      if (wanted && !cancelled) {
        navigation.navigate('PrimePlan');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [email, navigation]);
}
