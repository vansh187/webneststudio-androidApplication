import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  label: string;
  tone?: 'gold' | 'success' | 'neutral';
};

export function Badge({ label, tone = 'gold' }: Props) {
  return (
    <View style={[styles.wrap, tone === 'success' && styles.success, tone === 'neutral' && styles.neutral]}>
      {tone === 'success' ? <View style={styles.dot} /> : null}
      <Text
        variant="label"
        tone={tone === 'success' ? 'primary' : 'gold'}
        style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  success: {
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    borderColor: 'rgba(52, 211, 153, 0.40)',
  },
  neutral: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  dot: {
    backgroundColor: colors.successBright,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  text: {
    fontSize: 10,
    letterSpacing: 2,
  },
});
