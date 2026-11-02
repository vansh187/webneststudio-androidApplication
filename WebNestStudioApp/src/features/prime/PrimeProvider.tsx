import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import RazorpayCheckout from 'react-native-razorpay';

import { assistantApi, AssistantAccess, PaymentProof } from '../../api/assistantApi';
import { getErrorMessage, getHttpStatus } from '../../api/client';
import { showAlert } from '../../components/AppAlert';
import { CONTACT } from '../../data/content';
import { navigationRef } from '../../navigation/navigationRef';
import { useAuth } from '../auth/AuthContext';
import { isPaymentConfirmed } from './access';
import {
  checkoutErrorMessage,
  isCheckoutClosedByUser,
  outcomeOfVerified,
  outcomeOfVerifyError,
} from './paymentOutcome';
import {
  clearPendingPayment,
  getPendingPayment,
  isPendingExpired,
  PendingPayment,
  savePendingPayment,
} from './pendingPayment';
import { PRIME_QUERY_ROOT, primeKeys } from './primeQueries';

const TERMS_VERSION = '2026-11-01';
const CONFIRM_TRIES = 12;
const CONFIRM_INTERVAL_MS = 5000;

export type PaymentPhase =
  | 'idle'
  | 'starting'
  | 'open'
  | 'verifying'
  | 'confirming'
  | 'pending'
  | 'rejected';

type PrimeContextValue = {
  phase: PaymentPhase;
  /** Why the last attempt didn't go through, for the plan screen. */
  message: string | null;
  /** Shown with a rejected payment so support can trace it. */
  paymentId: string | null;
  /** Starts a payment. The terms checkbox must already be ticked. */
  pay: (termsAcceptedAt: string) => void;
  checkAgain: () => void;
};

const PrimeContext = createContext<PrimeContextValue | undefined>(undefined);

function wait(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Owns the one payment flow for the signed-in user, so a payment left unconfirmed
 * can finish wherever they are in the app. Mount with key={user.id}: logging out
 * unmounts it, which stops any polling and drops this account's Prime data.
 */
export function PrimeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id as string;
  const queryClient = useQueryClient();
  const [phase, setPhaseState] = useState<PaymentPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Mirrors `phase` so a double tap is refused before React re-renders.
  const phaseRef = useRef<PaymentPhase>('idle');
  const mounted = useRef(true);
  const confirmRunning = useRef(false);
  const resumeRunning = useRef(false);

  const setPhase = useCallback((next: PaymentPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const refreshPrime = useCallback(
    () => queryClient.refetchQueries({ queryKey: [PRIME_QUERY_ROOT], type: 'all' }).catch(() => {}),
    [queryClient],
  );

  const finishPaid = useCallback(async () => {
    await clearPendingPayment(userId);
    await queryClient.invalidateQueries({ queryKey: [PRIME_QUERY_ROOT] });
    await queryClient
      .fetchQuery({ queryKey: primeKeys.usage(userId), queryFn: assistantApi.usage })
      .catch(() => undefined);
    if (!mounted.current) {
      return;
    }
    setPhase('idle');
    setMessage(null);
    setPaymentId(null);
    showAlert('Payment confirmed', 'Welcome to WebNest Prime!');
    if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'PrimePlan') {
      navigationRef.dispatch(StackActions.replace('AiChat'));
    }
  }, [queryClient, setPhase, userId]);

  const confirm = useCallback(async () => {
    // Launch and a foreground event can both ask: one loop, one welcome message.
    if (confirmRunning.current) {
      return;
    }
    confirmRunning.current = true;
    setPhase('confirming');
    try {
      for (let attempt = 0; attempt < CONFIRM_TRIES; attempt += 1) {
        if (attempt > 0) {
          await wait(CONFIRM_INTERVAL_MS);
        }
        if (!mounted.current) {
          return;
        }
        try {
          const usage = await assistantApi.usage();
          if (!mounted.current) {
            return;
          }
          queryClient.setQueryData(primeKeys.usage(userId), usage);
          if (isPaymentConfirmed(usage.access)) {
            await finishPaid();
            return;
          }
        } catch {
          // Offline or the server is waking up: keep trying, it's "no answer yet".
        }
      }
      if (mounted.current) {
        setPhase('pending');
      }
    } finally {
      confirmRunning.current = false;
    }
  }, [finishPaid, queryClient, setPhase, userId]);

  const handlePending = useCallback(
    async (pending: PendingPayment) => {
      if (isPendingExpired(pending)) {
        await clearPendingPayment(userId);
        if (mounted.current) {
          setPhase('idle');
          showAlert(
            'Payment not confirmed',
            `We couldn't confirm payment ${pending.payment_id}. If money was deducted, please contact support at ${CONTACT.email}.`,
          );
        }
        return;
      }
      setPaymentId(pending.payment_id);
      await confirm();
    },
    [confirm, setPhase, userId],
  );

  /** Picks up a payment left unconfirmed by a closed app or a lost connection. */
  const resumePending = useCallback(async () => {
    if (resumeRunning.current || (phaseRef.current !== 'idle' && phaseRef.current !== 'pending')) {
      return;
    }
    resumeRunning.current = true;
    try {
      const pending = await getPendingPayment(userId);
      // Pay may have been tapped during the read. It checks the record itself.
      if (
        !pending ||
        !mounted.current ||
        (phaseRef.current !== 'idle' && phaseRef.current !== 'pending')
      ) {
        return;
      }
      await handlePending(pending);
    } finally {
      resumeRunning.current = false;
    }
  }, [handlePending, userId]);

  useEffect(() => {
    mounted.current = true;
    resumePending();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: [PRIME_QUERY_ROOT] });
        resumePending();
      }
    });
    return () => {
      mounted.current = false;
      sub.remove();
      queryClient.removeQueries({ queryKey: [PRIME_QUERY_ROOT] });
    };
  }, [queryClient, resumePending]);

  const handleVerifyResult = useCallback(
    async (access: AssistantAccess | undefined, error: unknown, proof: PaymentProof) => {
      const outcome = error ? outcomeOfVerifyError(error) : outcomeOfVerified(access);
      if (outcome === 'paid') {
        await finishPaid();
      } else if (outcome === 'confirming') {
        await confirm();
      } else {
        await clearPendingPayment(userId);
        setPaymentId(proof.razorpay_payment_id);
        setMessage(
          'This payment could not be verified. If money was deducted, please contact support.',
        );
        setPhase('rejected');
      }
    },
    [confirm, finishPaid, setPhase, userId],
  );

  const pay = useCallback(
    async (termsAcceptedAt: string) => {
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'rejected') {
        return;
      }
      // Claimed before the first await, so a second tap can't get past the check above.
      setPhase('starting');
      setMessage(null);
      setPaymentId(null);

      const earlier = await getPendingPayment(userId);
      if (!mounted.current) {
        return;
      }
      if (earlier) {
        // An earlier payment is still confirming: paying again could charge twice.
        await handlePending(earlier);
        return;
      }

      let order;
      try {
        order = await assistantApi.createOrder();
      } catch (error) {
        if (!mounted.current) {
          return;
        }
        setPhase('idle');
        if (getHttpStatus(error) === 409) {
          // Already a member. The plan screen shows their membership once this lands.
          await refreshPrime();
        } else {
          setMessage(getErrorMessage(error, 'Payments are not available right now. Please try again later.'));
        }
        return;
      }

      // Logged out while the order was on its way: don't open checkout over the login screen.
      if (!mounted.current) {
        return;
      }

      setPhase('open');
      let proof: PaymentProof;
      try {
        proof = await RazorpayCheckout.open({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: order.name,
          description: order.description,
          prefill: { name: user?.full_name ?? '', email: user?.email ?? '' },
          notes: { terms_version: TERMS_VERSION, terms_accepted_at: termsAcceptedAt },
          theme: { color: '#d4a017' },
        });
      } catch (error) {
        setPhase('idle');
        if (!isCheckoutClosedByUser(error)) {
          setMessage(checkoutErrorMessage(error));
        }
        return;
      }

      setPhase('verifying');
      await savePendingPayment(userId, proof.razorpay_payment_id);
      if (!mounted.current) {
        // Paid, then logged out. Verifying now would use the wrong session, so
        // leave the record: this account's next sign-in picks it up.
        return;
      }
      let access: AssistantAccess | undefined;
      let verifyError: unknown = null;
      try {
        ({ access } = await assistantApi.verifyPayment(proof));
      } catch (error) {
        verifyError = error;
      }
      if (!mounted.current) {
        return;
      }
      await handleVerifyResult(access, verifyError, proof);
    },
    [handlePending, handleVerifyResult, refreshPrime, setPhase, user, userId],
  );

  const checkAgain = useCallback(() => {
    if (phaseRef.current === 'pending') {
      confirm();
    }
  }, [confirm]);

  const value = useMemo(
    () => ({ phase, message, paymentId, pay, checkAgain }),
    [checkAgain, message, pay, paymentId, phase],
  );

  return <PrimeContext.Provider value={value}>{children}</PrimeContext.Provider>;
}

export function usePrimePayment() {
  const context = useContext(PrimeContext);
  if (!context) {
    throw new Error('usePrimePayment must be used inside PrimeProvider');
  }
  return context;
}
