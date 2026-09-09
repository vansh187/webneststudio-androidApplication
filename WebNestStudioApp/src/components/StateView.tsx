import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '../api/client';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingView({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.goldPrimary} />
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text variant="body" center>
        {message}
      </Text>
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.card}>
      <Text variant="label" tone="danger">
        Request failed
      </Text>
      <Text variant="body" center style={styles.errorText}>
        {getErrorMessage(error)}
      </Text>
      {onRetry ? (
        <Button title="Try again" variant="outline" icon="rotate-ccw" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Lightweight shimmer-free skeleton block for list placeholders. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 140,
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    marginVertical: spacing.md,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textSecondary,
  },
  skeletonWrap: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  skeleton: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 96,
  },
});
