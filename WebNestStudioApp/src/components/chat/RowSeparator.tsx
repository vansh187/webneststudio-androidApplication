import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

/** Hairline between list rows, inset past the avatar column. */
export function RowSeparator() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 42 + spacing.md,
  },
});
