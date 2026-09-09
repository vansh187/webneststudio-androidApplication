import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { Text } from '../Text';

export function DateSeparator({ label }: { label: string }) {
  if (!label) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text variant="caption" tone="tertiary" style={styles.text}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  text: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
