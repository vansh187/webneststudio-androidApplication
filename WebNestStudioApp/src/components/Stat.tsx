import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  value: string;
  label: string;
};

export function Stat({ value, label }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="title" tone="gold" style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" tone="tertiary" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    minWidth: '44%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
  },
  label: {
    letterSpacing: 0.3,
  },
});
