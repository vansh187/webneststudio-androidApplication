import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import CrownIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { AssistantAccess } from '../api/assistantApi';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PrimeBadge } from '../components/PrimeBadge';
import { Screen } from '../components/Screen';
import { ErrorView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { CONTACT, LEGAL } from '../data/content';
import { chatAccess, formatPrice } from '../features/prime/access';
import { useAssistantUsage } from '../features/prime/primeQueries';
import { PaymentPhase, usePrimePayment } from '../features/prime/PrimeProvider';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { openExternal } from '../utils/linking';

type Props = NativeStackScreenProps<RootStackParamList, 'PrimePlan'>;

const STATUS_TEXT: Partial<Record<PaymentPhase, string>> = {
  starting: 'Starting your payment...',
  open: 'Finish your payment in the Razorpay window.',
  verifying: 'Checking your payment...',
  confirming: 'Confirming your payment...',
  pending:
    "Your payment is being confirmed. Your membership will appear shortly, so there's no need to pay again.",
};

function PaymentStatus() {
  const { phase, message, paymentId, checkAgain } = usePrimePayment();
  const status = STATUS_TEXT[phase];

  if (status) {
    return (
      <View style={styles.status}>
        {phase === 'pending' ? null : <ActivityIndicator color={colors.goldPrimary} />}
        <Text variant="body" tone="primary" center>
          {status}
        </Text>
        {phase === 'pending' ? (
          <Button title="Check again" variant="outline" onPress={checkAgain} />
        ) : null}
      </View>
    );
  }
  if (!message) {
    return null;
  }
  return (
    <View style={styles.status}>
      <Text variant="body" tone="danger" center>
        {message}
      </Text>
      {phase === 'rejected' ? (
        <>
          {paymentId ? (
            <Text selectable variant="caption" tone="tertiary" center>
              Payment id: {paymentId}
            </Text>
          ) : null}
          <Text variant="caption" tone="gold" center onPress={() => openExternal(CONTACT.emailHref)}>
            Contact support
          </Text>
        </>
      ) : null}
    </View>
  );
}

function Offer({ access, allowanceUsed }: { access: AssistantAccess; allowanceUsed: boolean }) {
  const { phase, pay } = usePrimePayment();
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const price = formatPrice(access.price_paise);
  const canStart = phase === 'idle' || phase === 'rejected';

  return (
    <>
      {allowanceUsed ? (
        <Card variant="gold" style={styles.notice}>
          <Text variant="bodyStrong" tone="primary">
            Allowance used up
          </Text>
          <Text variant="body">
            You've used your full WebNest AI allowance. Buy again to keep chatting.
          </Text>
        </Card>
      ) : null}

      <Card variant="elevated" style={styles.card}>
        <View style={styles.titleRow}>
          <CrownIcon name="crown" size={22} color={colors.goldPrimary} />
          <Text variant="rowTitle">WebNest Prime Member</Text>
        </View>
        <Text variant="title" tone="gold">
          {price}
        </Text>
        <View style={styles.benefits}>
          <Benefit text={`${access.pass_days} days of WebNest AI`} />
          <Benefit text="Prime badge on your profile" />
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(termsAcceptedAt) }}
          onPress={() => setTermsAcceptedAt(current => (current ? null : new Date().toISOString()))}
          style={styles.termsRow}>
          <View style={[styles.checkbox, termsAcceptedAt ? styles.checkboxOn : null]}>
            {termsAcceptedAt ? <Icon name="check" size={14} color={colors.textOnGold} /> : null}
          </View>
          <Text variant="muted" tone="secondary" style={styles.termsText}>
            I agree to the{' '}
            <Text variant="muted" tone="gold" onPress={() => openExternal(LEGAL.termsHref)}>
              terms
            </Text>{' '}
            and understand this payment is non-refundable.
          </Text>
        </Pressable>

        <Button
          title={`Pay ${price}`}
          icon="lock"
          disabled={!termsAcceptedAt || !canStart}
          loading={phase === 'starting' || phase === 'open' || phase === 'verifying'}
          onPress={() => termsAcceptedAt && pay(termsAcceptedAt)}
        />
        <Text variant="caption" tone="tertiary" center>
          Secure payment by Razorpay. WebNest never sees your card or UPI details.
        </Text>
      </Card>
    </>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefit}>
      <Icon name="check" size={15} color={colors.goldPrimary} />
      <Text variant="body" tone="primary">
        {text}
      </Text>
    </View>
  );
}

export function PrimePlanScreen({ navigation }: Props) {
  const usage = useAssistantUsage();

  if (usage.isLoading) {
    return (
      <Screen>
        <LoadingView label="Loading your plan" />
      </Screen>
    );
  }
  if (!usage.data) {
    return (
      <Screen>
        <ErrorView error={usage.error} onRetry={() => usage.refetch()} />
      </Screen>
    );
  }

  const state = chatAccess(usage.data);
  const access = usage.data.access;

  return (
    <Screen
      style={styles.content}
      edges={['left', 'right']}
      refreshing={usage.isFetching}
      onRefresh={() => usage.refetch()}>
      {state === 'unavailable' || !access ? (
        <Card variant="elevated" style={styles.card}>
          <Text variant="rowTitle">WebNest AI is not available right now</Text>
          <Text variant="body">Please check back later.</Text>
        </Card>
      ) : state === 'open' ? (
        <Card variant="elevated" style={styles.card}>
          <PrimeBadge
            label={access.member_label || 'WebNest Prime Member'}
            expiresAt={access.expires_at}
          />
          <Text variant="body">Your membership is active.</Text>
          <Button
            title="Open WebNest AI"
            icon="arrow-right"
            onPress={() => navigation.replace('AiChat')}
          />
        </Card>
      ) : (
        <Offer access={access} allowanceUsed={state === 'allowanceUsed'} />
      )}
      <PaymentStatus />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  notice: {
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  benefits: {
    gap: spacing.xs,
  },
  benefit: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  termsText: {
    flex: 1,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.goldOutline,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxOn: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  status: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
