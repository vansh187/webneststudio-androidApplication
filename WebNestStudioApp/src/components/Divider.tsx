import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function Divider({ gap = spacing.lg }: { gap?: number }) {
  return <View style={[styles.line, { marginVertical: gap }]} />;
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
});
